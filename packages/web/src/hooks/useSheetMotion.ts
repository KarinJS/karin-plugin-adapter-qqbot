import { gsap } from 'gsap'
import { useLayoutEffect, useRef, useState } from 'react'
import {
  SHEET_BACKDROP_COLOR,
  SHEET_BACKDROP_COLOR_CLEAR,
  SHEET_ENTER_DURATION,
  SHEET_ENTER_EASE,
  SHEET_EXIT_DURATION,
  SHEET_EXIT_EASE,
  SHEET_FRAME_RADIUS,
  SHEET_FRAME_SCALE,
  SHEET_FRAME_Y,
} from '@/lib/sheetMotion'

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
 * 进入时抽屉以 100% 不透明度从底部滑上来，不做透明度渐变；
 * 背后的压暗用背景色的 alpha 跟随抽屉一起变化，避免连抽屉一起淡入。
 * 退场沿同一条路径滑回去，结束后再卸载。
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

    // 外壳和抽屉用同一组 GSAP 参数、同一帧开始，缩放不会比抽屉慢半拍。
    const frame = document.querySelector<HTMLElement>('.mobile-frame')

    gsap.killTweensOf([backdrop, dialog])
    if (frame) gsap.killTweensOf(frame)
    gsap.set(backdrop, { opacity: 1 })
    // 先确定本次打开的高度，再读取 offsetHeight 作为滑入距离。
    beforeEnterRef.current?.(dialog)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(backdrop, { backgroundColor: SHEET_BACKDROP_COLOR })
      gsap.set(dialog, { y: 0 })
      if (frame) gsap.set(frame, { scale: SHEET_FRAME_SCALE, y: SHEET_FRAME_Y, borderRadius: SHEET_FRAME_RADIUS })
      return
    }

    // 压暗和外壳缩放、抽屉滑入同时开始，使用同一组时长与曲线。
    gsap.fromTo(
      backdrop,
      { backgroundColor: SHEET_BACKDROP_COLOR_CLEAR },
      { backgroundColor: SHEET_BACKDROP_COLOR, duration: SHEET_ENTER_DURATION, ease: SHEET_ENTER_EASE }
    )
    gsap.fromTo(dialog, { y: dialog.offsetHeight }, { y: 0, duration: SHEET_ENTER_DURATION, ease: SHEET_ENTER_EASE })
    if (frame) {
      gsap.to(frame, {
        scale: SHEET_FRAME_SCALE,
        y: SHEET_FRAME_Y,
        borderRadius: SHEET_FRAME_RADIUS,
        duration: SHEET_ENTER_DURATION,
        ease: SHEET_ENTER_EASE,
        overwrite: 'auto',
      })
    }

    return () => {
      gsap.killTweensOf([backdrop, dialog])
      if (frame) gsap.killTweensOf(frame)
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

    const frame = document.querySelector<HTMLElement>('.mobile-frame')

    gsap.killTweensOf([backdrop, dialog])
    if (frame) gsap.killTweensOf(frame)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(backdrop, { backgroundColor: SHEET_BACKDROP_COLOR_CLEAR })
      if (frame) gsap.set(frame, { scale: 1, y: 0, borderRadius: 0 })
      setMounted(false)
      closingRef.current = false
      onExitedRef.current?.()
      return
    }

    gsap.to(backdrop, {
      backgroundColor: SHEET_BACKDROP_COLOR_CLEAR,
      duration: SHEET_EXIT_DURATION,
      ease: SHEET_EXIT_EASE,
    })
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
    if (frame) {
      gsap.to(frame, {
        scale: 1,
        y: 0,
        borderRadius: 0,
        duration: SHEET_EXIT_DURATION,
        ease: SHEET_EXIT_EASE,
        overwrite: 'auto',
      })
    }

    return () => {
      gsap.killTweensOf([backdrop, dialog])
      if (frame) gsap.killTweensOf(frame)
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
