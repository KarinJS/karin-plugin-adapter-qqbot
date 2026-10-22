import { cn } from '@heroui/react'
import { Bot, LayoutGrid } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import { MobileAddBotSheet } from '@/components/mobile/MobileAddBotSheet'
import { MobileBotSheet } from '@/components/mobile/MobileBotSheet'
import { MobilePager, type MobilePagerItem } from '@/components/mobile/MobilePager'
import { MobileSheetProvider, useMobileSheet } from '@/hooks/useMobileSheet'
import { MobileBotDetailPage } from '@/pages/mobile/MobileBotDetailPage'
import { MobileBotsPage } from '@/pages/mobile/MobileBotsPage'
import { MobileOverviewPage } from '@/pages/mobile/MobileOverviewPage'

const tabs = [
  { key: 'bots', to: '/bots', label: '机器人', icon: Bot },
  { key: 'overview', to: '/overview', label: '概览', icon: LayoutGrid },
] as const

const getActiveKey = (pathname: string) => {
  if (pathname.startsWith('/bots')) return 'bots'
  if (pathname.startsWith('/overview')) return 'overview'
  return null
}

const MobileShellContent = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isOpen, isAddOpen, close, closeAdd } = useMobileSheet()
  const activeKey = getActiveKey(pathname) ?? 'bots'
  const detailMatch = useMatch('/bots/:appId')
  const rawDetailAppId = detailMatch?.params.appId
  const detailAppId = rawDetailAppId && rawDetailAppId !== 'new' ? decodeURIComponent(rawDetailAppId) : null
  const isDetail = Boolean(detailAppId)
  const sheetOpen = isOpen || isAddOpen

  useEffect(() => {
    if (pathname === '/bots/new' || getActiveKey(pathname) === null) {
      navigate('/bots', { replace: true })
    }
  }, [navigate, pathname])

  useEffect(() => {
    if (!detailAppId) return
    close()
    closeAdd()
  }, [close, closeAdd, detailAppId])

  const items = useMemo<MobilePagerItem[]>(
    () => [
      { key: 'bots', label: '机器人列表', element: <MobileBotsPage /> },
      { key: 'overview', label: '概览', element: <MobileOverviewPage /> },
    ],
    []
  )

  const handlePagerChange = (key: string) => {
    const tab = tabs.find((item) => item.key === key)
    if (tab) navigate(tab.to, { replace: true })
  }

  return (
    <>
      <div className='mobile-frame flex h-dvh flex-col overflow-hidden bg-background' inert={isDetail}>
        <div className='min-h-0 flex-1'>
          <MobilePager items={items} activeKey={activeKey} onChange={handlePagerChange} disabled={sheetOpen} />
        </div>

        <nav className='glass safe-bottom shrink-0 border-t border-border/60' aria-label='主导航'>
          <div className='grid grid-cols-2'>
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeKey === tab.key

              return (
                <button
                  key={tab.key}
                  type='button'
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 text-[10px]',
                    active ? 'text-foreground' : 'text-muted'
                  )}
                  onClick={() => navigate(tab.to)}
                >
                  <span
                    className={cn(
                      'flex h-7 min-w-12 items-center justify-center rounded-full transition-colors duration-150',
                      active ? 'bg-default text-foreground' : 'text-muted'
                    )}
                  >
                    <Icon className='size-[18px]' aria-hidden='true' />
                  </span>
                  <span className={active ? 'font-medium' : undefined}>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {detailAppId ? <MobileBotDetailPage appId={detailAppId} /> : null}
      <MobileBotSheet />
      <MobileAddBotSheet />
    </>
  )
}

/**
 * 手机端外壳。
 *
 * 机器人列表与概览常驻在横向分页器里，底部导航参与 flex 布局；
 * 机器人配置和扫码添加都是独立底部抽屉，详情页覆盖在分页器之上。
 */
export const MobileShell = () => (
  <MobileSheetProvider>
    <MobileShellContent />
  </MobileSheetProvider>
)
