import { Tooltip, cn } from '@heroui/react'
import { Bot, LayoutGrid, QrCode } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { PageTransition } from '@/components/PageTransition'

const navItems = [
  { to: '/bots', label: '机器人列表', icon: Bot, key: 'bots' },
  { to: '/bots/new', label: '扫码添加', icon: QrCode, key: 'add' },
  { to: '/', label: '概览', icon: LayoutGrid, key: 'overview' },
] as const

const getActiveKey = (pathname: string) => {
  if (pathname === '/bots/new') return 'add'
  if (pathname.startsWith('/bots')) return 'bots'
  return 'overview'
}

/**
 * Karin iframe 内的桌面外壳。
 *
 * 只保留一条图标栏，导航入口压缩为机器人列表、扫码添加和概览；
 * 设置与主题切换留给独立打开的完整控制台。
 */
export const EmbeddedDesktopShell = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const activeKey = getActiveKey(pathname)

  return (
    <div className='flex h-dvh overflow-hidden bg-background'>
      <aside className='flex w-[4.5rem] shrink-0 items-center justify-center py-3' aria-label='侧边栏'>
        <nav
          className='flex h-full max-h-[calc(100dvh-1.5rem)] w-14 flex-col items-center justify-center gap-1.5 rounded-full border border-border/70 bg-surface/80 p-1.5 shadow-sm backdrop-blur'
          aria-label='主导航'
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeKey === item.key

            return (
              <Tooltip key={item.key} delay={120}>
                <Tooltip.Trigger
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    navigate(item.to)
                  }}
                >
                  <Link
                    to={item.to}
                    tabIndex={-1}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex size-11 items-center justify-center rounded-full transition-colors duration-150',
                      active ? 'bg-foreground text-background' : 'text-muted hover:bg-default hover:text-foreground'
                    )}
                  >
                    <Icon className='size-5' aria-hidden='true' />
                  </Link>
                </Tooltip.Trigger>
                <Tooltip.Content placement='right' showArrow>
                  <Tooltip.Arrow />
                  {item.label}
                </Tooltip.Content>
              </Tooltip>
            )
          })}
        </nav>
      </aside>

      <main className='min-w-0 flex-1 overflow-y-auto'>
        <div className='mx-auto w-full max-w-[78rem] px-6 py-6'>
          <PageTransition sectionKey={activeKey}>
            <Outlet />
          </PageTransition>
        </div>
      </main>
    </div>
  )
}
