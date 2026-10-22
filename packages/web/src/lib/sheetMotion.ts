/**
 * 底部抽屉的动画参数。
 *
 * 时长在原来的 0.42s / 0.28s 基础上各增加 0.5s；
 * 曲线与 styles.css 里的 --sheet-enter-ease / --sheet-exit-ease 对应，
 * 背景外壳的缩放和抽屉本身必须使用同一组时长与曲线。
 */
export const SHEET_ENTER_DURATION = 0.92
export const SHEET_EXIT_DURATION = 0.78

/** 对应 CSS cubic-bezier(0.165, 0.84, 0.44, 1)，即 easeOutQuart。 */
export const SHEET_ENTER_EASE = 'power3.out'
/** 对应 CSS cubic-bezier(0.32, 0, 0.67, 0)，即 easeInCubic。 */
export const SHEET_EXIT_EASE = 'power2.in'

/** 高度吸附的时长；曲线沿用弹出 / 退场的曲线。 */
export const SHEET_SNAP_DURATION = 0.5

/** 抽屉默认高度占可用屏幕高度的比例。 */
export const SHEET_COLLAPSED_RATIO = 0.5
/** 拖动超过这个高度比例就吸附到全屏，否则回到半屏。 */
export const SHEET_EXPAND_THRESHOLD = 0.75
