import { gsap } from 'gsap'
import { useEffect, type RefObject } from 'react'
import {
  SHEET_COLLAPSED_RATIO,
  SHEET_ENTER_EASE,
  SHEET_EXIT_EASE,
  SHEET_EXPAND_THRESHOLD,
  SHEET_SNAP_DURATION,
} from '@/lib/sheetMotion'

interface SheetDragOptions {
  isOpen: boolean
  mounted: boolean
  backdropRef: RefObject<HTMLDivElement | null>
  scrollerRef: RefObject<HTMLDivElement | null>
  /** 打开时测量的可用高度；整个打开周期内保持不变，避免滚动时抽屉忽高忽低。 */
  baseHeightRef: RefObject<number>
  /** 当前处于 50%（0.5）还是 100%（1），拖动中也会实时更新。 */
  ratioRef: RefObject<number>
}

const AXIS_LOCK = 8
const CLICK_SUPPRESS = 200
const INTERACTIVE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  '[role="button"]',
  '[role="switch"]',
  '[role="tab"]',
  '[contenteditable="true"]',
  '[data-slot="select-trigger"]',
  '[data-slot="switch"]',
].join(', ')

/**
 * 底部抽屉的拖动高度。
 *
 * 半屏时向上拖会把剩下的高度带出来，全屏且内容在顶部时向下拖会把抽屉压回去；
 * 松手后以 75% 为界吸附到全屏或半屏，曲线分别沿用弹出 / 退场曲线。
 *
 * 半屏时滚动容器使用 touch-action: pan-x，避免浏览器把向上的手势当成内容滚动；
 * 全屏时恢复 pan-y，内容正常滚动，只在 scrollTop 为 0 的向下手势里接管。
 */
