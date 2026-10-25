import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  SHEET_BACKDROP_ALPHA,
  SHEET_ENTER_DURATION,
  SHEET_EXIT_DURATION,
  SHEET_FRAME_SCALE,
  SHEET_FRAME_Y,
} from '@/lib/sheetMotion'
import { animateProgress, EASE_POWER3_OUT, readScale, readTranslate } from '@/lib/waapi'

interface SheetMotionOptions {
  isOpen: boolean
  onRequestClose: () => void
  /** 抽屉完全退出、即将卸载时触发；用于衔接移除机器人这类后续动画。 */
  onExited?: () => void
  /** 进入动画开始前执行，用来把 dialog 设到本次打开的位置。 */
  beforeEnter?: (dialog: HTMLElement) => void
  /** 独立的压暗层；只动它的 opacity，避免整块遮罩背景每帧重绘。 */
  scrimRef: RefObject<HTMLDivElement | null>
}

interface SheetState {
  y: number
  footerY: number
  opacity: number
  frameScale: number
  frameY: number
}

/**
 * 可见高度低于 25% 后，底栏不再钉在屏幕底部，而是跟着抽屉一起滑出屏幕。
 * 这个比例和 SHEET_DISMISS_THRESHOLD 互补。
 */
const FOOTER_FLOOR = 0.75

/**
 * 拖动在进场动画中途接管时，背景（外壳缩放 / 压暗）从当前值补到打开状态的时长。
 * 直接写最终值会让整块背景在一帧内跳变，看起来像背景跟着手指反方向动了一下。
 */
const BACKDROP_SETTLE_DURATION = 0.24

const footerYFor = (y: number, base: number) => -Math.min(y, base * FOOTER_FLOOR)

const readState = (
  dialog: HTMLElement,
  footer: HTMLElement | null,
  scrim: HTMLElement | null,
  frame: HTMLElement | null
): SheetState => ({
  y: readTranslate(dialog),
  footerY: readTranslate(footer),
  opacity: scrim ? Number(getComputedStyle(scrim).opacity) : 0,
  frameScale: frame ? readScale(frame) : 1,
  frameY: frame ? readTranslate(frame) : 0,
})

const commitState = (
  dialog: HTMLElement,
  footer: HTMLElement | null,
  scrim: HTMLElement | null,
  frame: HTMLElement | null,
  state: SheetState
) => {
  dialog.style.transform = `translate3d(0, ${state.y}px, 0)`
  if (footer) footer.style.transform = `translate3d(0, ${state.footerY}px, 0)`
  if (scrim) scrim.style.opacity = String(state.opacity)
  if (frame) frame.style.transform = `translate3d(0, ${state.frameY}px, 0) scale(${state.frameScale})`
}

/**
 * 底部抽屉的进入 / 退出动画。
 *
 * 动画全部交给 WAAPI：dialog 只做整块 translate3d，底栏容器做反向位移，
 * 两者都是合成属性，由合成器逐帧驱动，主线程掉帧不会让动画一格一格。
 * 之前用 GSAP 每帧改 dialog 的 height，每帧都要重排整棵抽屉子树，
 * 松手后的吸附和进出场因此在手机上明显比原生滚动卡。
 *
 * 抽屉的 dialog 高度始终是可用高度 base，收起时整体向下平移 y = base - 可见高度，
 * 底栏和底部模糊层反向平移 -min(y, 0.75 * base)，所以可见内容和原来的高度模型一致。
 *
 * 可打断性：
 * - 进入动画没跑完就请求关闭时，直接从当前 y 反向滑出，不排队；
 * - 退场动画没跑完就再次打开时，从当前 y 反向滑回，不跳回底部重播；
 * - 退场一开始就把遮罩和抽屉的 pointer-events 关掉，
 *   背景卡片不用等退场（以及背景缩放、压暗）结束就能点击。
 */
