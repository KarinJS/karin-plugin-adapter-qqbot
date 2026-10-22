import { Button, cn } from '@heroui/react'
import { Bot, Home, Plus, QrCode, Settings } from 'lucide-react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Brand } from '@/components/Brand'
import { PageTransition } from '@/components/PageTransition'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useConfigStore } from '@/hooks/useConfigStore'

const navItems = [
  { to: '/', label: '概览', icon: Home, key: 'overview' },
  { to: '/bots', label: '机器人', icon: Bot, key: 'bots' },
  { to: '/bots/new', label: '扫码添加', icon: QrCode, key: 'add' },
  { to: '/settings', label: '设置', icon: Settings, key: 'settings' },
] as const

const getActiveKey = (pathname: string) => {
  if (pathname === '/bots/new') return 'add'
  if (pathname.startsWith('/bots')) return 'bots'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'overview'
}

const sectionLabels: Record<string, string> = {
  overview: '概览',
  bots: '机器人',
  add: '扫码添加',
  settings: '设置',
}

export const DesktopShell = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { config, statuses, version } = useConfigStore()
  const activeKey = getActiveKey(pathname)
  const onlineCount = config.filter((bot) => statuses[bot.appId]?.online).length

  return (
    <div className='flex h-dvh overflow-hidden bg-background'>
      <aside
        className='flex w-[var(--app-sidebar-width)] shrink-0 flex-col border-r border-border/80 bg-surface/55'
        aria-label='侧边栏'
      >
        <div className='px-5 py-5'>
          <Brand />
        </div>

        <nav className='flex flex-1 flex-col gap-1 px-3 py-2' aria-label='主导航'>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeKey === item.key

            return (
              <Link
                key={item.key}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150',
                  active
                    ? 'bg-default font-medium text-foreground'
                    : 'text-muted hover:bg-default/60 hover:text-foreground'
                )}
              >
                <Icon className='size-4 shrink-0' aria-hidden='true' />
                <span className='truncate'>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className='flex flex-col gap-4 border-t border-border/60 px-5 py-5'>
          <div className='flex items-center justify-between text-xs text-muted'>
            <span>运行状态</span>
            <span className='tabular inline-flex items-center gap-2'>
              <span className='status-dot' data-online={onlineCount > 0} aria-hidden='true' />
              {onlineCount} / {config.length} 在线
            </span>
          </div>
          <ThemeToggle withLabel />
          <p className='text-[0.6875rem] text-muted'>v{version || '—'}</p>
        </div>
      </aside>

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-8'>
          <div className='flex items-center gap-2 text-sm'>
            <span className='text-muted'>控制台</span>
            <span className='text-muted/60'>/</span>
            <span className='font-medium'>{sectionLabels[activeKey]}</span>
          </div>
          {pathname === '/bots/new' ? null : (
            <Button size='sm' variant='secondary' onPress={() => navigate('/bots/new')}>
              <Plus className='size-4' aria-hidden='true' />
              添加机器人
            </Button>
          )}
        </header>

        <main className='flex-1 overflow-y-auto'>
          <div className='mx-auto w-full max-w-[78rem] px-8 py-7'>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  )
}
