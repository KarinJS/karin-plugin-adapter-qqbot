import { Tabs, cn } from '@heroui/react'
import type { LucideIcon } from 'lucide-react'
import { Children, useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useDragSelect } from '@/hooks/useDragSelect'
import { getReleaseVelocity, pushFlickSample, shouldAdvance, type FlickSample } from '@/lib/flick'
import { prefersReducedMotion } from '@/lib/uiMotion'
import { animateProgress, EASE_POWER3_OUT, readTranslate } from '@/lib/waapi'

export interface MobileSegmentedTabItem {
  key: string
  label: string
  icon?: LucideIcon
}

interface MobileSegmentedTabsProps {
  items: MobileSegmentedTabItem[]
  selectedKey: string
  onSelectionChange: (key: string) => void
  ariaLabel: string
  isDisabled?: boolean
  className?: string
  /** 内容区域支持左右轻扫切换标签；默认关闭。 */
  swipeable?: boolean
  children?: ReactNode
}

const SWIPE_AXIS_LOCK = 8
const SWIPE_RATIO = 0.2
const SWIPE_MIN_DISTANCE = 48
const SWIPE_SNAP_DURATION = 0.32
const CLICK_SUPPRESS = 200
/** 拖到首尾页之外时的跟手阻尼，和主分页器保持一致。 */
const EDGE_RESISTANCE = 0.35
// 手势挂在整块抽屉上（顶栏、表单空白处都能左右扫），这些区域自己处理触摸，
// 交给它们：输入框要能选中文字，标签栏自己有按住拖选，按钮要能正常点击。
const INTERACTIVE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  '[role="tablist"]',
  '[role="tab"]',
  '[role="switch"]',
  '[contenteditable="true"]',
  '[data-slot="select-trigger"]',
  '[data-slot="switch"]',
].join(', ')

/**
 * 手机端分段标签。
 *
 * 事件接收方式、添加方式共用这一套视觉和手势：点击切换，
 * 也可以按住横向拖动，手指经过哪个标签就选中哪个。
 *
 * 扫码 / 手动添加打开 swipeable 后，两个面板并排放在同一条轨道上：
 * 手指横向拖动时整条轨道跟手平移，松手再按距离 / 速度吸附到目标页，
 * 和主页的 MobilePager 是同一套画布手感，而不是旧面板先消失、新面板原地滑入。
 * 轨道用 translate3d 驱动，吸附交给 WAAPI，由合成器插值；纵向手势仍然交给外层抽屉。
 * 标签栏、输入框和按钮不参与轻扫。
 */
