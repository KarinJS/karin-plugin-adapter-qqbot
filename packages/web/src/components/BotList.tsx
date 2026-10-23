import { Button, Skeleton, cn } from '@heroui/react'
import { Plus, RadioTower } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotAvatar } from '@/components/BotAvatar'
import { getStatusLabel, StatusDot } from '@/components/StatusPill'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { CANVAS_SLIDE_DURATION } from '@/lib/canvasMotion'
import { getSmoothScroll, normalizeWheelDelta, smoothScrollBy } from '@/lib/smoothScroll'

const ROW_HEIGHT = 56

interface BotListProps {
  selectedAppId?: string
  className?: string
  showAdd?: boolean
  /**
   * 整列固定高度，标题浮在滚动区上方（宽屏工作区）。
   * 概览页的列表仍然跟着页面滚，不启用。
   */
  overlay?: boolean
  /** 接管卡片点击；不传时直接跳转到详情。 */
  onSelect?: (appId: string) => void
  /**
   * 跟随路由同步滚动：离开列表时复位，回到列表时把选中的机器人滚进视野。
   * 概览页的列表跟着页面滚，不启用。
   */
  syncRouteScroll?: boolean
  /** 列表所在页面当前是否可见；画布页面常驻，需要显式告知。 */
  active?: boolean
}

