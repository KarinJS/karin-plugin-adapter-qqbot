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
      <div className='mobile-frame relative flex h-dvh flex-col overflow-hidden bg-background' inert={isDetail}>
        <div className='min-h-0 flex-1'>
          <MobilePager items={items} activeKey={activeKey} onChange={handlePagerChange} disabled={sheetOpen} />
        </div>

        {/* 和抽屉底栏同款的三层边缘模糊：只有靠近底部的内容被逐渐化开。 */}
        <div className='pointer-events-none absolute inset-x-0 bottom-0 z-40'>
          <div aria-hidden='true' className='sheet-edge-blur--bottom mobile-bottom-blur'>
            <div className='sheet-edge-blur__layer sheet-edge-blur__layer--strong' />
            <div className='sheet-edge-blur__layer sheet-edge-blur__layer--medium' />
            <div className='sheet-edge-blur__layer sheet-edge-blur__layer--soft' />
          </div>
          <nav className='mobile-bottom-nav pointer-events-auto relative z-10' aria-label='主导航'>
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
                      'flex min-h-11 flex-col items-center justify-center gap-0.5 text-[10px]',
                      active ? 'text-foreground' : 'text-muted'
                    )}
                    onClick={() => navigate(tab.to)}
                  >
                    <span
                      className={cn(
                        'flex h-6 min-w-10 items-center justify-center rounded-full transition-colors duration-150',
                        active ? 'bg-default text-foreground' : 'text-muted'
                      )}
                    >
                      <Icon className='size-4' aria-hidden='true' />
                    </span>
                    <span className={cn('leading-none', active && 'font-medium')}>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
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
