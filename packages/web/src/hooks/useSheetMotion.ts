import { gsap } from 'gsap'
import { useLayoutEffect, useRef, useState } from 'react'

interface SheetMotionOptions {
  isOpen: boolean
  onRequestClose: () => void
}

/**
 * 底部抽屉的进入 / 退出动画。
 *
 * HeroUI 的抽屉依赖 content 上的 data-entering，但当前版本里 dialog 不会滑入，
 * 所以这里直接驱动 dialog 的 transform：进入用强 ease-out（先快后慢），
 * 退出用 ease-in；关闭时先保留抽屉挂载，等退出动画结束再卸载。
 */
export const useSheetMotion = ({ isOpen, onRequestClose }: SheetMotionOptions) => {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(isOpen)
  const closingRef = useRef(false)

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

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(dialog, { y: 0 })
      gsap.set(backdrop, { opacity: 1 })
      return
    }

    gsap.set(backdrop, { opacity: 0 })
    gsap.fromTo(dialog, { y: dialog.offsetHeight }, { y: 0, duration: 0.42, ease: 'power3.out' })
    gsap.to(backdrop, { opacity: 1, duration: 0.3, ease: 'power2.out' })

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
      return
    }

    gsap.killTweensOf([backdrop, dialog])

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMounted(false)
      closingRef.current = false
      return
    }

    gsap.to(dialog, {
      y: dialog.offsetHeight,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => {
        setMounted(false)
        closingRef.current = false
      },
    })
    gsap.to(backdrop, { opacity: 0, duration: 0.24, ease: 'power2.in' })

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
