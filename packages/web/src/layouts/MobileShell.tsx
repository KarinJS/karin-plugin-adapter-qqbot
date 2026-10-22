import { Button, cn } from '@heroui/react'
import { ArrowLeft, Bot, Home, QrCode, Settings } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '@/components/Brand'
import { PageTransition } from '@/components/PageTransition'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useEmbedded } from '@/hooks/useEmbedded'
import { useViewport } from '@/hooks/useViewport'

const standaloneTabs = [
  { to: '/', label: '概览', icon: Home, key: 'overview' },
  { to: '/bots', label: '机器人', icon: Bot, key: 'bots' },
  { to: '/bots/new', label: '扫码', icon: QrCode, key: 'add' },
  { to: '/settings', label: '设置', icon: Settings, key: 'settings' },
] as const

const embeddedTabs = [
  { to: '/bots', label: '机器人', icon: Bot, key: 'bots' },
  { to: '/bots/new', label: '扫码', icon: QrCode, key: 'add' },
  { to: '/', label: '概览', icon: Home, key: 'overview' },
] as const

const getActiveKey = (pathname: string) => {
  if (pathname === '/bots/new') return 'add'
  if (pathname.startsWith('/bots')) return 'bots'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'overview'
}

export const MobileShell = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const embedded = useEmbedded()
  const { isShort, isTiny } = useViewport()
  const activeKey = getActiveKey(pathname)
  /** 扫码添加是独立入口，只有机器人详情才收起底部导航。 */
  const isSubPage = pathname.startsWith('/bots/') && pathname !== '/bots/new'
  const tabHeight = isShort ? '3.5rem' : '4rem'
  const gutter = isTiny ? 'px-3' : 'px-4'
  const tabs = embedded ? embeddedTabs : standaloneTabs

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      {embedded ? null : (
        <header className='glass safe-top sticky top-0 z-40 border-b border-border/60'>
          <div className={cn('flex items-center justify-between', gutter, isShort ? 'h-12' : 'h-14')}>
            {isSubPage ? (
              <Button isIconOnly variant='ghost' aria-label='返回机器人列表' onPress={() => navigate('/bots')}>
                <ArrowLeft className='size-5' aria-hidden='true' />
              </Button>
            ) : (
              <Brand compact />
            )}
            <ThemeToggle />
          </div>
        </header>
      )}

      <main
        className={cn('flex-1', gutter, embedded || isShort ? 'pt-3' : 'pt-5')}
        style={{
          paddingBottom: isSubPage
            ? `calc(${isShort ? '0.75rem' : '1.25rem'} + env(safe-area-inset-bottom))`
            : `calc(${tabHeight} + 1.5rem + env(safe-area-inset-bottom))`,
        }}
      >
        <PageTransition sectionKey={activeKey}>
          <Outlet />
        </PageTransition>
      </main>

      {isSubPage ? null : (
        <nav className='glass fixed inset-x-0 bottom-0 z-40 border-t border-border/60 safe-bottom' aria-label='主导航'>
          <div className={cn('grid', embedded ? 'grid-cols-3' : 'grid-cols-4')}>
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeKey === tab.key

              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 text-[0.6875rem]',
                    isShort ? 'min-h-14' : 'min-h-16'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 min-w-12 items-center justify-center rounded-full transition-colors duration-150',
                      active ? 'bg-default text-foreground' : 'text-muted'
                    )}
                  >
                    <Icon className='size-4' aria-hidden='true' />
                  </span>
                  <span className={active ? 'font-medium text-foreground' : 'text-muted'}>{tab.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
