import { cn } from '@heroui/react'
import { Bot, Home, QrCode, Settings } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Brand } from '@/components/Brand'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { CanvasPage } from '@/components/desktop/CanvasPager'
import { useConfigStore } from '@/hooks/useConfigStore'
import { DesktopCanvasShell } from '@/layouts/DesktopCanvasShell'
import { AddBotPage } from '@/pages/AddBotPage'
import { BotsWorkspace } from '@/pages/BotsWorkspace'
import { OverviewPage } from '@/pages/OverviewPage'
import { SettingsPage } from '@/pages/SettingsPage'

const navItems = [
  { to: '/overview', label: '概览', icon: Home, key: 'overview' },
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

/**
 * 独立打开时的桌面外壳。
 *
 * 内容区和嵌入 Karin 时完全共用：同样是一张常驻的纵向画布，
 * 列表、表单、扫码和概览使用同一套翻页动画；区别只在左侧：
 * 这里保留完整侧边栏，嵌入时换成图标栏。
 */
export const DesktopShell = () => {
  const { pathname } = useLocation()
  const { config, statuses, version } = useConfigStore()
  const activeKey = getActiveKey(pathname)
  const onlineCount = config.filter((bot) => statuses[bot.appId]?.online).length
  const allOnline = config.length > 0 && onlineCount === config.length

  // 画布顺序和侧边栏导航保持一致，翻页方向才符合点击位置。
  const pages = useMemo<CanvasPage[]>(
    () => [
      { key: 'overview', label: '概览', element: <OverviewPage /> },
      { key: 'bots', label: '机器人列表', element: <BotsWorkspace />, fill: true },
      { key: 'add', label: '扫码添加', element: <AddBotPage /> },
      { key: 'settings', label: '设置', element: <SettingsPage /> },
    ],
    []
  )

  return (
    <DesktopCanvasShell
      activeKey={activeKey}
      pages={pages}
      sidebar={
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
              <span
                className={cn(
                  'tabular inline-flex items-center gap-2',
                  allOnline ? 'text-success' : config.length > 0 ? 'text-warning' : 'text-muted'
                )}
              >
                <span className='status-dot' data-online={onlineCount > 0} aria-hidden='true' />
                {onlineCount} / {config.length} 在线
              </span>
            </div>
            <ThemeToggle withLabel />
            <p className='text-[0.6875rem] text-muted'>v{version || '—'}</p>
          </div>
        </aside>
      }
    />
  )
}
