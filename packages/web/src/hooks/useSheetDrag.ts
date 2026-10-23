import { gsap } from 'gsap'
import { useEffect, type RefObject } from 'react'
import {
  SHEET_BACKDROP_ALPHA,
  SHEET_COLLAPSED_RATIO,
  SHEET_DISMISS_THRESHOLD,
  SHEET_ENTER_EASE,
  SHEET_EXIT_EASE,
  SHEET_EXPAND_THRESHOLD,
  SHEET_FRAME_RADIUS,
  SHEET_FRAME_SCALE,
  SHEET_FRAME_Y,
  SHEET_SNAP_DURATION,
} from '@/lib/sheetMotion'

interface SheetDragOptions {
  isOpen: boolean
  mounted: boolean
  onRequestClose: () => void
  backdropRef: RefObject<HTMLDivElement | null>
  /** 遮罩压暗层；用 opacity 复原，避免每帧重绘整块背景。 */
  scrimRef: RefObject<HTMLDivElement | null>
  scrollerRef: RefObject<HTMLDivElement | null>
  /** 打开时测量的可用高度；整个打开周期内保持不变，避免滚动时抽屉忽高忽低。 */
  baseHeightRef: RefObject<number>
  /** 松手回弹的目标高度比例；默认半屏，添加机器人使用 1（只有全屏）。 */
  collapsedRatio?: number
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
 * 滚到顶部后继续向下就无缝转成收起抽屉；收起时松手低于 25% 直接退场，
 * 其余回到 collapsedRatio 指定的高度（默认半屏，添加机器人是全屏）。
 * 可见高度低于 25% 后不再压缩抽屉，而是整体下移，底栏跟着抽屉一起滑出屏幕；
 * 背景压暗和外壳缩放也在这段距离里跟手复原。
 * 不依赖浏览器原生滚动，避免 iOS / 安卓在滚动过程中取消 touch 事件、
 * 或者滚动到顶部后无法把抽屉接回手势。
 *
 * 抽屉本身用 height 跟手；内容滚动用 scrollTop 跟手，松手后补一段惯性。
 * 滚动容器的 touch-action 在 SheetScaffold 里设为 none，浏览器不会抢走纵向手势。
 *
 * 性能约定：
 * - 触摸位置先写进 ref，每帧最多落一次 DOM，避免一帧内多次写 height 触发重排；
 * - 高度 / 滚动距离都在手势开始时量一次，拖动过程中不再读 offsetHeight、
 *   scrollHeight、clientHeight，避免强制同步布局；
 * - 25% 以上只更新外壳的 transform（合成层），不写背景色和圆角；
 *   压暗改用独立遮罩层的 opacity，圆角按整数像素降频更新。
 */
export const useSheetDrag = ({
  isOpen,
  mounted,
  onRequestClose,
  backdropRef,
  scrimRef,
  scrollerRef,
  baseHeightRef,
  collapsedRatio = SHEET_COLLAPSED_RATIO,
}: SheetDragOptions) => {
  useEffect(() => {
    if (!isOpen || !mounted) return

    const backdrop = backdropRef.current
    const scrim = scrimRef.current
    const dialog = backdrop?.querySelector<HTMLElement>('[data-slot="drawer-dialog"]')
    const scroller = scrollerRef.current
    if (!dialog || !scroller || !baseHeightRef.current) return

    // 背景缩放和压暗由 useSheetMotion 驱动，拖到 25% 以下时改由这里跟手复原。
    const frame = document.querySelector<HTMLElement>('.mobile-frame')

    let touchId: number | null = null
    let pointerId: number | null = null
    let startX = 0
    let startY = 0
    let dragStartY = 0
    let dragStartHeight = 0
    let dragOffsetY = 0
    let scrollStartTop = 0
    let scrollStartY = 0
    let maxScrollCache = 0
    let mode: DragMode = 'none'
    let active = false
    let suppressClickUntil = 0
    let samples: { t: number; top: number }[] = []

    // 跟手高度与滚动距离只量一次，拖动期间不再读布局。
    let visibleHeight = 0
    let measured = false
    let lastHeight = -1
    let lastRestore = -1
    let lastRadius = -1
    let snapTween: gsap.core.Tween | null = null

    // 每帧最多应用一次触摸位置；touchend 时同步冲刷最后一帧。
    let pendingY: number | null = null
    let frameId = 0

    const base = () => baseHeightRef.current
    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isInScroller = (target: EventTarget | null) => target instanceof Node && scroller.contains(target)
    const motionEase = gsap.parseEase(SHEET_ENTER_EASE)

    const measureVisible = () => {
      if (!measured) {
        measured = true
        visibleHeight = dialog.offsetHeight
      }
      return visibleHeight
    }

    const ratio = () => (base() ? measureVisible() / base() : collapsedRatio)

    const setExpanded = (expanded: boolean) => {
      dialog.dataset.sheetExpanded = expanded ? 'true' : 'false'
    }

    const isInteractive = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR))

    const isTextInput = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('textarea, [contenteditable="true"]'))

