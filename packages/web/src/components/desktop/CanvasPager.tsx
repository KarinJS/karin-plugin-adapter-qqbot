import { cn } from '@heroui/react'
import { gsap } from 'gsap'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { CANVAS_SLIDE_DURATION, CANVAS_SLIDE_EASE } from '@/lib/canvasMotion'
import { attachSmoothScroll, detachSmoothScroll } from '@/lib/smoothScroll'

export interface CanvasPage {
  key: string
  label: string
  element: ReactNode
  /**
   * 页面自己填满画布高度，内部再分区滚动。
   * 不填满的页面仍然由 section 承担整页滚动。
   */
  fill?: boolean
}

interface CanvasPagerProps {
  pages: CanvasPage[]
  activeKey: string
}

/**
 * Karin iframe 内的纵向页面画布。
 *
 * 三个页面同时挂载、纵向排在同一张轨道上，切换时整张轨道上下移动，
 * 所以翻页途中上下两页会同时出现在屏幕里，而不是一页淡出一页淡入。
 * 每个页面自己承担滚动，切换页面不会丢掉原来的滚动位置。
 */
export const CanvasPager = ({ pages, activeKey }: CanvasPagerProps) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const activeIndex = Math.max(
    0,
    pages.findIndex((page) => page.key === activeKey)
  )
  const indexRef = useRef(activeIndex)
  const firstSyncRef = useRef(true)

  useLayoutEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    if (!root || !track) return

    indexRef.current = activeIndex
    gsap.killTweensOf(track)

    const y = -activeIndex * root.clientHeight

    if (firstSyncRef.current) {
      firstSyncRef.current = false
      gsap.set(track, { y })
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(track, { y })
      return
    }

    gsap.to(track, { y, duration: CANVAS_SLIDE_DURATION, ease: CANVAS_SLIDE_EASE })
  }, [activeIndex])

  useLayoutEffect(() => {
    const root = rootRef.current
    const track = trackRef.current
    if (!root || !track) return

    // 窗口尺寸变化时按当前页重新对齐；翻页动画进行中也直接落位，避免停在半页。
    const observer = new ResizeObserver(() => {
      gsap.killTweensOf(track)
      gsap.set(track, { y: -indexRef.current * root.clientHeight })
    })

    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  // 每个画布页面都是独立滚动区，各自挂一个 Lenis；页面常驻，切页不会丢平滑状态。
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const sections = [...root.querySelectorAll<HTMLElement>('section[data-canvas-page]')]
    for (const section of sections) {
      attachSmoothScroll(section, { content: section.firstElementChild as HTMLElement | null })
    }

    return () => {
      for (const section of sections) detachSmoothScroll(section)
    }
  }, [])

  return (
    <div ref={rootRef} className='relative h-full w-full overflow-hidden' role='group' aria-label='页面画布'>
      <div ref={trackRef} className='flex h-full w-full flex-col will-change-transform'>
        {pages.map((page, index) => (
          <section
            key={page.key}
            data-canvas-page=''
            aria-label={page.label}
            aria-hidden={index !== activeIndex}
            inert={index !== activeIndex}
            className='no-scrollbar h-full w-full shrink-0 overflow-y-auto overscroll-contain'
          >
            {/*
              填满型页面（机器人工作区）在宽屏下铺满画布、不留内边距，
              列表的滚动边界就是屏幕边缘；窄屏仍保留常规页边距。
            */}
            <div
              className={cn(
                'mx-auto w-full max-w-[78rem] px-6 py-6',
                page.fill && 'h-full xl:mx-0 xl:max-w-none xl:p-0'
              )}
            >
              {page.element}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
