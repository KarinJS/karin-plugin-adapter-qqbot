import { Drawer } from '@heroui/react'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { SheetScaffold } from '@/components/mobile/SheetScaffold'
import { mobileSheetBackdropStyle, mobileSheetStyle } from '@/components/mobile/mobileStyles'
import { useSheetDrag } from '@/hooks/useSheetDrag'
import { useSheetMotion } from '@/hooks/useSheetMotion'
import { SHEET_COLLAPSED_RATIO } from '@/lib/sheetMotion'

interface MobileSheetProps {
  isOpen: boolean
  onRequestClose: () => void
  onExited?: () => void
  header: ReactNode
  footer?: ReactNode
  children: ReactNode
}

/**
 * 手机端底部抽屉的共用外壳。
 *
 * 打开时默认只占可用高度的 50%，向上拖动带出剩余高度；
 * 超过 75% 吸附到全屏，低于 25% 松手直接退场，其余回到半屏。
 * 全屏后继续向上拖会接着滚动表单，内容到顶后向下拖会收起抽屉。
 * 抽屉高度在整个打开周期内用打开瞬间测量的像素值，不跟随 dvh / 地址栏变化。
 */
export const MobileSheet = ({ isOpen, onRequestClose, onExited, header, footer, children }: MobileSheetProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const baseHeightRef = useRef(0)

  const prepareHeight = useCallback((dialog: HTMLElement) => {
    const content = dialog.closest<HTMLElement>('[data-slot="drawer-content"]')
    const viewport = window.visualViewport?.height ?? window.innerHeight
    const base = Math.max(1, content?.clientHeight || viewport)
    const height = Math.max(1, Math.round(base * SHEET_COLLAPSED_RATIO))

    baseHeightRef.current = base
    dialog.style.height = `${height}px`
    dialog.style.maxHeight = `${base}px`
    delete dialog.dataset.sheetExpanded
  }, [])

  const handleExited = useCallback(() => {
    baseHeightRef.current = 0
    onExited?.()
  }, [onExited])

  const { backdropRef, mounted, handleOpenChange } = useSheetMotion({
    isOpen,
    onRequestClose,
    onExited: handleExited,
    beforeEnter: prepareHeight,
  })

  useSheetDrag({
    isOpen,
    mounted,
    onRequestClose,
    backdropRef,
    scrollerRef,
    baseHeightRef,
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
      isOpen={mounted}
      onOpenChange={handleOpenChange}
      isDismissable={false}
      isKeyboardDismissDisabled
      style={mobileSheetBackdropStyle}
    >
      <Drawer.Content placement='bottom'>
        <Drawer.Dialog
          className='flex flex-col overflow-hidden border border-border/60 bg-surface shadow-overlay'
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
