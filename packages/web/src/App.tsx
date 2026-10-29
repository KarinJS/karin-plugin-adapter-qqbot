import { Toast } from '@heroui/react'
import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider } from '@/hooks/useConfigStore'
import { useEmbedded } from '@/hooks/useEmbedded'
import { useTheme } from '@/hooks/useTheme'
import { useViewport } from '@/hooks/useViewport'
import { DesktopShell } from '@/layouts/DesktopShell'
import { EmbeddedDesktopShell } from '@/layouts/EmbeddedDesktopShell'
import { MobileShell } from '@/layouts/MobileShell'
import { authChangedEvent, hasAuth } from '@/lib/auth'
import { LoginPage } from '@/pages/LoginPage'

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

  // 主题只在 App 里初始化一次，嵌入模式没有主题切换入口时也能跟随 Karin。
  useTheme()

  // ConfigProvider 的 reload 依赖这个回调；保持引用稳定，避免主题切换等
  // 普通重渲染触发配置重新加载，把页面打回骨架屏。
  const handleAuthExpired = useCallback(() => setAuthenticated(false), [])

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
    <ConfigProvider onAuthExpired={handleAuthExpired}>
      <Toast.Provider placement={isMobile ? 'top' : 'bottom'} />
      <BrowserRouter basename='/qqbot/web'>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DefaultRedirect />} />
            {/*
              页面由各外壳自己按路径渲染并常驻在画布上，这里只负责匹配地址；
              未匹配的地址交给 DefaultRedirect。
            */}
            <Route path='overview' element={null} />
            <Route path='bots' element={null} />
            <Route path='bots/new' element={null} />
            <Route path='bots/:appId' element={null} />
            <Route path='menu-panel' element={null} />
            <Route path='settings' element={null} />
            <Route path='*' element={<DefaultRedirect />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
