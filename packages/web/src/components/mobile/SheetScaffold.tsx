import { cn } from '@heroui/react'
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { EdgeBlur } from '@/components/EdgeBlur'

const EDGE_GAP = 8

interface SheetScaffoldProps {
  header: ReactNode
  footer?: ReactNode
  children: ReactNode
  contentClassName?: string
  /** 供抽屉的拖动手势读取 scrollTop。 */
  scrollerRef?: RefObject<HTMLDivElement | null>
}

/**
 * 底部抽屉的内容骨架。
 *
 * 顶栏和底栏不再铺默认底色，而是浮在滚动内容之上：
 * 内容从它们下方滚过，由三层不同半径的模糊把文字逐渐化开。
 * 只有存在底栏时才需要底部模糊，没有悬浮组件的抽屉直接省掉这一层。
 * 滚动容器的上下内边距根据顶栏/底栏的实际高度测量，避免内容被挡住。
 * 顶栏 / 底栏固定在骨架的上下边缘，抽屉高度变化时不会跟着内容滚走。
 */
export const SheetScaffold = ({ header, footer, children, contentClassName, scrollerRef }: SheetScaffoldProps) => {
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const [insets, setInsets] = useState({ top: 0, bottom: 0 })

  useLayoutEffect(() => {
    const headerNode = headerRef.current
    const footerNode = footerRef.current

    const measure = () => {
      setInsets({
        top: (headerNode?.offsetHeight ?? 0) + EDGE_GAP,
        bottom: (footerNode?.offsetHeight ?? 0) + EDGE_GAP,
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    if (headerNode) observer.observe(headerNode)
    if (footerNode) observer.observe(footerNode)

    return () => observer.disconnect()
  }, [])

  return (
    <div className='relative min-h-0 flex-1 overflow-hidden'>
      <div
        ref={scrollerRef}
        className={cn(
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden h-full overflow-y-auto overscroll-contain px-4',
          contentClassName
        )}
        // touch-action 由 useSheetDrag 按抽屉状态切换：未全屏时是 none（手势归 JS），
        // 全屏后是 pan-y（内容滚动和惯性完全交给浏览器）。
      >
        {/* 上下内边距放在内层：从展开手势交接过来的内容惯性用 transform 平移这一层，
            位移必须连内边距一起算，视觉位置才和真正写 scrollTop 一致。 */}
        <div data-sheet-content='' style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          {children}
        </div>
      </div>

      <EdgeBlur edge='top' tone='surface' rounded className='z-20' />

      <div ref={headerRef} className='absolute inset-x-0 top-0 z-30'>
        {header}
      </div>
      {footer ? (
        // 底栏和底部模糊层放在同一个容器里：抽屉收起时整体反向平移，
        // 两者一起停在屏幕底部；可见高度低于 25% 后再跟着抽屉一起滑出屏幕。
        // 平移由 useSheetDrag / useSheetMotion 直接写这个容器的 transform。
        <div ref={footerRef} data-sheet-footer='' className='absolute inset-x-0 bottom-0 z-30'>
          <EdgeBlur edge='bottom' tone='surface' className='z-0' />
          <div className='relative z-10'>{footer}</div>
        </div>
      ) : null}
    </div>
  )
}
