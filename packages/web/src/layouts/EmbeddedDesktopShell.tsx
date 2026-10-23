import { Tooltip, cn } from '@heroui/react'
import { gsap } from 'gsap'
import { Bot, LayoutGrid, QrCode } from 'lucide-react'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { CanvasPager, type CanvasPage } from '@/components/desktop/CanvasPager'
import { CANVAS_SLIDE_DURATION, CANVAS_SLIDE_EASE } from '@/lib/canvasMotion'
import { AddBotPage } from '@/pages/AddBotPage'
import { BotsWorkspace } from '@/pages/BotsWorkspace'
import { OverviewPage } from '@/pages/OverviewPage'

const navItems = [
  { to: '/bots', label: '机器人列表', icon: Bot, key: 'bots' },
  { to: '/bots/new', label: '扫码添加', icon: QrCode, key: 'add' },
  { to: '/overview', label: '概览', icon: LayoutGrid, key: 'overview' },
] as const

const getActiveKey = (pathname: string) => {
  if (pathname === '/bots/new') return 'add'
  if (pathname.startsWith('/overview')) return 'overview'
  // 首页重定向发生在挂载之后，这里先按机器人列表落位，避免先闪一下概览再翻页。
  return 'bots'
}

/**
 * Karin iframe 内的桌面外壳。
 *
 * 右侧是一张纵向画布：机器人、扫码添加、概览三页上下排布，切换时整张画布滑动，
 * 翻页中途能看到上下两页。左侧图标栏的选中滑块用同一组时长与曲线移动，
 * 和页面保持在同一条进度上。
 */
export const EmbeddedDesktopShell = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const activeKey = getActiveKey(pathname)
  const navListRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const pillFirstRef = useRef(true)

  const pages = useMemo<CanvasPage[]>(
    () => [
      { key: 'bots', label: '机器人列表', element: <BotsWorkspace />, fill: true },
      { key: 'add', label: '扫码添加', element: <AddBotPage /> },
      { key: 'overview', label: '概览', element: <OverviewPage /> },
    ],
    []
  )

  // 画布外壳不渲染路由出口，根路径要自己补一次跳转，让地址栏和当前页保持一致。
  useEffect(() => {
    if (pathname === '/') navigate('/bots', { replace: true })
  }, [navigate, pathname])

  useLayoutEffect(() => {
    const list = navListRef.current
    const pill = pillRef.current
    if (!list || !pill) return

    const target = list.querySelector<HTMLElement>(`[data-canvas-nav="${activeKey}"]`)
    if (!target) return

    gsap.killTweensOf(pill)
    const y = target.offsetTop

    if (pillFirstRef.current) {
      pillFirstRef.current = false
      gsap.set(pill, { y })
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(pill, { y })
      return
    }

    gsap.to(pill, { y, duration: CANVAS_SLIDE_DURATION, ease: CANVAS_SLIDE_EASE })
  }, [activeKey])

  return (
    <div className='flex h-dvh overflow-hidden bg-background'>
      <aside className='flex w-[4.5rem] shrink-0 items-center justify-center py-3' aria-label='侧边栏'>
        <nav
          className='flex h-full max-h-[calc(100dvh-1.5rem)] w-14 flex-col items-center justify-center rounded-full border border-border/70 bg-surface/80 p-1.5 shadow-sm backdrop-blur'
          aria-label='主导航'
        >
          <div ref={navListRef} className='relative flex w-11 flex-col items-center gap-1.5'>
            <span
              ref={pillRef}
              aria-hidden='true'
              className='pointer-events-none absolute top-0 left-0 size-11 rounded-full bg-foreground'
            />

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
                      data-canvas-nav={item.key}
                      className={cn(
                        'canvas-nav-link relative z-10 flex size-11 items-center justify-center rounded-full',
                        active ? 'text-background' : 'text-muted hover:bg-default hover:text-foreground'
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
          </div>
        </nav>
      </aside>

      <main className='min-w-0 flex-1'>
        <CanvasPager pages={pages} activeKey={activeKey} />
      </main>
    </div>
  )
}
