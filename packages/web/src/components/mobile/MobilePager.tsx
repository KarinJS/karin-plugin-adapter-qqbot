import { cn } from '@heroui/react'
import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { getReleaseVelocity, pushFlickSample, shouldAdvance, type FlickSample } from '@/lib/flick'
import { animateProgress, EASE_POWER3_OUT, readTranslate } from '@/lib/waapi'

export interface MobilePagerItem {
  key: string
  label: string
  element: ReactNode
}

interface MobilePagerProps {
  items: MobilePagerItem[]
  activeKey: string
  onChange: (key: string) => void
  disabled?: boolean
}

const AXIS_LOCK = 8
const SWIPE_RATIO = 0.2
const SNAP_DURATION = 0.32
const WHEEL_THRESHOLD = 60
const WHEEL_COOLDOWN = 360

/**
 * 手机端顶层页面横向分页器。
 *
 * 这里自己接管横向手势，而不是依赖原生横向滚动：
 * 原生滚动在鼠标拖动、Safari 嵌套滚动和某些安卓浏览器里并不可靠。
 * 横向位移由内联 transform 直接驱动，纵向仍然交给浏览器（touch-action: pan-y），
 * 因此列表和概览页的上下滚动不受影响。
 *
 * 松手后的吸附用 WAAPI 跑 transform：由合成器逐帧插值，主线程不参与。
 * 之前用 GSAP 每帧写 transform，翻页时正好撞上路由提交和 inert 切换，
 * 手机上松手后的吸附会明显掉帧。
 */