    /**
     * 抽屉被拖到 25% 以下时，压暗和外壳缩放不再停在打开时的状态，
     * 而是跟着手指一起复原：可见高度越小，背景越亮、外壳越接近原始尺寸。
     * 进度套用与进场 / 退场相同的 power3.out 曲线。
     *
     * 压暗用独立遮罩层的 opacity，属于合成属性；外壳只写 scale / y。
     * 圆角是重绘属性，按整数像素降频更新，避免每帧重绘整块外壳。
     */
    const applyBackdropRestore = (visible: number) => {
      const height = base()
      if (!height) return

      const threshold = height * SHEET_DISMISS_THRESHOLD
      if (threshold <= 0) return

      const restore = clamp((threshold - visible) / threshold, 0, 1)
      const progress = restore <= 0 ? 0 : restore >= 1 ? 1 : motionEase(restore)
      if (progress === lastRestore) return
      lastRestore = progress

      if (scrim) gsap.set(scrim, { opacity: SHEET_BACKDROP_ALPHA * (1 - progress) })

      if (!frame) return

      gsap.set(frame, {
        scale: SHEET_FRAME_SCALE + (1 - SHEET_FRAME_SCALE) * progress,
        y: SHEET_FRAME_Y * (1 - progress),
      })

      const radius = Math.round(SHEET_FRAME_RADIUS * (1 - progress))
      if (radius !== lastRadius) {
        lastRadius = radius
        gsap.set(frame, { borderRadius: radius })
      }
    }

