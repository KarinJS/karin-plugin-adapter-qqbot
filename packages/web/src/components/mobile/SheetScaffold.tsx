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
        // 纵向滚动由 useSheetDrag 通过 scrollTop 驱动，关掉原生手势，
        // 避免 iOS / 安卓在滚动开始后抢走 touch 事件。
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom, touchAction: 'none' }}
      >
        {children}
      </div>

      <EdgeBlur
        edge='top'
        tone='surface'
        rounded
        className='z-20'
        layerClassName='group-data-[resizing=true]:hidden group-data-[snapping=true]:hidden'
      />
      {footer ? <EdgeBlur edge='bottom' tone='surface' className='z-20' /> : null}

      <div ref={headerRef} className='absolute inset-x-0 top-0 z-30'>
        {header}
      </div>
      {footer ? (
        <div ref={footerRef} className='absolute inset-x-0 bottom-0 z-30'>
          {footer}
        </div>
      ) : null}
    </div>
  )
}