export const MobilePager = ({ items, activeKey, onChange, disabled }: MobilePagerProps) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === activeKey)
  )
  const indexRef = useRef(activeIndex)
  const firstSyncRef = useRef(true)
  const draggingRef = useRef(false)
  const disabledRef = useRef(disabled)
  const onChangeRef = useRef(onChange)
  const itemsRef = useRef(items)
  const trackAnimationRef = useRef<Animation | null>(null)

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  useEffect(() => {
    onChangeRef.current = onChange
    itemsRef.current = items
  }, [items, onChange])

  const width = () => rootRef.current?.clientWidth ?? 0

  // 翻页时同时会触发路由更新和 inert 切换，主线程会被占住几十毫秒。
  // 动画如果立刻开始计时，第一帧就会直接跳到动画中段；这里等两帧再启动，
  // 让动画的起点落在提交和首次绘制之后。
  const snapStartRef = useRef(0)
  const snapStart2Ref = useRef(0)
  const snapTargetRef = useRef<number | null>(null)

  const cancelSnapStart = useCallback(() => {
    if (snapStartRef.current) {
      cancelAnimationFrame(snapStartRef.current)
      snapStartRef.current = 0
    }
    if (snapStart2Ref.current) {
      cancelAnimationFrame(snapStart2Ref.current)
      snapStart2Ref.current = 0
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

      if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        track.style.transform = `translate3d(${x}px, 0, 0)`
        return
      }

      snapTargetRef.current = x
      snapStartRef.current = requestAnimationFrame(() => {
        snapStartRef.current = 0
        snapStart2Ref.current = requestAnimationFrame(() => {
          snapStart2Ref.current = 0
          const target = snapTargetRef.current
          snapTargetRef.current = null
          const node = trackRef.current
          if (target === null || !node) return

          const from = readTranslate(node, 'x')
          trackAnimationRef.current = animateProgress(
            node,
            (progress) => ({ transform: `translate3d(${from + (target - from) * progress}px, 0, 0)` }),
            EASE_POWER3_OUT,
            SNAP_DURATION,
            () => {
              trackAnimationRef.current = null
              node.style.transform = `translate3d(${target}px, 0, 0)`
            }
          )
        })
      })
    },
    [cancelSnapStart, stopTrackAnimation]
  )

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    if (firstSyncRef.current) {
      firstSyncRef.current = false
      indexRef.current = activeIndex
      track.style.transform = `translate3d(${-activeIndex * width()}px, 0, 0)`
      return
    }

    if (activeIndex === indexRef.current) return
    indexRef.current = activeIndex
    setTrack(-activeIndex * width(), true)
  }, [activeIndex, setTrack])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const observer = new ResizeObserver(() => {
      if (draggingRef.current) return
      const track = trackRef.current
      if (!track) return
      cancelSnapStart()
      stopTrackAnimation()
      track.style.transform = `translate3d(${-indexRef.current * root.clientWidth}px, 0, 0)`
    })

    observer.observe(root)
    return () => observer.disconnect()
  }, [cancelSnapStart, stopTrackAnimation])

  useEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    if (!root || !track) return

    let pointerId: number | null = null
    let startX = 0
    let startY = 0
    let pointerSamples: FlickSample[] = []
    let axis: 'x' | 'y' | null = null
    let moved = false
    let suppressClickUntil = 0
    let wheelAccum = 0
    let wheelTimer: number | undefined
    let lastWheelSwitch = 0
    let touchId: number | null = null
    let touchStartX = 0
    let touchStartY = 0
    let touchSamples: FlickSample[] = []
    let touchAxis: 'x' | 'y' | null = null
    let touchMoved = false

    // 手势开始时量一次页宽，移动过程中不再读 clientWidth（读布局会强制同步重排）。
    let dragWidth = 0
    // 抓住正在吸附的轨道时，从它当前所在的位移继续，而不是跳回页面对齐点。
    let dragBaseOffset = 0
    // 触摸位置先存起来，每帧最多写一次 transform。
    let pendingX: number | null = null
    let frameId = 0

    const setTrackX = (x: number) => {
      track.style.transform = `translate3d(${x}px, 0, 0)`
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
      dragBaseOffset = readTranslate(track, 'x') + indexRef.current * dragWidth
    }

    const resetDrag = () => {
      cancelTrackX()
      pointerId = null
      axis = null
      moved = false
      dragWidth = 0
      dragBaseOffset = 0
      pointerSamples = []
      draggingRef.current = false
      root.removeAttribute('data-dragging')
    }

    const resetTouch = () => {
      cancelTrackX()
      touchId = null
      touchAxis = null
      touchMoved = false
      dragWidth = 0
      dragBaseOffset = 0
      touchSamples = []
      draggingRef.current = false
      root.removeAttribute('data-dragging')
    }

    const releaseCapture = (id: number) => {
      try {
        if (root.hasPointerCapture(id)) root.releasePointerCapture(id)
      } catch {
        // 指针已经失效时忽略。
      }
    }

    const commitHorizontal = (start: number, end: number, releaseVelocity: number) => {
      const pageWidth = dragWidth || root.clientWidth
      if (!pageWidth) return

      const index = indexRef.current
      const dx = end - start
      // 距离和速度都归一化到“翻页方向”：左滑为正，右滑为负。
      const step = dx < 0 ? 1 : -1
      const distance = Math.abs(dx)
      const velocity = releaseVelocity * (dx < 0 ? -1 : 1)
      const turn = shouldAdvance(distance, velocity, pageWidth * SWIPE_RATIO)
      const nextIndex = turn ? Math.max(0, Math.min(itemsRef.current.length - 1, index + step)) : index

      indexRef.current = nextIndex
      setTrack(-nextIndex * pageWidth, true)
      suppressClickUntil = performance.now() + 140

      if (nextIndex !== index) {
        const next = itemsRef.current[nextIndex]
        if (next) onChangeRef.current(next.key)
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (disabledRef.current || !event.isPrimary) return
      // 触摸由下面的 touch 事件处理：Chrome 在触摸滚动开始时会发 pointercancel，
      // 指针流不可靠；鼠标 / 触控笔继续走 pointer 事件。
      if (event.pointerType === 'touch') return
      if (event.pointerType === 'mouse' && event.button !== 0) return

      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      cancelTrackX()
      dragWidth = 0
      dragBaseOffset = 0
      pointerId = event.pointerId
      startX = event.clientX
      startY = event.clientY
      pointerSamples = [{ t: performance.now(), value: event.clientX }]
      axis = null
      moved = false
      suppressClickUntil = 0
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return

      const dx = event.clientX - startX
      const dy = event.clientY - startY

      if (!axis) {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return

        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          axis = 'x'
          moved = true
          draggingRef.current = true
          dragWidth = root.clientWidth
          root.setAttribute('data-dragging', 'true')
          try {
            root.setPointerCapture(event.pointerId)
          } catch {
            // 某些浏览器不允许在这里捕获，后续 pointermove 仍然可用。
          }
          beginTrackDrag()
        } else if (Math.abs(dy) > Math.abs(dx) * 1.2) {
          // 纵向手势交还给浏览器，不再跟踪这次指针。
          axis = 'y'
          pointerId = null
          return
        } else {
          return
        }
      }

      if (axis !== 'x') return

      event.preventDefault()
      pushFlickSample(pointerSamples, event.clientX)

      const pageWidth = dragWidth || root.clientWidth
      if (!pageWidth) return

      const index = indexRef.current
      let offset = dragBaseOffset + dx
      if ((index === 0 && offset > 0) || (index === itemsRef.current.length - 1 && offset < 0)) {
        offset *= 0.35
      }
      scheduleTrackX(-index * pageWidth + offset)
    }

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return

      const pageWidth = dragWidth || root.clientWidth
      const releaseVelocity = getReleaseVelocity(pointerSamples)

      // 没锁横向轴就是一次点击 / 纵向手势：轨道没有位移，不要再补一段
      // 原地吸附动画（会白占主线程）。
      if (axis === 'x' && moved && pageWidth > 0) {
        flushTrackX()
        commitHorizontal(startX, event.clientX, releaseVelocity)
      }

      releaseCapture(event.pointerId)
      resetDrag()
    }

    const cancelDrag = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      cancelTrackX()
      if (axis === 'x' && moved) {
        setTrack(-indexRef.current * (dragWidth || root.clientWidth), true)
      }
      releaseCapture(event.pointerId)
      resetDrag()
    }

    const onTouchStart = (event: TouchEvent) => {
      if (disabledRef.current || event.touches.length !== 1) {
        resetTouch()
        return
      }

      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      const touch = event.touches[0]
      if (!touch) return

      cancelTrackX()
      dragWidth = 0
      dragBaseOffset = 0
      touchId = touch.identifier
      touchStartX = touch.clientX
      touchStartY = touch.clientY
      touchSamples = [{ t: performance.now(), value: touch.clientX }]
      touchAxis = null
      touchMoved = false
      suppressClickUntil = 0
    }

    const cancelTouch = () => {
      cancelTrackX()
      if (touchAxis === 'x' && touchMoved) {
        setTrack(-indexRef.current * (dragWidth || root.clientWidth), true)
      }
      resetTouch()
    }

    const onTouchMove = (event: TouchEvent) => {
      if (disabledRef.current || touchId === null) return

      if (event.touches.length !== 1) {
        cancelTouch()
        return
      }

      const touch = event.touches[0]
      if (!touch) return

      const dx = touch.clientX - touchStartX
      const dy = touch.clientY - touchStartY

      if (!touchAxis) {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return

        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          touchAxis = 'x'
          touchMoved = true
          draggingRef.current = true
          dragWidth = root.clientWidth
          root.setAttribute('data-dragging', 'true')
          beginTrackDrag()
        } else if (Math.abs(dy) > Math.abs(dx) * 1.2) {
          // 纵向手势交给浏览器的原生滚动。
          touchAxis = 'y'
          touchId = null
          return
        } else {
          return
        }
      }

      if (touchAxis !== 'x') return

      event.preventDefault()
      pushFlickSample(touchSamples, touch.clientX)

      const pageWidth = dragWidth || root.clientWidth
      if (!pageWidth) return

      const index = indexRef.current
      let offset = dragBaseOffset + dx
      if ((index === 0 && offset > 0) || (index === itemsRef.current.length - 1 && offset < 0)) {
        offset *= 0.35
      }
      scheduleTrackX(-index * pageWidth + offset)
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (touchId === null) return

      const touch = event.changedTouches[0]
      const endX = touch?.clientX ?? touchSamples[touchSamples.length - 1]?.value ?? touchStartX
      const releaseVelocity = getReleaseVelocity(touchSamples)

      if (touchAxis === 'x' && touchMoved) {
        flushTrackX()
        commitHorizontal(touchStartX, endX, releaseVelocity)
      }

      resetTouch()
    }

    const onTouchCancel = () => {
      cancelTouch()
    }

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault()
        event.stopPropagation()
        suppressClickUntil = 0
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (disabledRef.current) return
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return

      event.preventDefault()
      wheelAccum += event.deltaX
      window.clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => {
        wheelAccum = 0
      }, 180)

      if (Math.abs(wheelAccum) < WHEEL_THRESHOLD) return

      const now = performance.now()
      if (now - lastWheelSwitch < WHEEL_COOLDOWN) return

      const direction = wheelAccum > 0 ? 1 : -1
      wheelAccum = 0
      const nextIndex = Math.max(0, Math.min(itemsRef.current.length - 1, indexRef.current + direction))
      if (nextIndex === indexRef.current) return

      lastWheelSwitch = now
      indexRef.current = nextIndex
      setTrack(-nextIndex * root.clientWidth, true)
      const next = itemsRef.current[nextIndex]
      if (next) onChangeRef.current(next.key)
    }

    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointermove', onPointerMove, { passive: false })
    root.addEventListener('pointerup', finishDrag)
    root.addEventListener('pointercancel', cancelDrag)
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    root.addEventListener('touchend', onTouchEnd)
    root.addEventListener('touchcancel', onTouchCancel)
    root.addEventListener('click', onClickCapture, true)
    root.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      cancelTrackX()
      cancelSnapStart()
      stopTrackAnimation()
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerup', finishDrag)
      root.removeEventListener('pointercancel', cancelDrag)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('touchend', onTouchEnd)
      root.removeEventListener('touchcancel', onTouchCancel)
      root.removeEventListener('click', onClickCapture, true)
      root.removeEventListener('wheel', onWheel)
      window.clearTimeout(wheelTimer)
    }
  }, [setTrack, cancelSnapStart, stopTrackAnimation])

  return (
    <div
      ref={rootRef}
      role='group'
      className={cn(
        'relative h-full touch-pan-y overflow-hidden [@media(pointer:fine)]:cursor-grab data-[dragging=true]:cursor-grabbing data-[dragging=true]:select-none',
        disabled && 'pointer-events-none'
      )}
      aria-label='主导航页面'
    >
      <div ref={trackRef} className='flex h-full w-full will-change-transform'>
        {items.map((item, index) => (
          <section
            key={item.key}
            className='mobile-panel h-full w-full shrink-0 overflow-y-auto overscroll-contain px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            aria-label={item.label}
            aria-hidden={index !== activeIndex}
            inert={index !== activeIndex}
          >
            {item.element}
          </section>
        ))}
      </div>
    </div>
  )
}
