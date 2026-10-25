import { Tabs, cn } from '@heroui/react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useDragSelect } from '@/hooks/useDragSelect'
import { getReleaseVelocity, pushFlickSample, shouldAdvance, type FlickSample } from '@/lib/flick'
import { prefersReducedMotion } from '@/lib/uiMotion'
import { animateProgress, EASE_POWER3_OUT } from '@/lib/waapi'

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
const SWIPE_ANIM_DURATION = 0.32
const SWIPE_ANIM_OFFSET = 24
const CLICK_SUPPRESS = 200
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
 * 扫码 / 手动添加打开 swipeable 后，整块抽屉（顶栏和内容区）都支持左右轻扫切换，
 * 面板沿抽屉的 power3.out 曲线从手势方向滑入。标签栏、输入框和按钮不参与轻扫。
 * 纵向手势仍然交给外层抽屉的滚动逻辑。
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
  const swipeIntentRef = useRef<{ direction: number; key: string } | null>(null)
  const itemsRef = useRef(items)
  const selectedKeyRef = useRef(selectedKey)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const swipeableRef = useRef(swipeable)
  const disabledRef = useRef(isDisabled)

  itemsRef.current = items
  selectedKeyRef.current = selectedKey
  onSelectionChangeRef.current = onSelectionChange
  swipeableRef.current = swipeable
  disabledRef.current = isDisabled

  useDragSelect({
    containerRef: listRef,
    itemSelector: '[role="tab"]',
    disabled: isDisabled,
    onSelectIndex: (index) => {
      const item = items[index]
      if (item) onSelectionChange(item.key)
    },
  })

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    // 手势挂在整块抽屉上，而不是只有面板：在顶栏、表单空白处左右扫都能切换标签。
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

    const reset = () => {
      touchId = null
      dragWidth = 0
      axis = null
      engaged = false
      samples = []
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

      touchId = touch.identifier
      startX = touch.clientX
      startY = touch.clientY
      dragWidth = 0
      axis = null
      engaged = false
      samples = [{ t: performance.now(), value: touch.clientX }]
    }

    const onTouchMove = (event: TouchEvent) => {
      if (touchId === null) return

      if (event.touches.length !== 1) {
        reset()
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
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (touchId === null) return

      const touch = event.changedTouches[0]
      const endX = touch?.clientX ?? samples[samples.length - 1]?.value ?? startX
      const dx = endX - startX
      const releaseVelocity = getReleaseVelocity(samples)
      const list = itemsRef.current
      const index = list.findIndex((item) => item.key === selectedKeyRef.current)

      if (engaged && dx !== 0 && index >= 0) {
        // 距离和速度都归一化到“下一个标签”的方向：左滑为正，右滑为负。
        const step = dx < 0 ? 1 : -1
        const distance = Math.abs(dx)
        const velocity = releaseVelocity * (dx < 0 ? -1 : 1)
        const threshold = Math.max(SWIPE_MIN_DISTANCE, dragWidth * SWIPE_RATIO)

        if (shouldAdvance(distance, velocity, threshold)) {
          const nextIndex = Math.max(0, Math.min(list.length - 1, index + step))
          const next = list[nextIndex]
          if (next && nextIndex !== index) {
            swipeIntentRef.current = { direction: step, key: next.key }
            onSelectionChangeRef.current(next.key)
          }
        }
      }

      if (engaged) {
        event.preventDefault()
        suppressClickUntil = performance.now() + CLICK_SUPPRESS
      }

      reset()
    }

    const onTouchCancel = () => reset()

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
      swipeTarget.removeEventListener('touchstart', onTouchStart)
      swipeTarget.removeEventListener('touchmove', onTouchMove)
      swipeTarget.removeEventListener('touchend', onTouchEnd)
      swipeTarget.removeEventListener('touchcancel', onTouchCancel)
      swipeTarget.removeEventListener('pointerup', onPointerUpCapture, true)
      swipeTarget.removeEventListener('click', onClickCapture, true)
    }
  }, [])

  useLayoutEffect(() => {
    const intent = swipeIntentRef.current
    swipeIntentRef.current = null

    if (!swipeable || !intent || intent.key !== selectedKey) return

    const panel = panelRef.current
    if (!panel || prefersReducedMotion()) return

    // 松手后的滑入同样交给 WAAPI：transform 由合成器插值。
    const animation = animateProgress(
      panel,
      (progress) => ({
        transform: `translate3d(${intent.direction * SWIPE_ANIM_OFFSET * (1 - progress)}px, 0, 0)`,
      }),
      EASE_POWER3_OUT,
      SWIPE_ANIM_DURATION,
      () => {
        panel.style.transform = ''
      }
    )

    return () => animation.cancel()
  }, [selectedKey, swipeable])

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
      <div ref={panelRef} className='relative touch-pan-y'>
        {children}
      </div>
    </Tabs>
  )
}
