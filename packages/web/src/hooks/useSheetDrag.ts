import { gsap } from 'gsap'
import { useEffect, type RefObject } from 'react'
import {
  SHEET_COLLAPSED_RATIO,
  SHEET_DISMISS_THRESHOLD,
  SHEET_ENTER_EASE,
  SHEET_EXIT_EASE,
  SHEET_EXPAND_THRESHOLD,
  SHEET_SNAP_DURATION,
} from '@/lib/sheetMotion'

interface SheetDragOptions {
  isOpen: boolean
  mounted: boolean
  onRequestClose: () => void
  backdropRef: RefObject<HTMLDivElement | null>
  scrollerRef: RefObject<HTMLDivElement | null>
  /** 打开时测量的可用高度；整个打开周期内保持不变，避免滚动时抽屉忽高忽低。 */
  baseHeightRef: RefObject<number>
}

type DragMode = 'expand' | 'collapse' | 'scroll' | 'none'

const DRAG_START = 6
const CLICK_SUPPRESS = 200
const SCROLL_SAMPLE_LIMIT = 6
const MOMENTUM_DURATION = 0.45
const MIN_MOMENTUM_ELAPSED = 8
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * 底部抽屉的拖动高度与内容滚动。
 *
 * 50% 时向上拖会把剩下的高度带出来；到顶后继续向上拖直接转成内容滚动。
 * 全屏时纵向手势由这里自己接管：内容先按 1:1 滚动，
 * 滚到顶部后继续向下就无缝转成收起抽屉；收起时松手低于 25% 直接退场。
 * 不依赖浏览器原生滚动，避免 iOS / 安卓在滚动过程中取消 touch 事件、
 * 或者滚动到顶部后无法把抽屉接回手势的问题。
 *
 * 抽屉本身用 height 跟手；内容滚动用 scrollTop 跟手，松手后补一段惯性。
 * 滚动容器的 touch-action 在 SheetScaffold 里设为 none，浏览器不会抢走纵向手势。
 */