    /**
     * 手指移动方向决定这次手势做什么：
     * 没到全屏时向上拖展开，到全屏后向上拖滚内容；
     * 内容没到顶时向下拖先滚内容，到顶后继续向下拖收起抽屉。
     * 收起没有半屏下限，低于 25% 松手会直接退场。
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

    const cancelPending = () => {
      if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = 0
      }
      pendingY = null
    }

    const setDialogHeight = (next: number) => {
      const rounded = Math.round(next)
      if (rounded !== lastHeight) {
        lastHeight = rounded
        dialog.style.height = `${rounded}px`
      }
      measured = true
      return rounded
    }

    const beginDrag = (clientY: number, nextMode: DragMode) => {
      mode = nextMode
      active = true
      suppressClickUntil = performance.now() + CLICK_SUPPRESS

      // 上一次吸附还没结束就被重新抓住时，整段 tween 都要停掉：
      // 只杀 height 会让 y 继续跑完并把高度写回旧目标。
      snapTween?.kill()
      snapTween = null
      delete dialog.dataset.snapping

      if (nextMode === 'scroll') {
        scrollStartTop = scroller.scrollTop
        scrollStartY = clientY
        maxScrollCache = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
        visibleHeight = base()
        measured = true
        samples = [{ t: performance.now(), top: scrollStartTop }]
        return
      }

      if (nextMode === 'expand' || nextMode === 'collapse') {
        gsap.killTweensOf(dialog, 'height')
        // 进入动画可能还没跑完；先停掉背景动画，拖动期间由 applyBackdropRestore 接管。
        gsap.killTweensOf(backdrop)
        if (scrim) gsap.killTweensOf(scrim)
        if (frame) gsap.killTweensOf(frame)
        dragStartY = clientY
        dragStartHeight = measureVisible()
        lastHeight = Math.round(dragStartHeight)
        dragOffsetY = 0
        lastRestore = -1
        lastRadius = -1
        dialog.dataset.resizing = 'true'
      }
    }

    const resetOffset = () => {
      if (dragOffsetY === 0) return
      dragOffsetY = 0
      gsap.set(dialog, { y: 0 })
    }

    const applyHeightDrag = (clientY: number) => {
      const height = base()
      if (!height) return

      // 高度始终跟随手指：向上拖（clientY 变小）变高，向下拖（clientY 变大）变矮。
      const rawHeight = dragStartHeight + (dragStartY - clientY)

      if (rawHeight > height) {
        // 抽屉已经到顶，继续向上拖直接转成内容滚动，手势不中断。
        resetOffset()
        visibleHeight = setDialogHeight(height)
        applyBackdropRestore(visibleHeight)
        const excess = rawHeight - height
        mode = 'scroll'
        delete dialog.dataset.resizing
        scrollStartTop = scroller.scrollTop
        maxScrollCache = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
        scrollStartY = clientY + excess
        samples = []
        applyScrollDrag(clientY)
        // 从交接后的位置重新计时，避免把展开阶段的速度算进内容惯性。
        samples = [{ t: performance.now(), top: scroller.scrollTop }]
        return
      }

      // 拖到 0 就完全离开屏幕；继续往下拖不再增加位移，
      // 否则退场动画的目标会比当前位置更高，抽屉会先弹回来一截。
      const raw = clamp(rawHeight, 0, height)
      const dismissHeight = height * SHEET_DISMISS_THRESHOLD

      if (raw < dismissHeight) {
        // 25% 以下不再继续压缩高度，而是把整个抽屉往下带：
        // 底栏跟着抽屉一起滑出屏幕，而不是钉在屏幕底部。
        gsap.killTweensOf(dialog, 'y')
        const applied = setDialogHeight(dismissHeight)
        dragOffsetY = applied - raw
        gsap.set(dialog, { y: dragOffsetY })
        visibleHeight = raw
      } else {
        resetOffset()
        visibleHeight = setDialogHeight(raw)
      }

      applyBackdropRestore(visibleHeight)
    }

    const applyScrollDrag = (clientY: number) => {
      const desired = scrollStartTop - (clientY - scrollStartY)

      if (desired < 0) {
        // 内容已经到顶，多出来的距离直接转成抽屉收起，手势不中断。
        scroller.scrollTop = 0
        mode = 'collapse'
        dialog.dataset.resizing = 'true'
        visibleHeight = base()
        measured = true
        dragStartHeight = visibleHeight
        lastHeight = Math.round(visibleHeight)
        dragStartY = clientY + desired
        applyHeightDrag(clientY)
        return
      }

      if (desired > maxScrollCache) {
        scroller.scrollTop = maxScrollCache
        return
      }

      scroller.scrollTop = desired
      samples.push({ t: performance.now(), top: desired })
      if (samples.length > SCROLL_SAMPLE_LIMIT) samples.shift()
    }

    const applyDrag = (clientY: number) => {
      if (!active) return
      if (mode === 'expand' || mode === 'collapse') applyHeightDrag(clientY)
      else if (mode === 'scroll') applyScrollDrag(clientY)
    }

    const applyPending = () => {
      frameId = 0
      if (pendingY === null) return
      const clientY = pendingY
      pendingY = null
      applyDrag(clientY)
    }

    const scheduleDrag = (clientY: number) => {
      pendingY = clientY
      if (frameId) return
      frameId = requestAnimationFrame(applyPending)
    }

    const flushDrag = (clientY?: number) => {
      if (frameId) {
        cancelAnimationFrame(frameId)
        frameId = 0
      }
      const next = clientY ?? pendingY
      pendingY = null
      if (next !== null && next !== undefined) applyDrag(next)
    }

    const finishScroll = () => {
      const first = samples[0]
      const last = samples[samples.length - 1]
      if (!first || !last || samples.length < 2) return

      const elapsed = last.t - first.t
      if (elapsed < MIN_MOMENTUM_ELAPSED) return

      const velocity = (last.top - first.top) / elapsed
      if (Math.abs(velocity) < 0.05) return

      const target = clamp(scroller.scrollTop + velocity * 180, 0, maxScrollCache)
      if (Math.abs(target - scroller.scrollTop) < 1) return

      gsap.to(scroller, {
        scrollTop: target,
        duration: MOMENTUM_DURATION,
        ease: 'power2.out',
        overwrite: true,
      })
    }

    const finish = () => {
      cancelPending()

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

      // 25% 以下抽屉是整体下移的，可见高度要减去位移。
      const current = visibleHeight / height

      if (current < SHEET_DISMISS_THRESHOLD) {
        // 低于 25%：不吸附回半屏，直接从当前位置走退场动画。
        onRequestClose()
        return
      }

      // 回到目标高度时抽屉必须完全落回屏幕底部。
      dragOffsetY = 0

      const expand = current > SHEET_EXPAND_THRESHOLD
      const target = collapsedRatio >= 0.999 ? height : expand ? height : height * collapsedRatio
      const expanded = target >= height - 0.5

      // 已经在目标高度上（例如正好拖到 100%），不需要再空跑一段动画。
      if (Math.abs(visibleHeight - target) < 0.5) {
        visibleHeight = setDialogHeight(target)
        gsap.set(dialog, { y: 0 })
        setExpanded(expanded)
        return
      }

      if (reduceMotion()) {
        visibleHeight = setDialogHeight(target)
        gsap.set(dialog, { y: 0 })
        setExpanded(expanded)
        return
      }

      // 吸附期间顶边仍在移动，先关掉顶部模糊和阴影；结束后恢复。
      dialog.dataset.snapping = 'true'
      snapTween = gsap.to(dialog, {
        height: target,
        y: 0,
        duration: SHEET_SNAP_DURATION,
        ease: expanded ? SHEET_ENTER_EASE : SHEET_EXIT_EASE,
        overwrite: 'auto',
        onComplete: () => {
          snapTween = null
          dialog.style.height = `${target}px`
          lastHeight = Math.round(target)
          visibleHeight = target
          measured = true
          delete dialog.dataset.snapping
          // 吸附结束后再切安全区，避免拖动中途顶栏高度跳变。
          setExpanded(expanded)
        },
      })
    }

    const onTouchStart = (event: TouchEvent) => {
      cancelPending()
      if (active) finish()
      gsap.killTweensOf(scroller)
      samples = []
      measured = false

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
        cancelPending()
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
      scheduleDrag(touch.clientY)
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (touchId === null) return
      const touch = event.changedTouches[0]
      if (active) {
        // 拖动结束后不要补发 click，避免误触按钮或提交表单。
        event.preventDefault()
        flushDrag(touch?.clientY)
      }
      touchId = null
      finish()
    }

    const onTouchCancel = () => {
      if (touchId === null) return
      touchId = null
      cancelPending()
      finish()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      if (!event.isPrimary || pointerId !== null) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      if (isInteractive(event.target)) return

      cancelPending()
      measured = false
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
      scheduleDrag(event.clientY)
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
      if (active) flushDrag(event.clientY)
      releasePointer(event.pointerId)
      pointerId = null
      finish()
    }

    const onPointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      cancelPending()
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
      cancelPending()
      snapTween?.kill()
      snapTween = null
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
      delete dialog.dataset.snapping
      gsap.killTweensOf(dialog, 'height')
      gsap.killTweensOf(scroller)
    }
  }, [isOpen, mounted, onRequestClose, backdropRef, scrimRef, scrollerRef, baseHeightRef, collapsedRatio])
}
