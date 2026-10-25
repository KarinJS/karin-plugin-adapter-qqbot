import { Drawer } from '@heroui/react'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { SheetScaffold } from '@/components/mobile/SheetScaffold'
import { mobileSheetBackdropStyle, mobileSheetStyle } from '@/components/mobile/mobileStyles'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import { useSheetMotion } from '@/hooks/useSheetMotion'
import { syncSheetChrome } from '@/lib/sheetChrome'
import { SHEET_COLLAPSED_RATIO } from '@/lib/sheetMotion'

interface MobileSheetProps {
  isOpen: boolean
  onRequestClose: () => void
  onExited?: () => void
  header: ReactNode
  footer?: ReactNode
  children: ReactNode
  /** 打开时的初始高度比例，默认半屏。 */
  initialRatio?: number
  /** 松手回弹的目标高度比例，默认半屏；设为 1 时只有全屏和退场。 */
  collapsedRatio?: number
}

/**
 * 手机端底部抽屉的共用外壳。
 *
 * 打开时默认只占可用高度的 50%（initialRatio 可覆盖），向上拖动带出剩余高度；
 * 超过 75% 吸附到全屏，低于 25% 松手直接退场；全屏（或接近全屏）时快速下扫也直接退场，
 * 其余回到 collapsedRatio 指定的高度。
 * 全屏且停稳后表单滚动交给浏览器原生处理，惯性不再经过主线程；
 * 从半屏一拖到全屏后不松手继续上拖，会接着滚内容（跟手阶段用 JS 写 scrollTop，
 * 松手后用 WAAPI 平移内容层做惯性）；内容到顶后继续向下拖会收起抽屉。
 * 抽屉高度在整个打开周期内用打开瞬间测量的像素值，不跟随 dvh / 地址栏变化；
 * 但输入法弹出时视觉视口会变矮，此时跟着抽屉容器临时改高度并铺满可见区域，
 * 否则固定高度的 dialog 会被顶出屏幕上方，半屏也会被键盘压得只剩顶栏和底栏。
 */
export const MobileSheet = ({
  isOpen,
  onRequestClose,
  onExited,
  header,
  footer,
  children,
  initialRatio = SHEET_COLLAPSED_RATIO,
  collapsedRatio = SHEET_COLLAPSED_RATIO,
}: MobileSheetProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const baseHeightRef = useRef(0)

  const prepareHeight = useCallback(
    (dialog: HTMLElement) => {
      const content = dialog.closest<HTMLElement>('[data-slot="drawer-content"]')
      const viewport = window.visualViewport?.height ?? window.innerHeight
      const base = Math.max(1, content?.clientHeight || viewport)
      const ratio = Math.min(1, Math.max(0, initialRatio))
      const height = Math.max(1, Math.round(base * ratio))

      baseHeightRef.current = base
      // dialog 始终是完整可用高度，收起时整体向下平移；
      // 平移量存下来，进场动画不用重新量布局。
      dialog.style.height = `${base}px`
      dialog.style.maxHeight = `${base}px`
      dialog.dataset.sheetRestY = String(base - height)
      // 直接以全屏打开时，顶栏一开始就要让开刘海。
      if (ratio >= 0.999) dialog.dataset.sheetExpanded = 'true'
      else delete dialog.dataset.sheetExpanded
      syncSheetChrome(dialog)
    },
    [initialRatio]
  )

  const handleExited = useCallback(() => {
    baseHeightRef.current = 0
    onExited?.()
  }, [onExited])

  const { backdropRef, mounted, handleOpenChange, takeOverMotion, stopBackdropMotion } = useSheetMotion({
    isOpen,
    onRequestClose,
    onExited: handleExited,
    beforeEnter: prepareHeight,
    scrimRef,
  })

  useSheetDrag({
    isOpen,
    mounted,
    onRequestClose,
    backdropRef,
    scrimRef,
    scrollerRef,
    baseHeightRef,
    takeOverMotion,
    stopBackdropMotion,
    collapsedRatio,
  })

  // HeroUI 的 outside dismiss 会把 Select 的 portal 弹层当成“抽屉外部”，
  // 在 iOS 上打开下拉框时偶发关闭整个抽屉；这里关掉内置 dismiss，只保留点遮罩关闭。
  useEffect(() => {
    if (!mounted) return

    const backdrop = backdropRef.current
    if (!backdrop) return

    const handleClick = (event: MouseEvent) => {
      if (event.target === backdrop) onRequestClose()
    }

    backdrop.addEventListener('click', handleClick)
    return () => backdrop.removeEventListener('click', handleClick)
  }, [mounted, onRequestClose, backdropRef])

  return (
    <Drawer.Backdrop
      ref={backdropRef}
      // 用逻辑开关而不是 mounted：关闭时让 React Aria 立即解除背景 inert，
      // 再用 isExiting 把 DOM 留到退场动画结束。
      isOpen={isOpen}
      isExiting={mounted && !isOpen}
      onOpenChange={handleOpenChange}
      isDismissable={false}
      isKeyboardDismissDisabled
      style={mobileSheetBackdropStyle}
    >
      {/* 压暗层和抽屉是兄弟节点：只动 opacity 就能淡入淡出，不会把抽屉一起淡掉。 */}
      <div
        ref={scrimRef}
        aria-hidden='true'
        data-sheet-scrim=''
        className='pointer-events-none fixed inset-0 bg-black'
        style={{ opacity: 0 }}
      />
      {/* 键盘弹出时抽屉只铺到视觉视口底部，Safari 的浮动表单栏会在这和键盘之间
          露出底下的页面；补一块抽屉底色，看起来像抽屉一直延伸到键盘下面。
          由 useSheetDrag 在键盘模式下取消 hidden。 */}
      <div
        aria-hidden='true'
        data-sheet-bleed=''
        hidden
        className='pointer-events-none fixed inset-x-0 h-32 bg-surface'
        style={{ top: 'var(--visual-viewport-height)' }}
      />
      <Drawer.Content placement='bottom'>
        <Drawer.Dialog
          className='flex flex-col overflow-hidden border border-border/60 bg-surface shadow-none will-change-transform'
          style={mobileSheetStyle}
        >
          <SheetScaffold scrollerRef={scrollerRef} header={header} footer={footer}>
            {children}
          </SheetScaffold>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}
