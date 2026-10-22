import { gsap } from 'gsap'
import { useLayoutEffect, useRef, useState } from 'react'
import { SHEET_ENTER_DURATION, SHEET_ENTER_EASE, SHEET_EXIT_DURATION, SHEET_EXIT_EASE } from '@/lib/sheetMotion'

interface SheetMotionOptions {
  isOpen: boolean
  onRequestClose: () => void
  /** 抽屉完全退出、即将卸载时触发；用于衔接移除机器人这类后续动画。 */
  onExited?: () => void
  /** 进入动画开始前执行，用来把 dialog 设到本次打开的初始高度。 */
  beforeEnter?: (dialog: HTMLElement) => void
}

/**
 * 底部抽屉的进入 / 退出动画。
 *
 * 进入时遮罩直接到位、抽屉以 100% 不透明度从底部滑上来，不做透明度渐变；
 * 退出沿同一条路径滑回去，结束后再卸载。
 * 动画直接驱动 dialog 的 transform，不依赖 HeroUI 的 data-entering。
 */
export const useSheetMotion = ({ isOpen, onRequestClose, onExited, beforeEnter }: SheetMotionOptions) => {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(isOpen)
  const closingRef = useRef(false)
  const onExitedRef = useRef(onExited)
  const beforeEnterRef = useRef(beforeEnter)

  useLayoutEffect(() => {
    onExitedRef.current = onExited
    beforeEnterRef.current = beforeEnter
  }, [onExited, beforeEnter])

  useLayoutEffect(() => {
    if (!isOpen) return
    closingRef.current = false
    setMounted(true)
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen || !mounted) return

    const backdrop = backdropRef.current
    const dialog = backdrop?.querySelector<HTMLElement>('[data-slot="drawer-dialog"]')
    if (!backdrop || !dialog) return

    gsap.killTweensOf([backdrop, dialog])
    gsap.set(backdrop, { opacity: 1 })
    // 先确定本次打开的高度，再读取 offsetHeight 作为滑入距离。
    beforeEnterRef.current?.(dialog)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(dialog, { y: 0 })
      return
    }

    gsap.fromTo(dialog, { y: dialog.offsetHeight }, { y: 0, duration: SHEET_ENTER_DURATION, ease: SHEET_ENTER_EASE })

    return () => {
      gsap.killTweensOf([backdrop, dialog])
    }
  }, [isOpen, mounted])

  useLayoutEffect(() => {
    if (isOpen || !mounted || closingRef.current) return
    closingRef.current = true

    const backdrop = backdropRef.current
    const dialog = backdrop?.querySelector<HTMLElement>('[data-slot="drawer-dialog"]')
    if (!backdrop || !dialog) {
      setMounted(false)
      closingRef.current = false
      onExitedRef.current?.()
      return
    }

    gsap.killTweensOf([backdrop, dialog])

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMounted(false)
      closingRef.current = false
      onExitedRef.current?.()
      return
    }

    gsap.to(dialog, {
      y: dialog.offsetHeight,
      duration: SHEET_EXIT_DURATION,
      ease: SHEET_EXIT_EASE,
      onComplete: () => {
        setMounted(false)
        closingRef.current = false
        onExitedRef.current?.()
      },
    })

    return () => {
      gsap.killTweensOf([backdrop, dialog])
    }
  }, [isOpen, mounted])

  return {
    backdropRef,
    mounted,
    handleOpenChange: (next: boolean) => {
      if (!next) onRequestClose()
    },
  }
}