export const useSheetMotion = ({ isOpen, onRequestClose, onExited, beforeEnter, scrimRef }: SheetMotionOptions) => {
  const backdropRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(isOpen)
  const mountedRef = useRef(isOpen)
  // 只有真正开始退场后才允许下一次打开走“反向恢复”；首次挂载时即使 isOpen
  // 已经是 true（SheetBody 按需渲染）也保持 idle，走完整进场并初始化位置。
  const phaseRef = useRef<'idle' | 'closing'>('idle')
  // 本次打开是不是“退场途中又被打开”；由 isOpen 变化时决定，避免 effect 重跑时被消费掉。
  const reverseRef = useRef(false)
  const closingRef = useRef(false)
  const onExitedRef = useRef(onExited)
  const beforeEnterRef = useRef(beforeEnter)
  // 退场开始时抽屉停在哪，重新打开时滑回这个位置。
  const restYRef = useRef(0)
  const animationsRef = useRef<Animation[]>([])
  // 拖动接管进场时给背景补的短动画；进场 / 退场 / 卸载时都要先收掉。
  const catchUpRef = useRef<Animation[]>([])
  const rafRef = useRef(0)
  const raf2Ref = useRef(0)

  useLayoutEffect(() => {
    onExitedRef.current = onExited
    beforeEnterRef.current = beforeEnter
  }, [onExited, beforeEnter])

  /**
   * 收掉背景补间动画，并把当前值写回内联样式。
   * 拖动把抽屉压到 25% 以下、松手吸附、进 / 退场开始时都由这里接管背景。
   */
  const stopBackdropMotion = useCallback(() => {
    if (!catchUpRef.current.length) return

    const frame = document.querySelector<HTMLElement>('.mobile-frame')
    const scrim = scrimRef.current
    const scale = frame ? readScale(frame) : 1
    const y = frame ? readTranslate(frame) : 0
    const opacity = scrim ? Number(getComputedStyle(scrim).opacity) : 0

    for (const animation of catchUpRef.current) animation.cancel()
    catchUpRef.current = []
    if (frame) frame.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`
    if (scrim) scrim.style.opacity = String(opacity)
  }, [scrimRef])

  /**
   * 停掉正在跑的动画，并把当前值写回内联样式。
   * 拖动接管、退场打断进场、重新打开打断退场都走这里，保证从当前位置继续。
   */
  const stopMotion = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    if (raf2Ref.current) {
      cancelAnimationFrame(raf2Ref.current)
      raf2Ref.current = 0
    }

    stopBackdropMotion()

    const dialog = backdropRef.current?.querySelector<HTMLElement>('[data-slot="drawer-dialog"]')
    if (!dialog) {
      animationsRef.current = []
      return
    }

    const footer = dialog.querySelector<HTMLElement>('[data-sheet-footer]')
    const scrim = scrimRef.current
    const frame = document.querySelector<HTMLElement>('.mobile-frame')
    const state = readState(dialog, footer, scrim, frame)

    for (const animation of animationsRef.current) animation.cancel()
    animationsRef.current = []
    commitState(dialog, footer, scrim, frame, state)

    delete dialog.dataset.animating
  }, [scrimRef, stopBackdropMotion])

  /**
   * 手指开始拖动时接管进场动画。
   *
   * dialog / footer 立刻停在当前位置交给拖动；外壳缩放和压暗如果还在进场中途，
   * 从当前值用一小段 WAAPI 补到打开状态，而不是一帧跳到终点。
   */
  const takeOverMotion = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    if (raf2Ref.current) {
      cancelAnimationFrame(raf2Ref.current)
      raf2Ref.current = 0
    }

    stopBackdropMotion()

    const dialog = backdropRef.current?.querySelector<HTMLElement>('[data-slot="drawer-dialog"]')
    if (!dialog) {
      animationsRef.current = []
      return
    }

    const footer = dialog.querySelector<HTMLElement>('[data-sheet-footer]')
    const scrim = scrimRef.current
    const frame = document.querySelector<HTMLElement>('.mobile-frame')
    const state = readState(dialog, footer, scrim, frame)

    for (const animation of animationsRef.current) animation.cancel()
    animationsRef.current = []

    dialog.style.transform = `translate3d(0, ${state.y}px, 0)`
    if (footer) footer.style.transform = `translate3d(0, ${state.footerY}px, 0)`
    if (scrim) scrim.style.opacity = String(state.opacity)
    if (frame) frame.style.transform = `translate3d(0, ${state.frameY}px, 0) scale(${state.frameScale})`

    const frameNeedsSettle =
      Boolean(frame) &&
      (Math.abs(state.frameScale - SHEET_FRAME_SCALE) > 0.001 || Math.abs(state.frameY - SHEET_FRAME_Y) > 0.1)
    const scrimNeedsSettle = Boolean(scrim) && Math.abs(state.opacity - SHEET_BACKDROP_ALPHA) > 0.002

    if (frameNeedsSettle || scrimNeedsSettle) {
      const animations: Animation[] = []
      const commit = () => {
        for (const animation of animations) animation.cancel()
        catchUpRef.current = []
        if (frame) frame.style.transform = `translate3d(0, ${SHEET_FRAME_Y}px, 0) scale(${SHEET_FRAME_SCALE})`
        if (scrim) scrim.style.opacity = String(SHEET_BACKDROP_ALPHA)
      }

      if (frame) {
        animations.push(
          animateProgress(
            frame,
            (progress) => ({
              transform: `translate3d(0, ${
                state.frameY + (SHEET_FRAME_Y - state.frameY) * progress
              }px, 0) scale(${state.frameScale + (SHEET_FRAME_SCALE - state.frameScale) * progress})`,
            }),
            EASE_POWER3_OUT,
            BACKDROP_SETTLE_DURATION,
            scrimNeedsSettle ? undefined : commit
          )
        )
      }
      if (scrim) {
        animations.push(
          animateProgress(
            scrim,
            (progress) => ({ opacity: state.opacity + (SHEET_BACKDROP_ALPHA - state.opacity) * progress }),
            EASE_POWER3_OUT,
            BACKDROP_SETTLE_DURATION,
            commit
          )
        )
      }
      catchUpRef.current = animations
    }

    delete dialog.dataset.animating
  }, [scrimRef, stopBackdropMotion])

  useLayoutEffect(() => {
    if (!isOpen) {
      if (mountedRef.current) phaseRef.current = 'closing'
      return
    }

    reverseRef.current = phaseRef.current === 'closing'
    phaseRef.current = 'idle'
    closingRef.current = false

    if (!mountedRef.current) {
      mountedRef.current = true
      setMounted(true)
    }
  }, [isOpen])

  /**
   * 用同一段进度驱动抽屉、底栏、遮罩和外壳。
   * 底栏和模糊层的位移由每帧的 y 推出，收起跨过 25% 时也能和抽屉严丝合缝。
   */
  const run = useCallback(
    (
      dialog: HTMLElement,
      footer: HTMLElement | null,
      scrim: HTMLElement | null,
      frame: HTMLElement | null,
      base: number,
      from: SheetState,
      to: SheetState,
      duration: number,
      onDone: () => void
    ) => {
      const animations: Animation[] = []

      const dialogAnimation = animateProgress(
        dialog,
        (progress) => ({
          transform: `translate3d(0, ${from.y + (to.y - from.y) * progress}px, 0)`,
        }),
        EASE_POWER3_OUT,
        duration,
        () => {
          for (const animation of animations) animation.cancel()
          animationsRef.current = []
          commitState(dialog, footer, scrim, frame, to)
          onDone()
        }
      )
      animations.push(dialogAnimation)

      if (footer) {
        animations.push(
          animateProgress(
            footer,
            (progress) => {
              const y = from.y + (to.y - from.y) * progress
              return { transform: `translate3d(0, ${footerYFor(y, base)}px, 0)` }
            },
            EASE_POWER3_OUT,
            duration
          )
        )
      }

      if (scrim) {
        animations.push(
          animateProgress(
            scrim,
            (progress) => ({ opacity: from.opacity + (to.opacity - from.opacity) * progress }),
            EASE_POWER3_OUT,
            duration
          )
        )
      }

      if (frame) {
        animations.push(
          animateProgress(
            frame,
            (progress) => ({
              transform: `translate3d(0, ${from.frameY + (to.frameY - from.frameY) * progress}px, 0) scale(${
                from.frameScale + (to.frameScale - from.frameScale) * progress
              })`,
            }),
            EASE_POWER3_OUT,
            duration
          )
        )
      }

      animationsRef.current = animations
      return animations
    },
    []
  )

  useLayoutEffect(() => {
    if (!isOpen || !mounted) return

    const backdrop = backdropRef.current
    const dialog = backdrop?.querySelector<HTMLElement>('[data-slot="drawer-dialog"]')
    const scrim = scrimRef.current
    if (!backdrop || !dialog) return

    const reverse = reverseRef.current

    // 上一次动画（可能是退场）先落在当前值，再从那里继续。
    stopMotion()
    backdrop.style.pointerEvents = ''
    dialog.style.pointerEvents = ''

    // 退场途中重新打开时保持当前高度，只把 y 滑回退场开始的位置，避免高度跳变。
    if (!reverse) beforeEnterRef.current?.(dialog)

    const footer = dialog.querySelector<HTMLElement>('[data-sheet-footer]')
    const frame = document.querySelector<HTMLElement>('.mobile-frame')
    const base = dialog.offsetHeight
    if (!base) return

    const restY = reverse ? restYRef.current : Number(dialog.dataset.sheetRestY ?? '0')
    restYRef.current = restY

    const target: SheetState = {
      y: restY,
      footerY: footerYFor(restY, base),
      opacity: SHEET_BACKDROP_ALPHA,
      frameScale: SHEET_FRAME_SCALE,
      frameY: SHEET_FRAME_Y,
    }

    // 顶栏模糊层和顶栏底色全程保持不动：抽屉移动时模糊层和它下面的内容
    // 一起平移，不需要换实色底；中途切换反而会让安卓闪一下。
    dialog.dataset.animating = 'true'

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commitState(dialog, footer, scrim, frame, target)
      delete dialog.dataset.animating
      return
    }

    // 完整进场从屏幕下方开始；反向恢复保持当前 y，只滑回停靠位置。
    if (!reverse) {
      commitState(dialog, footer, scrim, frame, {
        y: base,
        footerY: footerYFor(base, base),
        opacity: 0,
        frameScale: 1,
        frameY: 0,
      })
    }

    // 打开时的 React 提交、挂载表单和切换背景 inert 会占掉几十到几百毫秒，
    // 等两帧再启动，动画的第一帧才不会直接跳到中段。
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      raf2Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = 0
        const from = readState(dialog, footer, scrim, frame)
        run(dialog, footer, scrim, frame, base, from, target, SHEET_ENTER_DURATION, () => {
          delete dialog.dataset.animating
        })
      })
    })

    return stopMotion
  }, [isOpen, mounted, scrimRef, stopMotion, run])

  useLayoutEffect(() => {
    if (isOpen || !mounted || closingRef.current) return
    closingRef.current = true
    phaseRef.current = 'closing'

    const backdrop = backdropRef.current
    const dialog = backdrop?.querySelector<HTMLElement>('[data-slot="drawer-dialog"]')
    const scrim = scrimRef.current
    const frame = document.querySelector<HTMLElement>('.mobile-frame')

    const complete = () => {
      if (dialog) {
        delete dialog.dataset.animating
      }
      mountedRef.current = false
      phaseRef.current = 'idle'
      closingRef.current = false
      setMounted(false)
      onExitedRef.current?.()
    }

    if (!backdrop || !dialog) {
      complete()
      return
    }

    const footer = dialog.querySelector<HTMLElement>('[data-sheet-footer]')
    stopMotion()

    const base = dialog.offsetHeight

    // 退场一开始就让出交互：背景卡片不用等动画跑完就能点击。
    // React Aria 在 Modal 关闭后会同步移除背景的 inert（见 isOpen={isOpen}）。
    backdrop.style.pointerEvents = 'none'
    dialog.style.pointerEvents = 'none'

    const from = readState(dialog, footer, scrim, frame)
    // 重新打开时滑回上一次真正停稳的位置，而不是退场开始时的中途值。
    // 快速连续打开 / 取消时，退场往往从进场中途开始；如果拿 from.y 当落点，
    // 每次打断都会把落点往下带一点，抽屉会越弹越矮。
    const storedRestY = Number(dialog.dataset.sheetRestY)
    restYRef.current = Number.isFinite(storedRestY) ? storedRestY : from.y

    const target: SheetState = {
      y: base,
      footerY: footerYFor(base, base),
      opacity: 0,
      frameScale: 1,
      frameY: 0,
    }

    dialog.dataset.animating = 'true'

    if (!base || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      commitState(dialog, footer, scrim, frame, target)
      complete()
      return
    }

    // 和进场一样等两帧：关闭时的 React 提交和 inert 恢复也会占掉时间。
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      raf2Ref.current = requestAnimationFrame(() => {
        raf2Ref.current = 0
        // 等待期间拖动可能已经接管并改了值，启动前重新读一次。
        const current = readState(dialog, footer, scrim, frame)
        run(dialog, footer, scrim, frame, base, current, target, SHEET_EXIT_DURATION, complete)
      })
    })

    return stopMotion
  }, [isOpen, mounted, scrimRef, stopMotion, run])

  return {
    backdropRef,
    mounted,
    stopMotion,
    takeOverMotion,
    stopBackdropMotion,
    handleOpenChange: (next: boolean) => {
      if (!next) onRequestClose()
    },
  }
}
