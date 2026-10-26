import { useEffect, type RefObject } from 'react'
import { getReleaseVelocity, isFlick, pushFlickSample, type FlickSample } from '@/lib/flick'
import {
  SHEET_BACKDROP_ALPHA,
  SHEET_COLLAPSED_RATIO,
  SHEET_DISMISS_THRESHOLD,
  SHEET_EXPAND_THRESHOLD,
  SHEET_FRAME_SCALE,
  SHEET_FRAME_Y,
  SHEET_SNAP_DURATION,
} from '@/lib/sheetMotion'
import { syncSheetChrome } from '@/lib/sheetChrome'
import { animateProgress, EASE_POWER3_OUT, readScale, readTranslate } from '@/lib/waapi'

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
  /** 手指开始拖动时接管进场动画，从当前位置继续。 */
  takeOverMotion: () => void
  /** 收掉拖动接管时给背景补的短动画；吸附和压到 25% 以下前调用。 */
  stopBackdropMotion: () => void
  /** 松手回弹的目标高度比例；默认半屏，添加机器人使用 1（只有全屏）。 */
  collapsedRatio?: number
}

type DragMode = 'expand' | 'collapse' | 'none'

const DRAG_START = 6
const CLICK_SUPPRESS = 200
/** 可见高度低于 25% 后，底栏不再钉在屏幕底部，而是跟着抽屉一起滑出屏幕。 */
const FOOTER_FLOOR = 0.75
/**
 * 视口比打开抽屉时矮这么多，就认为输入法弹出了。
 * 地址栏展开 / 收起通常只有几十像素，不会被当成键盘。
 */
const KEYBOARD_THRESHOLD = 100
/** 焦点输入框和悬浮顶栏 / 底栏之间留一点空隙，别贴着边。 */
const INPUT_EDGE_GAP = 8
/** 内容惯性：v(t) = v0 * exp(-t / τ)，和之前手写惯性是同一手感。 */
const MOMENTUM_TAU = 480
const MOMENTUM_MIN_VELOCITY = 0.02
const MOMENTUM_MAX_VELOCITY = 4
/** 指数衰减的首段速度最快，关键帧取密一点，避免看出折线。 */
const FLING_STEPS = 120
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

const footerYFor = (y: number, base: number) => -Math.min(y, base * FOOTER_FLOOR)

/**
 * 底部抽屉的拖动与内容滚动。
 *
 * 抽屉的 dialog 始终是完整可用高度，拖动只改位移层的 translate3d：
 * 可见高度 = base - y。底栏和底部模糊层在同一个容器里，按 -min(y, 0.75 * base)
 * 反向平移，所以 25% 以上底栏钉在屏幕底部，低于 25% 跟着抽屉一起滑出屏幕。
 * 整个拖动只写 transform，不碰 height / 布局。
 *
 * 内容滚动在抽屉全屏且停稳后交给浏览器原生处理（scroll 容器的 touch-action 是 pan-y），
 * 手指拖动和松手后的惯性都由合成器驱动，和主页列表滚动走同一条路径。
 * 但两个交接点必须留在同一个手势里：
 * - 从半屏往上拖到全屏后继续往上拖，多出来的位移直接变成内容滚动；
 * - 全屏且内容已经滚起来时，向下拖到顶部后继续下拉，手势接回抽屉收起。
 * 前者在手指按住期间用 JS 写 scrollTop（和手指拖动一样跟手），松手后把离手速度
 * 交给 WAAPI 平移内容层做指数衰减惯性——同样是合成器驱动，不经过主线程。
 * 后者靠 overflow 把已经锁定的原生滚动停住，再把后续位移交给高度拖动。
 *
 * 抽屉自身的吸附仍然用 WAAPI 跑 transform，由合成器驱动，主线程不参与。
 */
