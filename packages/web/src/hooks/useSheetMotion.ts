import { gsap } from 'gsap'
import { useLayoutEffect, useRef, useState } from 'react'

interface SheetMotionOptions {
  isOpen: boolean
  onRequestClose: () => void
  /** 抽屉完全退出、即将卸载时触发；用于衔接移除机器人这类后续动画。 */
  onExited?: () => void
}

/**
 * 底部抽屉的进入 / 退出动画。
 *
 * 进入时遮罩直接到位、抽屉以 100% 不透明度从底部滑上来，不做透明度渐变；
 * 退出沿同一条路径滑回去，结束后再卸载。
 * 动画直接驱动 dialog 的 transform，不依赖 HeroUI 的 data-entering。
 */
export const useSheetMotion = ({ isOpen, onRequestClose, onExited }: SheetMotionOptions) => {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(isOpen)
  const closingRef = useRef(false)
  const onExitedRef = useRef(onExited)

  useLayoutEffect(() => {
    onExitedRef.current = onExited
  }, [onExited])

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

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(dialog, { y: 0 })
      return
    }

    gsap.fromTo(dialog, { y: dialog.offsetHeight }, { y: 0, duration: 0.42, ease: 'power3.out' })

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
      duration: 0.28,
      ease: 'power2.in',
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