export const useSheetDrag = ({
  isOpen,
  mounted,
  backdropRef,
  scrollerRef,
  baseHeightRef,
  ratioRef,
}: SheetDragOptions) => {
  useEffect(() => {
    if (!isOpen || !mounted) return

    const backdrop = backdropRef.current
    const dialog = backdrop?.querySelector<HTMLElement>('[data-slot="drawer-dialog"]')
    const scroller = scrollerRef.current
    if (!dialog || !scroller || !baseHeightRef.current) return

    let pointerId: number | null = null
    let touchId: number | null = null
    let startX = 0
    let startY = 0
    let dragStartY = 0
    let dragStartHeight = 0
    let mode: 'expand' | 'collapse' | null = null
    let active = false
    let suppressClickUntil = 0

    const base = () => baseHeightRef.current
    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setTouchAction = (expanded: boolean) => {
      scroller.style.touchAction = expanded ? 'pan-y' : 'pan-x'
    }

    const setExpanded = (expanded: boolean) => {
      dialog.dataset.sheetExpanded = expanded ? 'true' : 'false'
    }

    const isInteractive = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR))

    const resolveMode = (dy: number): 'expand' | 'collapse' | null => {
      if (Math.abs(dy) < AXIS_LOCK) return null

      const ratio = ratioRef.current
      if (dy < 0 && ratio < 0.999) return 'expand'
      if (dy > 0 && ratio > 0.501) {
        // 全屏且内容还没回到顶部时，向下手势先交给原生滚动。
        if (ratio >= 0.999 && scroller.scrollTop > 0) return null
        return 'collapse'
      }
      return null
    }

    const beginDrag = (clientY: number, nextMode: 'expand' | 'collapse') => {
      gsap.killTweensOf(dialog, 'height')
      mode = nextMode
      active = true
      dragStartY = clientY
      dragStartHeight = dialog.offsetHeight
      ratioRef.current = base() ? dragStartHeight / base() : SHEET_COLLAPSED_RATIO
      suppressClickUntil = performance.now() + CLICK_SUPPRESS
      dialog.dataset.resizing = 'true'
    }

    const applyDrag = (clientY: number) => {
      if (!active || !mode) return
      const height = base()
      if (!height) return

      // 高度始终跟随手指：向上拖（clientY 变小）变高，向下拖（clientY 变大）变矮。
      const delta = dragStartY - clientY
      const min = height * SHEET_COLLAPSED_RATIO
      const next = Math.max(min, Math.min(height, dragStartHeight + delta))
      ratioRef.current = next / height
      dialog.style.height = `${next}px`
      setExpanded(ratioRef.current >= 0.98)
    }

    const finish = () => {
      if (!active) {
        mode = null
        return
      }

      active = false
      mode = null
      delete dialog.dataset.resizing

      const height = base()
      if (!height) return

      const ratio = dialog.offsetHeight / height
      const expand = ratio > SHEET_EXPAND_THRESHOLD
      const target = expand ? height : height * SHEET_COLLAPSED_RATIO
      ratioRef.current = expand ? 1 : SHEET_COLLAPSED_RATIO
      setExpanded(expand)
      setTouchAction(expand)

      if (reduceMotion()) {
        dialog.style.height = `${target}px`
        return
      }

      gsap.to(dialog, {
        height: target,
        duration: SHEET_SNAP_DURATION,
        ease: expand ? SHEET_ENTER_EASE : SHEET_EXIT_EASE,
        overwrite: 'auto',
        onComplete: () => {
          dialog.style.height = `${target}px`
        },
      })
    }

    const onTouchStart = (event: TouchEvent) => {
      if (active) finish()
      if (event.touches.length !== 1) {
        touchId = null
        return
      }
      if (isInteractive(event.target)) {
        touchId = null
        return
      }

      const touch = event.touches[0]
      if (!touch) return

      touchId = touch.identifier
      startX = touch.clientX
      startY = touch.clientY
    }

    const onTouchMove = (event: TouchEvent) => {
      if (touchId === null) return
      if (event.touches.length !== 1) {
        if (active) finish()
        touchId = null
        return
      }

      const touch = event.touches[0]
      if (!touch) return

      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      if (!active) {
        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          touchId = null
          return
        }

        const nextMode = resolveMode(dy)
        if (!nextMode) return

        event.preventDefault()
        beginDrag(touch.clientY, nextMode)
        applyDrag(touch.clientY)
        return
      }

      event.preventDefault()
      applyDrag(touch.clientY)
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (touchId === null) return
      const touch = event.changedTouches[0]
      if (active && touch) applyDrag(touch.clientY)
      touchId = null
      finish()
    }

    const onTouchCancel = () => {
      if (touchId === null) return
      touchId = null
      finish()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      if (!event.isPrimary || pointerId !== null) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      if (isInteractive(event.target)) return

      pointerId = event.pointerId
      startX = event.clientX
      startY = event.clientY
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return

      const dx = event.clientX - startX
      const dy = event.clientY - startY

      if (!active) {
        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          pointerId = null
          return
        }

        const nextMode = resolveMode(dy)
        if (!nextMode) return

        event.preventDefault()
        try {
          dialog.setPointerCapture(event.pointerId)
        } catch {
          // 某些浏览器不允许在这里捕获，后续 pointermove 仍然可用。
        }
        beginDrag(event.clientY, nextMode)
        applyDrag(event.clientY)
        return
      }

      event.preventDefault()
      applyDrag(event.clientY)
    }

    const releasePointer = (id: number) => {
      try {
        if (dialog.hasPointerCapture(id)) dialog.releasePointerCapture(id)
      } catch {
        // 指针已经失效时忽略。
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      if (active) applyDrag(event.clientY)
      releasePointer(event.pointerId)
      pointerId = null
      finish()
    }

    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      releasePointer(event.pointerId)
      pointerId = null
      finish()
    }

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault()
        event.stopPropagation()
        suppressClickUntil = 0
      }
    }

    // 抽屉每次从半屏打开；先禁止滚动容器吃掉向上的手势。
    setTouchAction(false)

    dialog.addEventListener('touchstart', onTouchStart, { passive: true })
    dialog.addEventListener('touchmove', onTouchMove, { passive: false })
    dialog.addEventListener('touchend', onTouchEnd)
    dialog.addEventListener('touchcancel', onTouchCancel)
    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointermove', onPointerMove, { passive: false })
    dialog.addEventListener('pointerup', onPointerUp)
    dialog.addEventListener('pointercancel', onPointerCancel)
    dialog.addEventListener('click', onClickCapture, true)

    return () => {
      dialog.removeEventListener('touchstart', onTouchStart)
      dialog.removeEventListener('touchmove', onTouchMove)
      dialog.removeEventListener('touchend', onTouchEnd)
      dialog.removeEventListener('touchcancel', onTouchCancel)
      dialog.removeEventListener('pointerdown', onPointerDown)
      dialog.removeEventListener('pointermove', onPointerMove)
      dialog.removeEventListener('pointerup', onPointerUp)
      dialog.removeEventListener('pointercancel', onPointerCancel)
      dialog.removeEventListener('click', onClickCapture, true)
      delete dialog.dataset.resizing
      gsap.killTweensOf(dialog, 'height')
      scroller.style.touchAction = ''
    }
  }, [isOpen, mounted, backdropRef, scrollerRef, baseHeightRef, ratioRef])
}