export const MobileSegmentedTabs = ({
  items,
  selectedKey,
  onSelectionChange,
  ariaLabel,
  isDisabled,
  className,
  swipeable = false,
  children,
}: MobileSegmentedTabsProps) => {
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef(items)
  const selectedKeyRef = useRef(selectedKey)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const swipeableRef = useRef(swipeable)
  const disabledRef = useRef(isDisabled)

  // 轨道当前停在哪一页。手势和标签点击都先更新它，再驱动轨道，
  // 这样 selectedKey 回流时 useLayoutEffect 不会重复补一段动画。
  const indexRef = useRef(0)
  const firstSyncRef = useRef(true)
  const draggingRef = useRef(false)
  const trackAnimationRef = useRef<Animation | null>(null)
  const snapStartRef = useRef(0)
  const snapTargetRef = useRef<number | null>(null)

  itemsRef.current = items
  selectedKeyRef.current = selectedKey
  onSelectionChangeRef.current = onSelectionChange
  swipeableRef.current = swipeable
  disabledRef.current = isDisabled

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === selectedKey)
  )

  useDragSelect({
    containerRef: listRef,
    itemSelector: '[role="tab"]',
    disabled: isDisabled,
    onSelectIndex: (index) => {
      const item = items[index]
      if (item) onSelectionChange(item.key)
    },
  })

  const measureWidth = useCallback(() => panelRef.current?.clientWidth ?? 0, [])

  const cancelSnapStart = useCallback(() => {
    if (snapStartRef.current) {
      cancelAnimationFrame(snapStartRef.current)
      snapStartRef.current = 0
    }
    snapTargetRef.current = null
  }, [])

  /** 从动画中间接管：先读当前位移，再取消，最后写回内联样式。 */
  const stopTrackAnimation = useCallback(() => {
    const animation = trackAnimationRef.current
    if (!animation) return

    const track = trackRef.current
    const x = track ? readTranslate(track, 'x') : 0
    animation.cancel()
    trackAnimationRef.current = null
    if (track) track.style.transform = `translate3d(${x}px, 0, 0)`
  }, [])

  const setTrack = useCallback(
    (x: number, animate: boolean) => {
      const track = trackRef.current
      if (!track) return

      cancelSnapStart()
      stopTrackAnimation()

      if (!animate || prefersReducedMotion()) {
        track.style.transform = `translate3d(${x}px, 0, 0)`
        return
      }

      // 等一帧再启动：标签切换会触发一次 React 提交（inert / 选中态 / 指示器），
      // 动画如果和提交撞在同一帧，第一帧就可能直接跳到中段。
      snapTargetRef.current = x
      snapStartRef.current = requestAnimationFrame(() => {
        snapStartRef.current = 0
        const target = snapTargetRef.current
        snapTargetRef.current = null
        const node = trackRef.current
        if (target === null || !node) return

        const from = readTranslate(node, 'x')
        trackAnimationRef.current = animateProgress(
          node,
          (progress) => ({ transform: `translate3d(${from + (target - from) * progress}px, 0, 0)` }),
          EASE_POWER3_OUT,
          SWIPE_SNAP_DURATION,
          () => {
            trackAnimationRef.current = null
            node.style.transform = `translate3d(${target}px, 0, 0)`
          }
        )
      })
    },
    [cancelSnapStart, stopTrackAnimation]
  )

  useLayoutEffect(() => {
    if (!swipeable) return
    const track = trackRef.current
    if (!track) return

    if (firstSyncRef.current) {
      firstSyncRef.current = false
      indexRef.current = activeIndex
      track.style.transform = `translate3d(${-activeIndex * measureWidth()}px, 0, 0)`
      return
    }

    // 手势 / 点击已经在自己的路径里更新过 indexRef 并启动了轨道动画。
    if (activeIndex === indexRef.current) return
    indexRef.current = activeIndex
    setTrack(-activeIndex * measureWidth(), true)
  }, [activeIndex, measureWidth, setTrack, swipeable])

  useEffect(() => {
    if (!swipeable) return
    const panel = panelRef.current
    if (!panel) return

    // 宽度变化（横竖屏、键盘、分屏）时按当前页重新对齐；拖动中先不动。
    const observer = new ResizeObserver(() => {
      if (draggingRef.current) return
      cancelSnapStart()
      stopTrackAnimation()
      const track = trackRef.current
      if (!track) return
      track.style.transform = `translate3d(${-indexRef.current * panel.clientWidth}px, 0, 0)`
    })

    observer.observe(panel)
    return () => observer.disconnect()
  }, [cancelSnapStart, stopTrackAnimation, swipeable])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    // 手势挂在整块抽屉上，而不是只有面板：在顶栏、表单空白处左右扫都能切页。
    // 标签栏、输入框和按钮自己处理触摸，见 INTERACTIVE_SELECTOR。
    const swipeTarget = panel.closest<HTMLElement>('[data-slot="drawer-dialog"]') ?? panel

    let touchId: number | null = null
    let startX = 0
    let startY = 0
    let dragWidth = 0
    let axis: 'x' | 'y' | null = null
    let engaged = false
    let suppressClickUntil = 0
    let samples: FlickSample[] = []
    // 抓住正在吸附的轨道时，从它当前所在的位移继续，而不是跳回页面对齐点。
    let dragBaseOffset = 0
    // 触摸位置先存起来，每帧最多写一次 transform。
    let pendingX: number | null = null
    let frameId = 0

    const setTrackX = (x: number) => {
      const track = trackRef.current
      if (track) track.style.transform = `translate3d(${x}px, 0, 0)`
    }

    const applyPendingX = () => {
      frameId = 0
      if (pendingX === null) return
      const x = pendingX
      pendingX = null
      setTrackX(x)
    }

    const scheduleTrackX = (x: number) => {
      pendingX = x
      if (frameId) return
      frameId = requestAnimationFrame(applyPendingX)
    }

    const flushTrackX = () => {
      if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = 0
      }
      if (pendingX === null) return
      const x = pendingX
      pendingX = null
      setTrackX(x)
    }

    const cancelTrackX = () => {
      if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = 0
      }
      pendingX = null
    }

    const beginTrackDrag = () => {
      cancelSnapStart()
      stopTrackAnimation()
      dragBaseOffset = readTranslate(trackRef.current, 'x') + indexRef.current * dragWidth
      draggingRef.current = true
    }

    const reset = () => {
      cancelTrackX()
      touchId = null
      dragWidth = 0
      axis = null
      engaged = false
      samples = []
      dragBaseOffset = 0
      draggingRef.current = false
    }

    const onTouchStart = (event: TouchEvent) => {
      if (!swipeableRef.current || disabledRef.current || event.touches.length !== 1) {
        reset()
        return
      }

      const target = event.target as HTMLElement | null
      if (target?.closest(INTERACTIVE_SELECTOR)) {
        reset()
        return
      }

      const touch = event.touches[0]
      if (!touch) return

      cancelTrackX()
      touchId = touch.identifier
      startX = touch.clientX
      startY = touch.clientY
      dragWidth = 0
      axis = null
      engaged = false
      samples = [{ t: performance.now(), value: touch.clientX }]
    }

    const cancelTouch = () => {
      cancelTrackX()
      if (engaged) {
        const pageWidth = dragWidth || panel.clientWidth
        if (pageWidth > 0) setTrack(-indexRef.current * pageWidth, true)
      }
      reset()
    }

    const onTouchMove = (event: TouchEvent) => {
      if (touchId === null) return

      if (event.touches.length !== 1) {
        cancelTouch()
        return
      }

      const touch = event.touches[0]
      if (!touch) return

      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      if (!axis) {
        if (Math.abs(dx) < SWIPE_AXIS_LOCK && Math.abs(dy) < SWIPE_AXIS_LOCK) return

        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          axis = 'x'
          engaged = true
          dragWidth = panel.clientWidth
          suppressClickUntil = performance.now() + CLICK_SUPPRESS
          beginTrackDrag()
        } else if (Math.abs(dy) > Math.abs(dx) * 1.2) {
          // 纵向手势交给抽屉的展开 / 收起 / 滚动。
          axis = 'y'
          touchId = null
          return
        } else {
          return
        }
      }

      if (axis !== 'x') return

      event.preventDefault()
      pushFlickSample(samples, touch.clientX)

      const pageWidth = dragWidth || panel.clientWidth
      if (!pageWidth) return

      const index = indexRef.current
      let offset = dragBaseOffset + dx
      if ((index === 0 && offset > 0) || (index === itemsRef.current.length - 1 && offset < 0)) {
        offset *= EDGE_RESISTANCE
      }
      scheduleTrackX(-index * pageWidth + offset)
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (touchId === null) return

      const touch = event.changedTouches[0]
      const endX = touch?.clientX ?? samples[samples.length - 1]?.value ?? startX
      const releaseVelocity = getReleaseVelocity(samples)
      const pageWidth = dragWidth || panel.clientWidth

      if (engaged) {
        event.preventDefault()
        flushTrackX()

        if (pageWidth > 0) {
          const dx = endX - startX
          const index = indexRef.current
          // 距离和速度都归一化到“翻页方向”：左滑为正，右滑为负。
          const step = dx < 0 ? 1 : -1
          const distance = Math.abs(dx)
          const velocity = releaseVelocity * (dx < 0 ? -1 : 1)
          const threshold = Math.max(SWIPE_MIN_DISTANCE, pageWidth * SWIPE_RATIO)
          const nextIndex = shouldAdvance(distance, velocity, threshold)
            ? Math.max(0, Math.min(itemsRef.current.length - 1, index + step))
            : index

          indexRef.current = nextIndex
          setTrack(-nextIndex * pageWidth, true)

          if (nextIndex !== index) {
            const next = itemsRef.current[nextIndex]
            if (next) onSelectionChangeRef.current(next.key)
          }
        }

        suppressClickUntil = performance.now() + CLICK_SUPPRESS
      }

      reset()
    }

    const onTouchCancel = () => {
      cancelTouch()
    }

    const onPointerUpCapture = (event: PointerEvent) => {
      if (performance.now() >= suppressClickUntil) return
      event.preventDefault()
      event.stopPropagation()
    }

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() >= suppressClickUntil) return
      event.preventDefault()
      event.stopPropagation()
      suppressClickUntil = 0
    }

    swipeTarget.addEventListener('touchstart', onTouchStart, { passive: true })
    swipeTarget.addEventListener('touchmove', onTouchMove, { passive: false })
    swipeTarget.addEventListener('touchend', onTouchEnd, { passive: false })
    swipeTarget.addEventListener('touchcancel', onTouchCancel)
    swipeTarget.addEventListener('pointerup', onPointerUpCapture, true)
    swipeTarget.addEventListener('click', onClickCapture, true)

    return () => {
      cancelTrackX()
      cancelSnapStart()
      trackAnimationRef.current?.cancel()
      trackAnimationRef.current = null
      draggingRef.current = false
      swipeTarget.removeEventListener('touchstart', onTouchStart)
      swipeTarget.removeEventListener('touchmove', onTouchMove)
      swipeTarget.removeEventListener('touchend', onTouchEnd)
      swipeTarget.removeEventListener('touchcancel', onTouchCancel)
      swipeTarget.removeEventListener('pointerup', onPointerUpCapture, true)
      swipeTarget.removeEventListener('click', onClickCapture, true)
    }
  }, [cancelSnapStart, setTrack, stopTrackAnimation])

  return (
    <Tabs
      selectedKey={selectedKey}
      isDisabled={isDisabled}
      className={cn('w-full', className)}
      onSelectionChange={(key) => {
        if (typeof key === 'string') onSelectionChange(key)
      }}
    >
      <div ref={listRef} className='w-full'>
        <Tabs.List
          aria-label={ariaLabel}
          className='grid gap-1 rounded-xl bg-default p-1'
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const Icon = item.icon

            return (
              <Tabs.Tab
                key={item.key}
                id={item.key}
                className='h-9 min-w-0 justify-center gap-1.5 rounded-lg px-1 text-[11px] font-medium data-[selected=true]:text-foreground'
              >
                {Icon ? <Icon className='size-3.5' aria-hidden='true' /> : null}
                <span className='truncate'>{item.label}</span>
                <Tabs.Indicator className='rounded-lg bg-surface shadow-sm' />
              </Tabs.Tab>
            )
          })}
        </Tabs.List>
      </div>
      {/*
        swipeable 时两条面板并排放在同一条轨道上，viewport 用负外边距吃掉
        抽屉内容的左右内边距，让邻页从抽屉边缘滑进来；每个面板再把内边距补回去，
        静止时和原来的对齐完全一致。非 swipeable（事件通道说明）保持原样。
      */}
      <div ref={panelRef} className={cn('relative touch-pan-y', swipeable && '-mx-4 overflow-hidden')}>
        {swipeable ? (
          <div ref={trackRef} className='flex w-full will-change-transform'>
            {Children.map(children, (child) => (
              <div className='w-full shrink-0 px-4'>{child}</div>
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </Tabs>
  )
}
