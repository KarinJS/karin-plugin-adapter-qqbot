import { Toast } from '@heroui/react'
import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider } from '@/hooks/useConfigStore'
import { useViewport } from '@/hooks/useViewport'
import { DesktopShell } from '@/layouts/DesktopShell'
import { MobileShell } from '@/layouts/MobileShell'
import { authChangedEvent, hasAuth } from '@/lib/auth'
import { AddBotPage } from '@/pages/AddBotPage'
import { BotDetailPage } from '@/pages/BotDetailPage'
import { BotsPage } from '@/pages/BotsPage'
import { LoginPage } from '@/pages/LoginPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { SettingsPage } from '@/pages/SettingsPage'

const AppShell = () => {
  const { isMobile } = useViewport()
  return isMobile ? <MobileShell /> : <DesktopShell />
}

const App = () => {
  const [authenticated, setAuthenticated] = useState(hasAuth)
  const { isMobile } = useViewport()

  useEffect(() => {
    const syncAuth = () => setAuthenticated(hasAuth())

    window.addEventListener(authChangedEvent, syncAuth)
    window.addEventListener('storage', syncAuth)

    return () => {
      window.removeEventListener(authChangedEvent, syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [])

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />
  }

  return (
    <ConfigProvider onAuthExpired={() => setAuthenticated(false)}>
      <Toast.Provider placement={isMobile ? 'top' : 'bottom'} />
      <BrowserRouter basename='/qqbot/web'>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path='bots' element={<BotsPage />} />
            <Route path='bots/new' element={<AddBotPage />} />
            <Route path='bots/:appId' element={<BotDetailPage />} />
            <Route path='settings' element={<SettingsPage />} />
            <Route path='*' element={<Navigate to='/' replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
