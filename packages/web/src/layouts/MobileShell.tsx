import { cn } from '@heroui/react'
import { Bot, LayoutGrid, QrCode } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import { MobileBotSheet } from '@/components/mobile/MobileBotSheet'
import { MobilePager, type MobilePagerItem } from '@/components/mobile/MobilePager'
import { MobileSheetProvider, useMobileSheet } from '@/hooks/useMobileSheet'
import { MobileAddBotPage } from '@/pages/mobile/MobileAddBotPage'
import { MobileBotDetailPage } from '@/pages/mobile/MobileBotDetailPage'
import { MobileBotsPage } from '@/pages/mobile/MobileBotsPage'
import { MobileOverviewPage } from '@/pages/mobile/MobileOverviewPage'

const tabs = [
  { key: 'bots', to: '/bots', label: '机器人', icon: Bot },
  { key: 'add', to: '/bots/new', label: '扫码', icon: QrCode },
  { key: 'overview', to: '/overview', label: '概览', icon: LayoutGrid },
] as const

const getActiveKey = (pathname: string) => {
  if (pathname === '/bots/new') return 'add'
  if (pathname.startsWith('/bots')) return 'bots'
  if (pathname.startsWith('/overview')) return 'overview'
  return null
}

const MobileShellContent = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isOpen } = useMobileSheet()
  const activeKey = getActiveKey(pathname) ?? 'bots'
  const detailMatch = useMatch('/bots/:appId')
  const rawDetailAppId = detailMatch?.params.appId
  const detailAppId = rawDetailAppId && rawDetailAppId !== 'new' ? decodeURIComponent(rawDetailAppId) : null
  const isDetail = Boolean(detailAppId)

  useEffect(() => {
    if (getActiveKey(pathname) === null) navigate('/bots', { replace: true })
  }, [navigate, pathname])

  const items = useMemo<MobilePagerItem[]>(
    () => [
      { key: 'bots', label: '机器人列表', element: <MobileBotsPage /> },
      { key: 'add', label: '扫码添加', element: <MobileAddBotPage /> },
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
      <div
        className={cn(
          'mobile-frame flex h-dvh flex-col overflow-hidden bg-background',
          isOpen && 'mobile-frame--sheet'
        )}
        inert={isDetail}
      >
        <div className='min-h-0 flex-1'>
          <MobilePager items={items} activeKey={activeKey} onChange={handlePagerChange} disabled={isOpen} />
        </div>

        <nav className='glass safe-bottom shrink-0 border-t border-border/60' aria-label='主导航'>
          <div className='grid grid-cols-3'>
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
    </>
  )
}

/**
 * 手机端外壳。
 *
 * 三个顶层页面常驻在横向分页器里，底部导航参与 flex 布局，不再浮在内容上；
 * 机器人详情页是覆盖在分页器上的独立整页，返回按钮会随滚动连续收缩。
 */
export const MobileShell = () => (
  <MobileSheetProvider>
    <MobileShellContent />
  </MobileSheetProvider>
)