export const useSheetDrag = ({
  isOpen,
  mounted,
  onRequestClose,
  backdropRef,
  scrimRef,
  scrollerRef,
  baseHeightRef,
  takeOverMotion,
  stopBackdropMotion,
  collapsedRatio = SHEET_COLLAPSED_RATIO,
}: SheetDragOptions) => {
  useEffect(() => {
    if (!isOpen || !mounted) return

    const backdrop = backdropRef.current
    const scrim = scrimRef.current
    const dialog = backdrop?.querySelector<HTMLElement>('[data-slot="drawer-dialog"]')
    // 位移层：dialog 上挂着大量 HeroUI / Tailwind 规则，每帧改它的内联 transform
    // 会连带重算整条样式链并触发整棵子树重排；位移统一写在这层普通 div 上。
    const sheet = backdrop?.querySelector<HTMLElement>('[data-sheet-transform]')
    const scroller = scrollerRef.current
    if (!dialog || !sheet || !scroller || !baseHeightRef.current) return

    // 底栏和底部模糊层一起反向平移，抽屉收起时仍停在屏幕底部。
    const footer = dialog.querySelector<HTMLElement>('[data-sheet-footer]')
    // 内容层：展开手势交接后的惯性用 transform 平移它，位移包含上下内边距。
    const content = scroller.querySelector<HTMLElement>('[data-sheet-content]')
    // 背景缩放和压暗由 useSheetMotion 驱动，拖到 25% 以下时改由这里跟手复原。
    const frame = document.querySelector<HTMLElement>('.mobile-frame')
    // 键盘期间补在抽屉下面的底色块，盖住 Safari 浮动表单栏和键盘之间的页面。
    const bleed = backdrop?.querySelector<HTMLElement>('[data-sheet-bleed]')

    let touchId: number | null = null
    let pointerId: number | null = null
    let startX = 0
    let startY = 0
    let startTime = 0
    let dragStartY = 0
    let dragStartHeight = 0
    // 高度拖动开始时抽屉处在什么比例：判断“从全屏快速下扫”用的是起手位置。
    let dragStartRatio = 0
    let dragStartClientY = 0
    let active = false
    let suppressClickUntil = 0
    // 高度拖动的离手速度采样。
    let dragSamples: FlickSample[] = []

    // 从展开手势交接过来的内容滚动（JS 写 scrollTop）。
    let scrollActive = false
    let scrollStartTop = 0
    let scrollStartY = 0
    let scrollSamples: FlickSample[] = []
    // 已经放给原生滚动、但还在跟踪的手势：用于“滚到顶部后继续下拉”的接管。
    let nativeTracking = false
    let lastNativeY = 0
    let topPullStartY: number | null = null
    // 原生滚动阶段的手指位置采样；接管收起时沿用，快速下扫的离手速度才不会被丢掉。
    let nativeSamples: FlickSample[] = []
    // 接管原生滚动时临时关掉溢出滚动，避免手指回推时内容又自己滚起来。
    let overflowHidden = false
    // 内容惯性动画；结束时一次性写回 scrollTop。
    let flingAnimation: Animation | null = null
    let flingStartTop = 0

    // 跟手高度只量一次，拖动期间不再读布局。
    let visibleHeight = 0
    let measured = false
    let lastY = Number.NaN
    let lastFooterY = Number.NaN
    let lastRestore = -1
    let snapAnimations: Animation[] = []
    // 每帧最多应用一次触摸位置；touchend 时同步冲刷最后一帧。
    let pendingY: number | null = null
    let frameId = 0

    const base = () => baseHeightRef.current
    const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isInScroller = (target: EventTarget | null) => target instanceof Node && scroller.contains(target)

    /**
     * 全屏且停稳时才把纵向手势放给原生滚动；其余状态（半屏、吸附过程中）
     * 由 JS 全权处理，避免浏览器在抽屉高度变化时把手势锁进滚动容器。
     */
    const syncTouchAction = () => {
      scroller.style.touchAction = dialog.dataset.sheetExpanded === 'true' ? 'pan-y' : 'none'
    }

    syncTouchAction()

    // 键盘弹出时视觉视口会变矮，而 dialog 的高度是打开时定死的像素值：
    // 不改的话 dialog 会比视口高，被 flex 底部对齐顶出屏幕上方，
    // 看起来就是“整个页面被输入法往上抬了一截”。这里跟着 RAC 的
    // [data-slot="drawer-content"]（高度 = --visual-viewport-height）临时改 base，
    // 并且直接铺满剩下的可见区域——键盘已经占掉大半屏幕，半屏只剩顶栏和底栏，
    // 输入框会被底栏盖住，表单根本没法用。
    const viewportWrapper = dialog.closest<HTMLElement>('[data-slot="drawer-content"]')
    const openBase = base()
    // 键盘打开期间冻结背景页面高度，避免安卓 resizes-content 让列表跟着重排。
    const openFrameHeight = frame?.offsetHeight ?? 0
    let keyboardMode = false
    // 键盘弹出前的高度比例；收起后回到原来的位置，而不是停在铺满的状态。
    let preKeyboardRatio = 1
    let viewportTimer = 0
    let revealFrame = 0
    let revealTimer = 0
    let viewportObserver: ResizeObserver | null = null

    const maxScroll = () => Math.max(0, scroller.scrollHeight - scroller.clientHeight)

    const setScrollTop = (value: number) => {
      const top = clamp(value, 0, maxScroll())
      scroller.scrollTop = top
      return top
    }

    /**
     * 键盘弹出后抽屉会变矮，焦点输入框可能正好落在底栏下面。
     * 这里只滚抽屉自己的滚动容器，不调用 scrollIntoView：后者会连带滚动页面，
     * 在 iOS 上表现为整个页面被顶上去。
     *
     * 注意不能用滚动容器的 rect 当可见区：dialog 是底部对齐后整体下移的，
     * 滚动容器的下半截其实在键盘后面。可见区要用视觉视口和悬浮底栏一起夹。
     */
    const revealActiveInput = () => {
      const focused = document.activeElement
      if (!content || !(focused instanceof HTMLElement) || !scroller.contains(focused)) return

      const vv = window.visualViewport
      const viewTop = vv?.offsetTop ?? 0
      const viewBottom = vv ? vv.offsetTop + vv.height : window.innerHeight
      const box = scroller.getBoundingClientRect()
      const header = dialog.querySelector<HTMLElement>('[data-sheet-header]')
      const headerBottom = header?.getBoundingClientRect().bottom ?? box.top
      const footerTop = footer?.getBoundingClientRect().top ?? viewBottom

      const rect = focused.getBoundingClientRect()
      const top = Math.max(box.top, viewTop, headerBottom + INPUT_EDGE_GAP)
      const bottom = Math.min(box.bottom, viewBottom, footerTop - INPUT_EDGE_GAP)

      let delta = 0
      if (rect.top < top) delta = rect.top - top
      else if (rect.bottom > bottom) delta = rect.bottom - bottom
      if (Math.abs(delta) < 1) return

      setScrollTop(scroller.scrollTop + delta)
    }

    /**
     * 露出焦点输入框：先排一帧，再补一个延时。
     * iOS 在切换输入框时自己也会滚一次滚动容器，延时那一次等它落定后再校正，
     * 免得输入框最后停在悬浮底栏下面。
     */
    const revealSoon = () => {
      if (revealFrame) cancelAnimationFrame(revealFrame)
      if (revealTimer) window.clearTimeout(revealTimer)
      revealFrame = requestAnimationFrame(() => {
        revealFrame = 0
        revealActiveInput()
      })
      revealTimer = window.setTimeout(() => {
        revealTimer = 0
        revealActiveInput()
      }, 150)
    }

    const isEditable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

    const restoreOverflow = () => {
      if (!overflowHidden) return
      overflowHidden = false
      scroller.style.overflowY = ''
    }

    /** 把惯性动画的当前位置落回 scrollTop，视觉位置不变，后续滚动恢复原生。 */
    const commitFling = () => {
      if (!flingAnimation) return
      const y = content ? readTranslate(content) : 0
      flingAnimation.cancel()
      flingAnimation = null
      if (!content) return
      scroller.scrollTop = flingStartTop - y
      content.style.transform = ''
      content.style.willChange = ''
    }

    /**
     * 从展开手势交接过来的滚动，松手后的惯性。
     *
     * 位移按 v(t) = v0 * exp(-t / τ) 采样成 WAAPI 关键帧，平移滚动内容的内层，
     * 由合成器驱动；手指拖动和离手后的滚动因此是同一档流畅度。
     * 结束时一次性写回 scrollTop，内容位置不变，之后仍然走浏览器原生滚动。
     */
    const startFling = (velocity: number) => {
      if (!content || reduceMotion()) return

      const initial = clamp(velocity, -MOMENTUM_MAX_VELOCITY, MOMENTUM_MAX_VELOCITY)
      if (Math.abs(initial) < 0.05) return

      const max = maxScroll()
      if (max <= 0) return

      const from = scroller.scrollTop
      // 指数衰减的理论总位移 v0 * τ；到边界就截断，并缩短动画时长。
      const total = MOMENTUM_TAU * (initial - Math.sign(initial) * MOMENTUM_MIN_VELOCITY)
      const distance = clamp(total, -from, max - from)
      if (Math.abs(distance) < 1) return

      const covered = distance / (MOMENTUM_TAU * initial)
      if (covered >= 1) return

      const duration = -MOMENTUM_TAU * Math.log(1 - covered)
      if (duration < 16) return

      const k = duration / MOMENTUM_TAU
      const normal = 1 - Math.exp(-k)

      flingStartTop = from
      content.style.willChange = 'transform'
      flingAnimation = animateProgress(
        content,
        (progress) => ({ transform: `translate3d(0, ${-distance * progress}px, 0)` }),
        (t) => (1 - Math.exp(-t * k)) / normal,
        duration / 1000,
        () => {
          flingAnimation = null
          scroller.scrollTop = from + distance
          content.style.transform = ''
          content.style.willChange = ''
        },
        FLING_STEPS
      )
    }

    /** 只写 transform：位移层的 y 和底栏容器的反向位移。 */
    const writeY = (y: number) => {
      if (y !== lastY) {
        lastY = y
        sheet.style.transform = `translate3d(0, ${y}px, 0)`
      }

      if (footer) {
        const nextFooterY = footerYFor(y, base())
        if (nextFooterY !== lastFooterY) {
          lastFooterY = nextFooterY
          footer.style.transform = `translate3d(0, ${nextFooterY}px, 0)`
        }
      }

      measured = true
    }

    const setVisibleHeight = (next: number) => {
      // 不取整：慢速拖动时每帧可能只移动不到 1px，取整会看起来一格一格。
      visibleHeight = next
      writeY(base() - next)
      return next
    }

    const measureVisible = () => {
      if (!measured) {
        measured = true
        const y = readTranslate(sheet)
        lastY = y
        visibleHeight = base() - y
      }
      return visibleHeight
    }

    const ratio = () => (base() ? measureVisible() / base() : collapsedRatio)

    const setExpanded = (expanded: boolean) => {
      dialog.dataset.sheetExpanded = expanded ? 'true' : 'false'
      syncTouchAction()
      syncSheetChrome(dialog)
    }

    const cancelSnap = () => {
      if (!snapAnimations.length) return

      // 从动画中间接管：先读当前值，再取消，最后写回内联样式。
      const currentY = readTranslate(sheet)
      const currentFooterY = footer ? readTranslate(footer) : 0
      for (const animation of snapAnimations) animation.cancel()
      snapAnimations = []
      sheet.style.transform = `translate3d(0, ${currentY}px, 0)`
      if (footer) footer.style.transform = `translate3d(0, ${currentFooterY}px, 0)`
      lastY = currentY
      lastFooterY = currentFooterY
      visibleHeight = base() - currentY
      measured = true
    }

    const clearPointerChrome = () => {
      if (dialog.style.cursor) dialog.style.cursor = ''
      if (dialog.style.userSelect) dialog.style.userSelect = ''
    }

    const isInteractive = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR))

    const isTextInput = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest('textarea, [contenteditable="true"]'))

    /**
     * 抽屉被拖到 25% 以下时，压暗和外壳缩放不再停在打开时的状态，
     * 而是跟着手指一起复原：可见高度越小，背景越亮、外壳越接近原始尺寸。
     * 进度套用与进场 / 退场相同的 power3.out 曲线。
     */
    const applyBackdropRestore = (visible: number) => {
      const height = base()
      if (!height) return

      const threshold = height * SHEET_DISMISS_THRESHOLD
      if (threshold <= 0) return

      const restore = clamp((threshold - visible) / threshold, 0, 1)
      const progress = restore <= 0 ? 0 : restore >= 1 ? 1 : EASE_POWER3_OUT(restore)
      if (progress === lastRestore) return
      lastRestore = progress

      // 背景如果还在从进场中途补间，先停在当前值，再改由手指接管。
      if (progress > 0) stopBackdropMotion()

      if (scrim) scrim.style.opacity = String(SHEET_BACKDROP_ALPHA * (1 - progress))
      if (frame) {
        frame.style.transform = `translate3d(0, ${SHEET_FRAME_Y * (1 - progress)}px, 0) scale(${
          SHEET_FRAME_SCALE + (1 - SHEET_FRAME_SCALE) * progress
        })`
      }
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

    /**
     * 把抽屉的 base 换成新的高度，可见高度按当前比例映射过去。
     * 键盘打开 / 关闭都走这里：全屏仍然是全屏，半屏仍然是半屏。
     * forcedRatio 用于键盘弹出时直接铺满（见 syncViewport）。
     */
    const resizeSheetBase = (nextBase: number, forcedRatio?: number) => {
      const currentBase = base()
      const height = Math.round(nextBase)
      if (!currentBase || !height || height === Math.round(currentBase)) return

      // 进 / 退场动画的落点按启动时的 base 算，动画期间先不动，等它结束再补。
      if (dialog.dataset.animating === 'true') {
        scheduleViewportSync()
        return
      }

      cancelPending()
      // 吸附动画中途也要先停在当前位置，比例才是眼睛看到的高度。
      cancelSnap()
      const nextRatio = forcedRatio ?? clamp(measureVisible() / currentBase, 0, 1)

      baseHeightRef.current = height
      dialog.style.height = `${height}px`
      dialog.style.maxHeight = `${height}px`

      const nextVisible = clamp(nextRatio * height, 1, height)
      visibleHeight = setVisibleHeight(nextVisible)
      dialog.dataset.sheetRestY = String(height - nextVisible)
      lastRestore = -1
      applyBackdropRestore(nextVisible)
      setExpanded(nextVisible >= height - 0.5)

      // 布局稳定后再把焦点输入框滚回可见区；只滚抽屉自己的滚动容器。
      revealSoon()
    }

    const scheduleViewportSync = () => {
      if (viewportTimer) return
      viewportTimer = window.setTimeout(() => {
        viewportTimer = 0
        syncViewport()
      }, 120)
    }

    const isEditing = () => {
      const focused = document.activeElement
      return (
        focused instanceof HTMLElement &&
        dialog.contains(focused) &&
        (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.isContentEditable)
      )
    }

    const setKeyboardMode = (on: boolean) => {
      keyboardMode = on
      if (bleed) bleed.hidden = !on
    }

    /**
     * 键盘开关会改变 drawer-content 的高度（React Aria 用 --visual-viewport-height 驱动）。
     * 观察它比直接读 visualViewport 更稳：iOS 关闭键盘时 RAC 会提前把高度还回来，
     * 两边各按各的节奏的话，抽屉会在键盘收起过程中跳一下。
     */
    const syncViewport = () => {
      if (!viewportWrapper) return
      const height = Math.round(viewportWrapper.clientHeight)
      if (!height) return

      const shrunk = height <= openBase - KEYBOARD_THRESHOLD
      const grown = height >= openBase + KEYBOARD_THRESHOLD

      if (shrunk && (keyboardMode || isEditing())) {
        if (!keyboardMode) {
          setKeyboardMode(true)
          // 记下弹键盘前的比例，收起后回到原来的位置。
          // 下限取吸附档位：进场动画中途就弹键盘时量到的是中间值，别把抽屉留在半截。
          preKeyboardRatio = clamp(measureVisible() / base(), collapsedRatio, 1)
          if (frame && openFrameHeight) frame.style.height = `${openFrameHeight}px`
        }
        // 键盘占掉大半屏幕后，半屏只剩顶栏和底栏，输入框会被底栏盖住、表单没法用；
        // 直接铺满可见区域（iOS 原生抽屉弹键盘时也是这么做的）。
        resizeSheetBase(height, 1)
        return
      }

      if (keyboardMode) {
        setKeyboardMode(false)
        if (frame) frame.style.height = ''
        // 抽屉打开时键盘就已经开着的话，openBase 是当时的矮视口；
        // 收起后要长回现在的视口高度。
        resizeSheetBase(Math.max(openBase, height), preKeyboardRatio)
        return
      }

      // 打开抽屉时键盘恰好还开着：视口恢复后把抽屉一起长回来，
      // 否则它会一直停在打开时那个被压矮的高度。
      if (grown && !isEditing()) resizeSheetBase(height)
    }

    if (viewportWrapper) {
      viewportObserver = new ResizeObserver(syncViewport)
      viewportObserver.observe(viewportWrapper)
    }

    /**
     * 键盘已经弹出时再切换输入框，视口不会再变，syncViewport 不会触发；
     * 这里补一次铺满和露出。iOS 上布局视口不变、只有 drawer-content 变矮，
     * 用两者的差值判断键盘是否开着。
     */
    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditable(event.target)) return
      const height = viewportWrapper ? Math.round(viewportWrapper.clientHeight) : 0
      if (!height) return

      const keyboardOpen =
        keyboardMode || height <= Math.round(document.documentElement.clientHeight) - KEYBOARD_THRESHOLD
      if (!keyboardOpen) return

      if (!keyboardMode) {
        setKeyboardMode(true)
        preKeyboardRatio = clamp(measureVisible() / base(), collapsedRatio, 1)
        if (frame && openFrameHeight) frame.style.height = `${openFrameHeight}px`
      }
      resizeSheetBase(height, 1)
      revealSoon()
    }

    dialog.addEventListener('focusin', handleFocusIn)

    const beginDrag = (clientY: number, pointer = false) => {
      active = true
      suppressClickUntil = performance.now() + CLICK_SUPPRESS

      // 鼠标拖动才需要抓手光标和禁用选中。cursor 和 user-select 都会影响
      // 后代的计算样式，写在 dialog 上会让整棵抽屉子树重算；触屏没有光标，
      // 选中也已经被手势拦掉了，所以只在指针手势里临时写内联样式。
      if (pointer) {
        dialog.style.cursor = 'grabbing'
        dialog.style.userSelect = 'none'
      }

      // 进 / 退场动画还在跑时先停在当前值，拖动从当前位置接管；
      // 背景如果还在进场中途，会从当前值补到打开状态，避免一帧跳变。
      // 上一次吸附还没结束就被重新抓住时同样先停下来。
      takeOverMotion()
      cancelSnap()

      dragStartY = clientY
      dragStartHeight = measureVisible()
      dragStartRatio = base() ? dragStartHeight / base() : 0
      dragStartClientY = startY
      lastRestore = -1
      dragSamples = [{ t: startTime, value: startY }]
      pushFlickSample(dragSamples, clientY)
    }

    /**
     * 抽屉已经拖到全屏，继续向上的位移直接变成内容滚动，手势不中断。
     * 手指按住期间用 JS 写 scrollTop（和原生一样跟手），松手后再由 startFling
     * 把离手速度交给合成器做指数衰减惯性。
     */
    const beginScroll = (clientY: number, excess: number) => {
      const height = base()
      if (!height) return

      visibleHeight = setVisibleHeight(height)
      applyBackdropRestore(visibleHeight)

      active = false
      scrollActive = true
      // 这里不恢复 overflow：如果本次手势是从原生滚动接管来的，恢复后浏览器
      // 可能又在同一次触摸里滚动，和这里的 scrollTop 叠加成双倍位移。
      // 手势结束时 finish / 下一次 touchstart 会恢复。
      scrollStartTop = scroller.scrollTop
      // 让当前手指位置对应的滚动量正好是 scrollStartTop + excess。
      scrollStartY = clientY + excess
      setScrollTop(scrollStartTop + excess)
      // 从交接点重新采样，避免把展开阶段的速度算进内容惯性。
      scrollSamples = [{ t: performance.now(), value: scroller.scrollTop }]
    }

    /** 内容回到顶部后继续下拉：多出来的位移接回抽屉收起，手势不中断。 */
    const beginCollapseFromScroll = (clientY: number, pull: number) => {
      scrollActive = false
      scroller.scrollTop = 0
      // dragStartY 比当前手指高 pull，applyHeightDrag 算出来的高度正好少 pull。
      const origin = clientY - pull
      beginDrag(origin)
      dragStartClientY = origin
      dragSamples = [{ t: performance.now(), value: origin }]
      applyHeightDrag(clientY)
    }

    /**
     * 原生滚动到顶后继续下拉：停住浏览器的滚动，把剩下的位移接回抽屉收起。
     * 触摸已经被浏览器锁进滚动，preventDefault 不再有效，但把 overflow 设成 hidden
     * 能立刻停住它；手指回推时内容也不会再自己滚起来。
     */
    const takeOverNativeScroll = (clientY: number, origin: number) => {
      nativeTracking = false
      topPullStartY = null
      scroller.style.overflowY = 'hidden'
      overflowHidden = true
      scroller.scrollTop = 0
      beginDrag(origin)
      // 轻扫距离从接管点算起，但速度沿用原生阶段最后几次移动：
      // 否则“滚到顶后顺势快速下扫”会在离手时丢掉速度，被当成慢拖。
      dragStartClientY = origin
      dragSamples = nativeSamples.slice()
      nativeSamples = []
      applyHeightDrag(clientY)
    }

    const applyScroll = (clientY: number) => {
      const desired = scrollStartTop - (clientY - scrollStartY)

      if (desired < 0) {
        // 内容已经到顶，多出来的距离直接转成抽屉收起，手势不中断。
        beginCollapseFromScroll(clientY, -desired)
        return
      }

      setScrollTop(desired)
      pushFlickSample(scrollSamples, scroller.scrollTop)
    }

    const applyHeightDrag = (clientY: number) => {
      const height = base()
      if (!height) return

      const rawHeight = dragStartHeight + (dragStartY - clientY)

      if (rawHeight > height) {
        // 抽屉已经到顶，继续向上拖直接转成内容滚动，手势不中断。
        beginScroll(clientY, rawHeight - height)
        return
      }

      // 高度始终跟随手指：向上拖（clientY 变小）变高，向下拖（clientY 变大）变矮。
      // 到顶后继续向上拖不再增加高度；此时松手会按轻扫吸附到全屏。
      const raw = clamp(rawHeight, 0, height)
      visibleHeight = setVisibleHeight(raw)
      applyBackdropRestore(visibleHeight)
    }

    const applyDrag = (clientY: number) => {
      if (!active) return
      applyHeightDrag(clientY)
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

    const recordDragSample = (clientY: number) => {
      pushFlickSample(dragSamples, clientY)
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

    const finish = (allowFlick = true) => {
      cancelPending()

      if (!active && !scrollActive) {
        return
      }

      const wasScroll = scrollActive
      active = false
      scrollActive = false
      clearPointerChrome()

      // 长按拖动可能超过 200ms，按松手时间重新计算，避免拖动结束后误触。
      suppressClickUntil = performance.now() + CLICK_SUPPRESS

      // 接管原生滚动时关掉的溢出滚动在这里恢复：手势已经结束、内容停在顶部，
      // 不会再有残余速度让它自己滑一段。
      restoreOverflow()

      const height = base()
      if (!height) return

      if (wasScroll) {
        // 展开手势交接到内容滚动后松手：抽屉已经在全屏，只把离手速度交给
        // 合成器惯性，不再空跑一段吸附动画。
        visibleHeight = setVisibleHeight(height)
        applyBackdropRestore(visibleHeight)
        dialog.dataset.sheetRestY = '0'
        setExpanded(true)
        const velocity = allowFlick ? getReleaseVelocity(scrollSamples) : 0
        scrollSamples = []
        startFling(velocity)
        return
      }

      // 25% 以下抽屉整体下移，visibleHeight 已经是真实可见高度。
      const current = visibleHeight / height
      // 轻扫距离用整段手势的手指位移（按下到离手），而不是抽屉高度变化：
      // 第一次移动还在死区内时高度没有变化，只看高度会把快速短扫当成原地轻点。
      const lastDragY = dragSamples[dragSamples.length - 1]?.value ?? dragStartClientY
      const distance = Math.abs(lastDragY - dragStartClientY)
      const releaseVelocity = allowFlick ? getReleaseVelocity(dragSamples) : 0
      // 触摸坐标向下为正；归一化后分别判断两个方向是否构成轻扫。
      const flickUp = isFlick(distance, -releaseVelocity)
      const flickDown = isFlick(distance, releaseVelocity)

      let targetRatio: number | null = null

      if (flickDown) {
        // 从全屏 / 接近全屏快速下扫直接退场：先回半屏、再让用户扫第二次的旧路径
        // 体验不好。慢速拖动仍然回到半屏；已经拖到 75% 以下再下扫也回半屏。
        // collapsedRatio 为 1 的抽屉没有半屏状态，下扫始终是退场。
        const nearFull = dragStartRatio >= SHEET_EXPAND_THRESHOLD || current >= SHEET_EXPAND_THRESHOLD
        targetRatio = collapsedRatio >= 0.999 || nearFull || current <= collapsedRatio + 0.001 ? null : collapsedRatio
      } else if (flickUp) {
        // 从半屏快速上扫直接到全屏；从更低的位置上扫先回到半屏。
        targetRatio = current >= collapsedRatio ? 1 : collapsedRatio
      } else if (current < SHEET_DISMISS_THRESHOLD) {
        // 慢速拖动低于 25%：不吸附回半屏，直接从当前位置走退场动画。
        targetRatio = null
      } else {
        targetRatio = collapsedRatio >= 0.999 ? 1 : current > SHEET_EXPAND_THRESHOLD ? 1 : collapsedRatio
      }

      dragSamples = []

      if (targetRatio === null) {
        onRequestClose()
        return
      }

      const target = Math.max(0, Math.min(height, height * targetRatio))
      const expanded = target >= height - 0.5

      // 吸附期间不再让原生滚动接管手势；停稳后再按最终高度切换 touch-action。
      scroller.style.touchAction = 'none'

      // 已经在目标高度上（例如正好拖到 100%），不需要再空跑一段动画。
      if (Math.abs(visibleHeight - target) < 0.5) {
        visibleHeight = setVisibleHeight(target)
        dialog.dataset.sheetRestY = String(height - target)
        setExpanded(expanded)
        return
      }

      if (reduceMotion()) {
        visibleHeight = setVisibleHeight(target)
        dialog.dataset.sheetRestY = String(height - target)
        setExpanded(expanded)
        return
      }

      // 吸附用 WAAPI 跑 transform：合成器逐帧插值，主线程不参与。
      cancelSnap()
      // 背景如果还在补间，先停在当前值，吸附从真正的位置继续。
      stopBackdropMotion()
      const fromY = height - visibleHeight
      const endY = height - target
      const startOpacity = scrim ? Number(getComputedStyle(scrim).opacity) : SHEET_BACKDROP_ALPHA
      const startScale = frame ? readScale(frame) : SHEET_FRAME_SCALE
      const startFrameY = frame ? readTranslate(frame) : SHEET_FRAME_Y

      const animations: Animation[] = []

      const sheetAnimation = animateProgress(
        sheet,
        (progress) => ({
          transform: `translate3d(0, ${fromY + (endY - fromY) * progress}px, 0)`,
        }),
        EASE_POWER3_OUT,
        SHEET_SNAP_DURATION,
        () => {
          for (const animation of animations) animation.cancel()
          snapAnimations = []
          sheet.style.transform = `translate3d(0, ${endY}px, 0)`
          if (footer) footer.style.transform = `translate3d(0, ${footerYFor(endY, height)}px, 0)`
          if (scrim) scrim.style.opacity = String(SHEET_BACKDROP_ALPHA)
          if (frame) frame.style.transform = `translate3d(0, ${SHEET_FRAME_Y}px, 0) scale(${SHEET_FRAME_SCALE})`
          lastY = endY
          lastFooterY = footerYFor(endY, height)
          lastRestore = 0
          visibleHeight = target
          measured = true
          // 记录真正停稳的位置：快速打开 / 取消时，重新打开要回到这里，
          // 而不是回到某次被中途打断的位移。
          dialog.dataset.sheetRestY = String(endY)
          // 吸附结束后再切安全区和原生滚动，避免拖动中途状态跳变。
          setExpanded(expanded)
        }
      )
      animations.push(sheetAnimation)

      if (footer) {
        animations.push(
          animateProgress(
            footer,
            (progress) => {
              const y = fromY + (endY - fromY) * progress
              return { transform: `translate3d(0, ${footerYFor(y, height)}px, 0)` }
            },
            EASE_POWER3_OUT,
            SHEET_SNAP_DURATION
          )
        )
      }

      // 从 25% 以下往上吸附时，背景压暗和外壳缩放一起回到打开状态。
      if (scrim) {
        animations.push(
          animateProgress(
            scrim,
            (progress) => ({ opacity: startOpacity + (SHEET_BACKDROP_ALPHA - startOpacity) * progress }),
            EASE_POWER3_OUT,
            SHEET_SNAP_DURATION
          )
        )
      }
      if (frame) {
        animations.push(
          animateProgress(
            frame,
            (progress) => ({
              transform: `translate3d(0, ${startFrameY + (SHEET_FRAME_Y - startFrameY) * progress}px, 0) scale(${
                startScale + (SHEET_FRAME_SCALE - startScale) * progress
              })`,
            }),
            EASE_POWER3_OUT,
            SHEET_SNAP_DURATION
          )
        )
      }

      snapAnimations = animations
    }

    const onTouchStart = (event: TouchEvent) => {
      cancelPending()
      // 新手势落下时先把上一次的内容惯性落到 scrollTop，后续滚动从落点继续。
      commitFling()
      if (active || scrollActive) finish(false)
      restoreOverflow()
      nativeTracking = false
      topPullStartY = null
      nativeSamples = []
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
      startTime = performance.now()
    }

    const onTouchMove = (event: TouchEvent) => {
      if (touchId === null) return

      if (event.touches.length !== 1) {
        cancelPending()
        if (active || scrollActive) finish(false)
        nativeTracking = false
        touchId = null
        return
      }

      const touch = event.touches[0]
      if (!touch) return

      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      if (active) {
        event.preventDefault()
        recordDragSample(touch.clientY)
        scheduleDrag(touch.clientY)
        return
      }

      if (scrollActive) {
        // 展开手势交接后的内容滚动：手指按住期间由 JS 写 scrollTop，完全跟手。
        event.preventDefault()
        applyScroll(touch.clientY)
        return
      }

      if (nativeTracking) {
        // 浏览器在滚，这里只观察：内容回到顶部后手指继续往下，就把手势接回来。
        const moveDy = touch.clientY - lastNativeY
        lastNativeY = touch.clientY
        pushFlickSample(nativeSamples, touch.clientY)

        if (scroller.scrollTop <= 1 && moveDy > 0) {
          if (topPullStartY === null) topPullStartY = touch.clientY
          if (touch.clientY - topPullStartY >= DRAG_START) {
            takeOverNativeScroll(touch.clientY, topPullStartY)
          }
        } else if (moveDy < 0) {
          // 手指转向上滚，重新计下拉起点。
          topPullStartY = null
        }
        return
      }

      if (Math.abs(dx) > Math.abs(dy) * 1.2) {
        touchId = null
        return
      }

      const expanded = dialog.dataset.sheetExpanded === 'true'
      const pullingDown = dy > 0
      // 全屏时内容滚动交给浏览器：向上拖，或者向下拖时内容还没到顶。
      // 只有“全屏 + 内容已在顶部 + 向下拖”才由 JS 收起抽屉。
      // 用 1px 而不是 0：高刷屏的 scrollTop 可能是小数，避免顶部还差半像素时收不起来。
      const nativeScroll = expanded && (!pullingDown || (isInScroller(event.target) && scroller.scrollTop > 1))

      if (nativeScroll) {
        // 死区内先别放弃跟踪：手指刚落下时的几像素抖动不应该把
        // “顶部下拉收起”误判成原生滚动。过了死区就交给浏览器，
        // 但继续观察位置，内容滚到顶部后还要能把手势接回来。
        if (Math.abs(dy) >= DRAG_START) {
          nativeTracking = true
          lastNativeY = touch.clientY
          topPullStartY = null
          nativeSamples = [{ t: performance.now(), value: touch.clientY }]
        }
        return
      }

      // 这一手势会由 JS 接管。全屏时 touch-action 是 pan-y，浏览器可以滚动，
      // 所以死区内就要先阻止它把手势锁进滚动；半屏时 touch-action 是 none，
      // 等过了死区再拦，保持和原来一样的点击行为。
      if (Math.abs(dy) < DRAG_START) {
        if (expanded) event.preventDefault()
        return
      }
      event.preventDefault()
      beginDrag(touch.clientY)
      applyDrag(touch.clientY)
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (touchId === null) return
      const touch = event.changedTouches[0]
      if (active || scrollActive) {
        // 拖动结束后不要补发 click，避免误触按钮或提交表单。
        event.preventDefault()
        flushDrag(touch?.clientY)
      }
      nativeTracking = false
      topPullStartY = null
      touchId = null
      finish()
    }

    const onTouchCancel = () => {
      if (touchId === null) return
      touchId = null
      nativeTracking = false
      topPullStartY = null
      cancelPending()
      finish(false)
      restoreOverflow()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      if (!event.isPrimary || pointerId !== null) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      if (isInteractive(event.target)) return

      cancelPending()
      commitFling()
      restoreOverflow()
      measured = false
      pointerId = event.pointerId
      startX = event.clientX
      startY = event.clientY
      startTime = performance.now()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return

      const dx = event.clientX - startX
      const dy = event.clientY - startY

      if (active) {
        event.preventDefault()
        recordDragSample(event.clientY)
        scheduleDrag(event.clientY)
        return
      }

      if (scrollActive) {
        // 展开手势交接后的内容滚动，和触摸走同一条路径。
        event.preventDefault()
        applyScroll(event.clientY)
        return
      }

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
      beginDrag(event.clientY, true)
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
      finish(false)
    }

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault()
        event.stopPropagation()
        suppressClickUntil = 0
      }
    }

    // 滚轮 / 触控板滚动时先把内容惯性落到 scrollTop，避免和原生滚动叠加。
    const onWheel = () => commitFling()

    dialog.addEventListener('touchstart', onTouchStart, { passive: true })
    dialog.addEventListener('touchmove', onTouchMove, { passive: false })
    dialog.addEventListener('touchend', onTouchEnd, { passive: false })
    dialog.addEventListener('touchcancel', onTouchCancel)
    dialog.addEventListener('pointerdown', onPointerDown)
    dialog.addEventListener('pointermove', onPointerMove, { passive: false })
    dialog.addEventListener('pointerup', onPointerUp)
    dialog.addEventListener('pointercancel', onPointerCancel)
    dialog.addEventListener('click', onClickCapture, true)
    dialog.addEventListener('wheel', onWheel, { passive: true })

    return () => {
      cancelPending()
      cancelSnap()
      viewportObserver?.disconnect()
      viewportObserver = null
      if (viewportTimer) {
        window.clearTimeout(viewportTimer)
        viewportTimer = 0
      }
      if (revealFrame) {
        cancelAnimationFrame(revealFrame)
        revealFrame = 0
      }
      if (revealTimer) {
        window.clearTimeout(revealTimer)
        revealTimer = 0
      }
      // 退场 / 卸载时把键盘期间冻结的背景高度还回去。
      if (frame) frame.style.height = ''
      if (bleed) bleed.hidden = true
      // 退场 / 卸载时把内容惯性落在 scrollTop 上，内容位置不变，不会跳回旧值。
      commitFling()
      restoreOverflow()
      nativeTracking = false
      topPullStartY = null
      scrollActive = false
      dialog.removeEventListener('touchstart', onTouchStart)
      dialog.removeEventListener('touchmove', onTouchMove)
      dialog.removeEventListener('touchend', onTouchEnd)
      dialog.removeEventListener('touchcancel', onTouchCancel)
      dialog.removeEventListener('pointerdown', onPointerDown)
      dialog.removeEventListener('pointermove', onPointerMove)
      dialog.removeEventListener('pointerup', onPointerUp)
      dialog.removeEventListener('pointercancel', onPointerCancel)
      dialog.removeEventListener('click', onClickCapture, true)
      dialog.removeEventListener('wheel', onWheel)
      dialog.removeEventListener('focusin', handleFocusIn)
      clearPointerChrome()
    }
  }, [
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
  ])
}
