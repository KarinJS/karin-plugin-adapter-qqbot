import { Toast } from '@heroui/react'
import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider } from '@/hooks/useConfigStore'
import { useEmbedded } from '@/hooks/useEmbedded'
import { useTheme } from '@/hooks/useTheme'
import { useViewport } from '@/hooks/useViewport'
import { DesktopShell } from '@/layouts/DesktopShell'
import { EmbeddedDesktopShell } from '@/layouts/EmbeddedDesktopShell'
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
  const embedded = useEmbedded()

  if (isMobile) return <MobileShell />
  return embedded ? <EmbeddedDesktopShell /> : <DesktopShell />
}

const DefaultRedirect = () => {
  const embedded = useEmbedded()
  const { isMobile } = useViewport()
  return <Navigate to={embedded || isMobile ? '/bots' : '/overview'} replace />
}

const App = () => {
  const [authenticated, setAuthenticated] = useState(hasAuth)
  const { isMobile } = useViewport()
  const embedded = useEmbedded()

  // 主题只在 App 里初始化一次，嵌入模式没有主题切换入口时也能跟随 Karin。
  useTheme()

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
            <Route index element={<DefaultRedirect />} />
            <Route path='overview' element={<OverviewPage />} />
            <Route path='bots' element={<BotsPage />} />
            <Route path='bots/new' element={<AddBotPage />} />
            <Route path='bots/:appId' element={<BotDetailPage />} />
            <Route path='settings' element={embedded ? <Navigate to='/bots' replace /> : <SettingsPage />} />
            <Route path='*' element={<DefaultRedirect />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
