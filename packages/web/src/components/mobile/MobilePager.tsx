import { useGSAP } from '@gsap/react'
import { cn } from '@heroui/react'
import { gsap } from 'gsap'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

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

interface DragState {
  pointerId: number | null
  startX: number
  startY: number
  baseX: number
  axis: 'x' | 'y' | null
  active: boolean
  lastX: number
  lastTime: number
  velocity: number
}

const emptyDrag: DragState = {
  pointerId: null,
  startX: 0,
  startY: 0,
  baseX: 0,
  axis: null,
  active: false,
  lastX: 0,
  lastTime: 0,
  velocity: 0,
}

/** 边缘拖动时逐渐增加阻力，避免第一页/最后一页被拖出空白。 */
const rubberband = (offset: number, dimension: number) => {
  const constant = 0.55
  return (offset * dimension * constant) / (dimension + constant * Math.abs(offset))
}

/**
 * 手机端顶层页面横向分页器。
 *
 * 所有顶层页面同时挂载，拖动时两页同时可见；松手后根据位移和速度吸附到目标页。
 * 吸附动画使用 GSAP，用户再次按下时会立刻停止并接管当前位移，所以可以随时反悔。
 */
export const MobilePager = ({ items, activeKey, onChange, disabled }: MobilePagerProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === activeKey)
  )
  const indexRef = useRef(activeIndex)
  const widthRef = useRef(0)
  const dragRef = useRef<DragState>({ ...emptyDrag })
  const suppressClickRef = useRef(0)
  const [dragging, setDragging] = useState(false)

  const snapTo = useCallback((index: number, animate: boolean) => {
    const track = trackRef.current
    const width = widthRef.current || containerRef.current?.clientWidth || 0
    if (!track) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!animate || reduceMotion) {
      gsap.set(track, { x: -index * width })
      return
    }

    gsap.to(track, {
      x: -index * width,
      duration: 0.36,
      ease: 'power3.out',
      overwrite: true,
    })
  }, [])

  useEffect(() => {
    const next = Math.max(
      0,
      items.findIndex((item) => item.key === activeKey)
    )
    if (next === indexRef.current) return

    indexRef.current = next
    snapTo(next, true)
  }, [activeKey, items, snapTo])

  useGSAP(
    () => {
      const container = containerRef.current
      const track = trackRef.current
      if (!container || !track) return

      const measure = () => {
        const width = container.clientWidth
        widthRef.current = width
        gsap.set(track, { x: -indexRef.current * width })
      }

      measure()

      const observer = new ResizeObserver(measure)
      observer.observe(container)

      return () => observer.disconnect()
    },
    { scope: containerRef }
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return

    const target = event.target as HTMLElement
    if (target.closest('input, textarea, select, [contenteditable="true"], [data-pager-no-drag]')) return

    const track = trackRef.current
    if (!track) return

    gsap.killTweensOf(track)
    const baseX = Number(gsap.getProperty(track, 'x')) || 0

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX,
      axis: null,
      active: false,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY

    if (!drag.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return

      if (Math.abs(dx) > Math.abs(dy) * 1.15) {
        drag.axis = 'x'
        drag.active = true
        setDragging(true)
        containerRef.current?.setPointerCapture(event.pointerId)
      } else {
        drag.axis = 'y'
        return
      }
    }

    if (drag.axis !== 'x') return

    if (event.cancelable) event.preventDefault()

    const width = widthRef.current
    let next = drag.baseX + dx
    const min = -(items.length - 1) * width

    if (next > 0) next = rubberband(next, width)
    else if (next < min) next = min + rubberband(next - min, width)

    gsap.set(trackRef.current, { x: next })

    const now = performance.now()
    const dt = now - drag.lastTime
    if (dt > 0) {
      drag.velocity = (event.clientX - drag.lastX) / dt
      drag.lastTime = now
      drag.lastX = event.clientX
    }
  }

  const finishDrag = (event: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const drag = dragRef.current
    if (drag.pointerId !== event.pointerId) return

    if (!drag.active) {
      dragRef.current = { ...emptyDrag }
      return
    }

    const width = widthRef.current
    const currentX = Number(gsap.getProperty(trackRef.current, 'x')) || 0
    const offset = currentX + indexRef.current * width
    let target = indexRef.current

    if (!cancelled) {
      if (offset < -width * 0.22 || drag.velocity < -0.45) target += 1
      else if (offset > width * 0.22 || drag.velocity > 0.45) target -= 1
    }

    target = Math.max(0, Math.min(items.length - 1, target))
    indexRef.current = target
    suppressClickRef.current = performance.now() + 320
    setDragging(false)
    dragRef.current = { ...emptyDrag }

    try {
      containerRef.current?.releasePointerCapture(event.pointerId)
    } catch {
      // 指针捕获可能已经释放。
    }

    snapTo(target, true)

    if (items[target].key !== activeKey) onChange(items[target].key)
  }

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (performance.now() >= suppressClickRef.current) return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-full touch-pan-y overflow-hidden',
        dragging ? 'cursor-grabbing select-none' : 'cursor-grab'
      )}
      onClickCapture={handleClickCapture}
      onPointerCancel={(event) => finishDrag(event, true)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishDrag(event, false)}
    >
      <div ref={trackRef} className='flex h-full will-change-transform'>
        {items.map((item, index) => (
          <section
            key={item.key}
            className='mobile-panel mobile-scroll h-full w-full shrink-0 overflow-y-auto overscroll-contain'
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
