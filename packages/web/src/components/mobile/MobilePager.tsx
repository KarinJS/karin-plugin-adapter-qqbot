import { cn } from '@heroui/react'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'

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

/**
 * 手机端顶层页面横向分页器。
 *
 * 使用原生横向滚动 + scroll-snap，让浏览器自己处理触摸方向、惯性和吸附：
 * 拖动时两页同时可见，松手后可以继续拖回，滑动到一半也能停住。
 * 路由只在滚动真正吸附后同步，避免拖动过程中地址栏反复变化。
 */
export const MobilePager = ({ items, activeKey, onChange, disabled }: MobilePagerProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.key === activeKey)
  )
  const indexRef = useRef(activeIndex)
  const firstRef = useRef(true)
  const settleTimerRef = useRef<number | undefined>(undefined)

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior) => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const width = scroller.clientWidth
    if (!width) return

    scroller.scrollTo({ left: index * width, behavior })
  }, [])

  useEffect(() => {
    indexRef.current = activeIndex

    const scroller = scrollerRef.current
    if (!scroller) return

    const target = activeIndex * scroller.clientWidth
    if (Math.abs(scroller.scrollLeft - target) < 1) {
      firstRef.current = false
      return
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    scrollToIndex(activeIndex, firstRef.current || reduceMotion ? 'auto' : 'smooth')
    firstRef.current = false
  }, [activeIndex, scrollToIndex])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const observer = new ResizeObserver(() => {
      const width = scroller.clientWidth
      if (!width) return
      scroller.scrollTo({ left: indexRef.current * width, behavior: 'auto' })
    })

    observer.observe(scroller)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const settle = () => {
      const width = scroller.clientWidth
      if (!width) return

      const index = Math.max(0, Math.min(items.length - 1, Math.round(scroller.scrollLeft / width)))
      const snapped = Math.abs(scroller.scrollLeft - index * width) < 2
      if (!snapped) return

      indexRef.current = index
      const item = items[index]
      if (item && item.key !== activeKey) onChange(item.key)
    }

    const schedule = () => {
      window.clearTimeout(settleTimerRef.current)
      settleTimerRef.current = window.setTimeout(settle, 160)
    }

    const handleScrollEnd = () => {
      window.clearTimeout(settleTimerRef.current)
      settle()
    }

    scroller.addEventListener('scroll', schedule, { passive: true })
    scroller.addEventListener('scrollend', handleScrollEnd)

    return () => {
      window.clearTimeout(settleTimerRef.current)
      scroller.removeEventListener('scroll', schedule)
      scroller.removeEventListener('scrollend', handleScrollEnd)
    }
  }, [activeKey, items, onChange])

  return (
    <div
      ref={scrollerRef}
      className={cn(
        'mobile-pager relative h-full overflow-x-auto overflow-y-hidden overscroll-x-contain',
        disabled && 'pointer-events-none'
      )}
      aria-label='主导航页面'
    >
      <div className='flex h-full'>
        {items.map((item, index) => (
          // 不要给面板加 overscroll-contain：它会吞掉横向手势，原生分页就收不到滑动。
          <section
            key={item.key}
            className='mobile-panel mobile-scroll h-full w-full shrink-0 snap-start snap-always overflow-y-auto'
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