export const useSheetDrag = ({
  isOpen,
  mounted,
  onRequestClose,
  backdropRef,
  scrollerRef,
  baseHeightRef,
}: SheetDragOptions) => {
  useEffect(() => {
    if (!isOpen || !mounted) return

    const backdrop = backdropRef.current
    const dialog = backdrop?.querySelector<HTMLElement>('[data-slot="drawer-dialog"]')
    const scroller = scrollerRef.current
    if (!dialog || !scroller || !baseHeightRef.current) return

    let touchId: number | null = null
    let pointerId: number | null = null
    let startX = 0
    let startY = 0
    let dragStartY = 0
    let dragStartHeight = 0
    let scrollStartTop = 0
    let scrollStartY = 0
    let mode: DragMode = 'none'
    let active = false
    let suppressClickUntil = 0
    let samples: { t: number; top: number }[] = []

    const base = () => baseHeightRef.current
    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ratio = () => (base() ? dialog.offsetHeight / base() : SHEET_COLLAPSED_RATIO)
    const maxScroll = () => Math.max(0, scroller.scrollHeight - scroller.clientHeight)
    const isInScroller = (target: EventTarget | null) => target instanceof Node && scroller.contains(target)

    const setExpanded = (expanded: boolean) => {
      dialog.dataset.sheetExpanded = expanded ? 'true' : 'false'
    }

    const isInteractive = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR))

    const isTextInput = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('textarea, [contenteditable="true"]'))

    /**
     * 手指移动方向决定这次手势做什么：
     * 没到全屏时向上拖展开，到全屏后向上拖滚内容；
     * 内容没到顶时向下拖先滚内容，到顶后继续向下拖收起抽屉。
     * 收起没有 50% 下限，低于 25% 松手会直接退场。
     */
    const resolveTouchMode = (dy: number, inScroller: boolean): DragMode => {
      if (dy < 0) {
        return ratio() >= 0.999 ? 'scroll' : 'expand'
      }

      if (dy > 0) {
        if (inScroller && scroller.scrollTop > 1) return 'scroll'
        return 'collapse'
      }

      return 'none'
    }

    const resolvePointerMode = (dy: number): DragMode => {
      if (dy < 0 && ratio() < 0.999) return 'expand'
      if (dy > 0) return 'collapse'
      return 'none'
    }

    const beginDrag = (clientY: number, nextMode: DragMode) => {
      mode = nextMode
      active = true
      suppressClickUntil = performance.now() + CLICK_SUPPRESS

      if (nextMode === 'scroll') {
        scrollStartTop = scroller.scrollTop
        scrollStartY = clientY
        samples = [{ t: performance.now(), top: scrollStartTop }]
        return
      }

      if (nextMode === 'expand' || nextMode === 'collapse') {
        gsap.killTweensOf(dialog, 'height')
        dragStartY = clientY
        dragStartHeight = dialog.offsetHeight
        dialog.dataset.resizing = 'true'
      }
    }

    const applyHeightDrag = (clientY: number) => {
      const height = base()
      if (!height) return

      // 高度始终跟随手指：向上拖（clientY 变小）变高，向下拖（clientY 变大）变矮。
      const raw = dragStartHeight + (dragStartY - clientY)

      if (raw > height) {
        // 抽屉已经到顶，继续向上拖直接转成内容滚动，手势不中断。
        dialog.style.height = `${height}px`
        const excess = raw - height
        mode = 'scroll'
        delete dialog.dataset.resizing
        scrollStartTop = scroller.scrollTop
        scrollStartY = clientY + excess
        samples = []
        applyScrollDrag(clientY)
        // 从交接后的位置重新计时，避免把展开阶段的速度算进内容惯性。
        samples = [{ t: performance.now(), top: scroller.scrollTop }]
        return
      }

      // 允许拖到 0：低于 25% 松手时直接退场。
      dialog.style.height = `${clamp(raw, 0, height)}px`
    }

    const applyScrollDrag = (clientY: number) => {
      const desired = scrollStartTop - (clientY - scrollStartY)

      if (desired < 0) {
        // 内容已经到顶，多出来的距离直接转成抽屉收起，手势不中断。
        scroller.scrollTop = 0
        mode = 'collapse'
        dialog.dataset.resizing = 'true'
        dragStartHeight = dialog.offsetHeight
        dragStartY = clientY + desired
        applyHeightDrag(clientY)
        return
      }

      const max = maxScroll()
      if (desired > max) {
        scroller.scrollTop = max
        return
      }

      scroller.scrollTop = desired
      samples.push({ t: performance.now(), top: scroller.scrollTop })
      if (samples.length > SCROLL_SAMPLE_LIMIT) samples.shift()
    }

    const applyDrag = (clientY: number) => {
      if (!active) return
      if (mode === 'expand' || mode === 'collapse') applyHeightDrag(clientY)
      else if (mode === 'scroll') applyScrollDrag(clientY)
    }

    const finishScroll = () => {
      const first = samples[0]
      const last = samples[samples.length - 1]
      if (!first || !last || samples.length < 2) return

      const elapsed = last.t - first.t
      if (elapsed < MIN_MOMENTUM_ELAPSED) return

      const velocity = (last.top - first.top) / elapsed
      if (Math.abs(velocity) < 0.05) return

      const target = clamp(scroller.scrollTop + velocity * 180, 0, maxScroll())
      if (Math.abs(target - scroller.scrollTop) < 1) return

      gsap.to(scroller, {
        scrollTop: target,
        duration: MOMENTUM_DURATION,
        ease: 'power2.out',
        overwrite: true,
      })
    }

    const finish = () => {
      if (!active) {
        mode = 'none'
        return
      }

      const finishedMode = mode
      active = false
      mode = 'none'
      delete dialog.dataset.resizing

      // 长按拖动可能超过 200ms，按松手时间重新计算，避免拖动结束后误触。
      if (finishedMode !== 'none') suppressClickUntil = performance.now() + CLICK_SUPPRESS

      if (finishedMode === 'scroll') {
        // 滚动结束时再补安全区，避免滚动过程中顶栏高度变化。
        if (ratio() >= 0.999) setExpanded(true)
        finishScroll()
        return
      }

      if (finishedMode !== 'expand' && finishedMode !== 'collapse') return

      const height = base()
      if (!height) return

      const current = dialog.offsetHeight / height

      if (current < SHEET_DISMISS_THRESHOLD) {
        // 低于 25%：不吸附回半屏，直接从当前位置走退场动画。
        onRequestClose()
        return
      }

      const expand = current > SHEET_EXPAND_THRESHOLD
      const target = expand ? height : height * SHEET_COLLAPSED_RATIO

      // 已经在目标高度上（例如正好拖到 100%），不需要再空跑一段动画。
      if (Math.abs(dialog.offsetHeight - target) < 0.5) {
        dialog.style.height = `${target}px`
        setExpanded(expand)
        return
      }

      if (reduceMotion()) {
        dialog.style.height = `${target}px`
        setExpanded(expand)
        return
      }

      gsap.to(dialog, {
        height: target,
        duration: SHEET_SNAP_DURATION,
        ease: expand ? SHEET_ENTER_EASE : SHEET_EXIT_EASE,
        overwrite: 'auto',
        onComplete: () => {
          dialog.style.height = `${target}px`
          // 吸附结束后再切安全区，避免拖动中途顶栏高度跳变。
          setExpanded(expand)
        },
      })
    }

    const onTouchStart = (event: TouchEvent) => {
      if (active) finish()
      gsap.killTweensOf(scroller)
      samples = []

      if (event.touches.length !== 1) {
        touchId = null
        return
      }
      if (isTextInput(event.target)) {
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
        if (Math.abs(dy) < DRAG_START) return

        const nextMode = resolveTouchMode(dy, isInScroller(event.target))
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
      if (active) {
        // 拖动结束后不要补发 click，避免误触按钮或提交表单。
        event.preventDefault()
        if (touch) applyDrag(touch.clientY)
      }
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
        if (Math.abs(dy) < DRAG_START) return

        const nextMode = resolvePointerMode(dy)
        if (nextMode !== 'expand' && nextMode !== 'collapse') {
          pointerId = null
          return
        }

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

    dialog.addEventListener('touchstart', onTouchStart, { passive: true })
    dialog.addEventListener('touchmove', onTouchMove, { passive: false })
    dialog.addEventListener('touchend', onTouchEnd, { passive: false })
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
      gsap.killTweensOf(scroller)
    }
  }, [isOpen, mounted, onRequestClose, backdropRef, scrollerRef, baseHeightRef])
}