export const BotList = ({
  selectedAppId,
  className,
  showAdd = true,
  overlay = false,
  onSelect,
  syncRouteScroll = false,
  active = true,
}: BotListProps) => {
  const { config, statuses, loading } = useConfigStore()
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)
  const listContentRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  // 列表内部点击时卡片本来就在视野里，不要因为选中变化再把它滚到中间。
  const pressedAppIdRef = useRef<string | null>(null)
  // 首帧不能播放高亮滑动，否则刷新时选中块会从第一行滑到当前行。
  const [highlightReady, setHighlightReady] = useState(false)

  const selectedIndex = config.findIndex((bot) => bot.appId === selectedAppId)

  const setListScrollTop = (top: number) => {
    const list = listRef.current
    if (!list) return

    const max = Math.max(0, list.scrollHeight - list.clientHeight)
    const next = Math.max(0, Math.min(top, max))
    const lenis = getSmoothScroll(list)
    if (lenis) {
      // 列表内容刚渲染时 Lenis 的滚动上限可能还是 0，先刷新尺寸再定位。
      lenis.resize()
      lenis.scrollTo(next, { immediate: true })
    } else {
      list.scrollTop = next
    }
  }

  const locateBot = (appId: string) => {
    const list = listRef.current
    if (!list) return

    const row = [...list.querySelectorAll<HTMLElement>('[data-bot-id]')].find((node) => node.dataset.botId === appId)
    if (!row) {
      setListScrollTop(0)
      return
    }

    // 用屏幕坐标算行在滚动内容里的位置，再把它放到列表可视区中间。
    const listRect = list.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    const rowTop = rowRect.top - listRect.top + list.scrollTop
    setListScrollTop(rowTop - (list.clientHeight - rowRect.height) / 2)
  }

  // 画布页面不会因为路由切换而卸载，列表滚动位置必须自己复位和定位。
  useLayoutEffect(() => {
    if (!syncRouteScroll) return

    if (!active) {
      pressedAppIdRef.current = null
      // 翻页期间列表还在屏幕上，等页面滑出画布后再复位，避免退场时看到列表跳回顶部。
      const timer = window.setTimeout(() => setListScrollTop(0), CANVAS_SLIDE_DURATION * 1000)
      return () => window.clearTimeout(timer)
    }

    if (!selectedAppId) {
      setListScrollTop(0)
      return
    }

    if (pressedAppIdRef.current === selectedAppId) {
      pressedAppIdRef.current = null
      return
    }

    locateBot(selectedAppId)
  }, [syncRouteScroll, active, selectedAppId, selectedIndex])

  // 列表的滚轮由下面的 handleWheel 决定滚哪个容器，所以关闭 Lenis 自己的滚轮接管。
  useSmoothScroll(listRef, listContentRef, { manual: true })

  useEffect(() => {
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setHighlightReady(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const list = listRef.current
    if (!section || !list) return

    /** 找到页面真正的滚动容器：画布页面是 section。 */
    const findPageScroller = () => {
      let node = list.parentElement
      while (node) {
        if (node.scrollHeight > node.clientHeight + 1) {
          const overflowY = window.getComputedStyle(node).overflowY
          if (overflowY === 'auto' || overflowY === 'scroll') return node
        }
        node = node.parentElement
      }
      return null
    }

    /** 标记事件已经被这一层处理，避免上层的 Lenis 再滚一次。 */
    const markHandled = (event: WheelEvent) => {
      ;(event as WheelEvent & { lenisStopPropagation?: boolean }).lenisStopPropagation = true
    }

    const scrollBy = (element: HTMLElement, delta: number) => {
      if (!smoothScrollBy(element, delta)) element.scrollTop += delta
    }

    /**
     * 指针在卡片上时，列表自己滚。
     *
     * 指针不在卡片上（列表空白处、标题、列表下方）时，滚轮交给右侧表单，
     * 表单滚到头了再交给整页；窄屏没有独立表单滚动区，
     * 会直接落到整页滚动上。
     */
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return

      const delta = normalizeWheelDelta(event)
      const target = event.target as HTMLElement | null
      const overCard = Boolean(target?.closest('[data-bot-id]'))
      const canScroll = delta < 0 ? list.scrollTop > 0 : list.scrollTop + list.clientHeight < list.scrollHeight - 1

      if (overCard && canScroll) {
        event.preventDefault()
        markHandled(event)
        scrollBy(list, delta)
        return
      }

      const panel = list.closest('[data-bots-workspace]')?.querySelector<HTMLElement>('[data-bots-panel]') ?? null
      const panelCanScroll =
        panel !== null &&
        (delta < 0 ? panel.scrollTop > 0 : panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1)

      if (panel && panelCanScroll) {
        event.preventDefault()
        markHandled(event)
        scrollBy(panel, delta)
        return
      }

      const page = findPageScroller()
      if (!page) return

      event.preventDefault()
      markHandled(event)
      scrollBy(page, delta)
    }

    // 监听整列而不只是滚动区：指针停在标题、间隙或列表空白处时也要能滚动表单。
    section.addEventListener('wheel', handleWheel, { passive: false })
    return () => section.removeEventListener('wheel', handleWheel)
  }, [])

  const onlineCount = config.reduce(
    (count, bot) => count + (bot.event.type !== 0 && statuses[bot.appId]?.online ? 1 : 0),
    0
  )

  return (
    <section ref={sectionRef} className={cn('relative flex min-h-0 flex-col gap-3', className)} aria-label='机器人列表'>
      {/*
        宽屏时标题浮在滚动区上方，卡片从底部进入、向上滚过标题后从顶部消失；
        窄屏整页滚动时由 sticky 把标题钉在屏幕顶部。
        宽屏下标题带固定 84px 高，和右侧表单标题共用同一条基线。
      */}
      <div
        className={cn(
          'sticky top-0 z-20 -mx-1 px-1',
          overlay && 'xl:absolute xl:inset-x-0 xl:top-0 xl:mx-0 xl:h-21 xl:px-4'
        )}
      >
        <div
          className={cn(
            'bot-list-header flex items-center justify-between gap-3 px-1 py-3',
            overlay ? 'bot-list-header--overlay xl:h-full' : 'xl:h-21'
          )}
        >
          <div className='flex items-baseline gap-2'>
            <h2 className='text-heading text-base font-semibold xl:text-xl'>机器人</h2>
            <span className='tabular text-xs text-muted'>{config.length}</span>
          </div>
          <div className='flex items-center gap-3'>
            <span className='flex items-center gap-1.5 text-[11px] text-muted'>
              <span aria-hidden='true' className='status-dot text-success' data-online='true' />
              <span className='tabular'>{onlineCount} 在线</span>
            </span>
            {showAdd ? (
              <Button size='sm' variant='secondary' onPress={() => navigate('/bots/new')}>
                <Plus className='size-4' aria-hidden='true' />
                添加
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className='relative min-h-0 flex-1'>
        <div
          ref={listRef}
          className={cn('no-scrollbar h-full overflow-y-auto overscroll-contain', overlay && 'xl:pt-21 xl:pb-21')}
        >
          <div ref={listContentRef}>
            {loading && config.length === 0 ? (
              <div className='flex flex-col gap-2 px-2 py-2'>
                <Skeleton className='h-14 w-full rounded-xl' />
                <Skeleton className='h-14 w-full rounded-xl' />
                <Skeleton className='h-14 w-full rounded-xl' />
              </div>
            ) : null}

            {!loading && config.length === 0 ? (
              <div className='flex flex-col items-center gap-3 px-5 py-10 text-center'>
                <div className='flex size-10 items-center justify-center rounded-full border border-border text-muted'>
                  <RadioTower className='size-4' aria-hidden='true' />
                </div>
                <p className='text-sm text-muted'>还没有配置机器人</p>
                <Button size='sm' variant='secondary' onPress={() => navigate('/bots/new')}>
                  扫码添加第一个
                </Button>
              </div>
            ) : null}

            <div className='relative px-2'>
              {/* 选中底色是一块在行间滑动的浅色块，行本身保持透明。 */}
              {selectedIndex >= 0 ? (
                <div
                  aria-hidden='true'
                  className={cn(
                    'pointer-events-none absolute inset-x-0 top-0 h-14 rounded-xl bg-default',
                    highlightReady && 'bot-list-highlight'
                  )}
                  style={{ transform: `translateY(${selectedIndex * ROW_HEIGHT}px)` }}
                />
              ) : null}

              {config.map((bot) => {
                const status = statuses[bot.appId]
                const selected = selectedAppId === bot.appId
                const title = status?.name || bot.appId
                const online = status?.online ?? false

                return (
                  <Button
                    key={bot.appId}
                    fullWidth
                    data-bot-id={bot.appId}
                    variant='ghost'
                    className={cn(
                      'relative z-10 h-14 justify-start gap-3 rounded-xl px-3 text-left',
                      selected ? 'bg-transparent hover:bg-transparent' : 'hover:bg-default/40'
                    )}
                    aria-current={selected ? 'page' : undefined}
                    onPress={() => {
                      pressedAppIdRef.current = bot.appId
                      if (onSelect) onSelect(bot.appId)
                      else navigate(`/bots/${encodeURIComponent(bot.appId)}`)
                    }}
                  >
                    <BotAvatar name={title} avatar={status?.avatar} className='size-8 text-[11px]' />
                    <span className='flex min-w-0 flex-1 flex-col'>
                      <span
                        className={cn('truncate text-[13px] leading-5', selected ? 'font-semibold' : 'font-medium')}
                      >
                        {title}
                      </span>
                      <span className='tabular truncate text-[11px] leading-4 text-muted'>{bot.appId}</span>
                    </span>
                    <span className='flex shrink-0 items-center gap-1.5'>
                      <StatusDot online={online} eventType={bot.event.type} />
                      <span className='sr-only'>{getStatusLabel(online, bot.event.type)}</span>
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>
        </div>

        {/*
          上下边缘和手机端抽屉共用一套渐进模糊：三层不同半径的模糊叠加，
          不铺底色，卡片被模糊后仍能看出轮廓。
        */}
        {overlay ? (
          <>
            <div aria-hidden='true' className='edge-blur edge-blur--top hidden xl:block'>
              <div className='edge-blur__layer edge-blur__layer--strong' />
              <div className='edge-blur__layer edge-blur__layer--medium' />
              <div className='edge-blur__layer edge-blur__layer--soft' />
            </div>
            <div aria-hidden='true' className='edge-blur edge-blur--bottom hidden xl:block'>
              <div className='edge-blur__layer edge-blur__layer--strong' />
              <div className='edge-blur__layer edge-blur__layer--medium' />
              <div className='edge-blur__layer edge-blur__layer--soft' />
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
