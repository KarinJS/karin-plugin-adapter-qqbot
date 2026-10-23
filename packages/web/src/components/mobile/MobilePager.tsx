import { cn } from '@heroui/react'
import { gsap } from 'gsap'
import { useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

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
const VELOCITY_THRESHOLD = 0.45
const SNAP_DURATION = 0.32
const WHEEL_THRESHOLD = 60
const WHEEL_COOLDOWN = 360

/**
 * 手机端顶层页面横向分页器。
 *
 * 这里自己接管横向手势，而不是依赖原生横向滚动：
 * 原生滚动在鼠标拖动、Safari 嵌套滚动和某些安卓浏览器里并不可靠。
 * 横向位移由 GSAP 直接驱动，纵向仍然交给浏览器（touch-action: pan-y），
 * 因此列表和概览页的上下滚动不受影响。
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

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  useEffect(() => {
    onChangeRef.current = onChange
    itemsRef.current = items
  }, [items, onChange])

  const width = () => rootRef.current?.clientWidth ?? 0

  const setTrack = useCallback((x: number, animate: boolean) => {
    const track = trackRef.current
    if (!track) return

    gsap.killTweensOf(track)

    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(track, { x })
      return
    }

    gsap.to(track, { x, duration: SNAP_DURATION, ease: 'power3.out' })
  }, [])

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    if (firstSyncRef.current) {
      firstSyncRef.current = false
      indexRef.current = activeIndex
      gsap.set(track, { x: -activeIndex * width() })
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
      gsap.killTweensOf(track)
      gsap.set(track, { x: -indexRef.current * root.clientWidth })
    })

    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    if (!root || !track) return

    let pointerId: number | null = null
    let startX = 0
    let startY = 0
    let lastX = 0
    let lastTime = 0
    let velocity = 0
    let axis: 'x' | 'y' | null = null
    let moved = false
    let suppressClickUntil = 0
    let wheelAccum = 0
    let wheelTimer: number | undefined
    let lastWheelSwitch = 0
    let touchId: number | null = null
    let touchStartX = 0
    let touchStartY = 0
    let touchLastX = 0
    let touchLastTime = 0
    let touchVelocity = 0
    let touchAxis: 'x' | 'y' | null = null
    let touchMoved = false

    // 手势开始时量一次页宽，移动过程中不再读 clientWidth（读布局会强制同步重排）。
    let dragWidth = 0
    // 触摸位置先存起来，每帧最多写一次 transform。
    let pendingX: number | null = null
    let frameId = 0
    const setTrackX = gsap.quickSetter(track, 'x', 'px')

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

    const resetDrag = () => {
      cancelTrackX()
      pointerId = null
      axis = null
      moved = false
      dragWidth = 0
      draggingRef.current = false
      root.removeAttribute('data-dragging')
    }

    const resetTouch = () => {
      cancelTrackX()
      touchId = null
      touchAxis = null
      touchMoved = false
      dragWidth = 0
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
      const goNext = dx < -pageWidth * SWIPE_RATIO || releaseVelocity < -VELOCITY_THRESHOLD
      const goPrev = dx > pageWidth * SWIPE_RATIO || releaseVelocity > VELOCITY_THRESHOLD
      let nextIndex = index

      if (goNext && index < itemsRef.current.length - 1) nextIndex = index + 1
      else if (goPrev && index > 0) nextIndex = index - 1

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
      pointerId = event.pointerId
      startX = lastX = event.clientX
      startY = event.clientY
      lastTime = performance.now()
      velocity = 0
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
          gsap.killTweensOf(track)
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

      const now = performance.now()
      const dt = now - lastTime
      if (dt > 0) velocity = (event.clientX - lastX) / dt
      lastX = event.clientX
      lastTime = now

      const pageWidth = dragWidth || root.clientWidth
      if (!pageWidth) return

      const index = indexRef.current
      let offset = dx
      if ((index === 0 && dx > 0) || (index === itemsRef.current.length - 1 && dx < 0)) {
        offset = dx * 0.35
      }
      scheduleTrackX(-index * pageWidth + offset)
    }

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return

      const pageWidth = dragWidth || root.clientWidth
      const index = indexRef.current
      const releaseVelocity = performance.now() - lastTime > 100 ? 0 : velocity

      if (axis === 'x' && moved && pageWidth > 0) {
        flushTrackX()
        commitHorizontal(startX, event.clientX, releaseVelocity)
      } else {
        setTrack(-index * pageWidth, true)
      }

      releaseCapture(event.pointerId)
      resetDrag()
    }

    const cancelDrag = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      cancelTrackX()
      setTrack(-indexRef.current * (dragWidth || root.clientWidth), true)
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
      touchId = touch.identifier
      touchStartX = touchLastX = touch.clientX
      touchStartY = touch.clientY
      touchLastTime = performance.now()
      touchVelocity = 0
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
          gsap.killTweensOf(track)
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

      const now = performance.now()
      const dt = now - touchLastTime
      if (dt > 0) touchVelocity = (touch.clientX - touchLastX) / dt
      touchLastX = touch.clientX
      touchLastTime = now

      const pageWidth = dragWidth || root.clientWidth
      if (!pageWidth) return

      const index = indexRef.current
      let offset = dx
      if ((index === 0 && dx > 0) || (index === itemsRef.current.length - 1 && dx < 0)) {
        offset = dx * 0.35
      }
      scheduleTrackX(-index * pageWidth + offset)
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (touchId === null) return

      const touch = event.changedTouches[0]
      const releaseVelocity = performance.now() - touchLastTime > 100 ? 0 : touchVelocity

      if (touchAxis === 'x' && touchMoved) {
        flushTrackX()
        commitHorizontal(touchStartX, touch?.clientX ?? touchLastX, releaseVelocity)
      } else if (touchAxis === 'x') {
        setTrack(-indexRef.current * (dragWidth || root.clientWidth), true)
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
      gsap.killTweensOf(track)
    }
  }, [setTrack])

  return (
    <div
      ref={rootRef}
      role='group'
      className={cn('mobile-pager relative h-full overflow-hidden', disabled && 'pointer-events-none')}
      aria-label='主导航页面'
    >
      <div ref={trackRef} className='flex h-full w-full will-change-transform'>
        {items.map((item, index) => (
          <section
            key={item.key}
            className='mobile-panel mobile-scroll h-full w-full shrink-0 overflow-y-auto'
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
