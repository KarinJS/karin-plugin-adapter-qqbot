/**
 * 底部抽屉的动画参数。
 *
 * 进场、退场和高度吸附统一使用 75% → 100% 吸附动画的曲线与时长：
 * 0.5s power3.out，对应 CSS cubic-bezier(0.165, 0.84, 0.44, 1)。
 * 背景外壳的缩放也使用同一组时长与曲线。
 */
export const SHEET_MOTION_DURATION = 0.5
/** 对应 CSS cubic-bezier(0.165, 0.84, 0.44, 1)，即 easeOutQuart。 */
export const SHEET_MOTION_EASE = 'power3.out'

export const SHEET_ENTER_DURATION = SHEET_MOTION_DURATION
export const SHEET_EXIT_DURATION = SHEET_MOTION_DURATION
export const SHEET_ENTER_EASE = SHEET_MOTION_EASE
export const SHEET_EXIT_EASE = SHEET_MOTION_EASE

/** 高度吸附的时长与曲线；与进场 / 退场完全一致。 */
export const SHEET_SNAP_DURATION = SHEET_MOTION_DURATION

/** 抽屉默认高度占可用屏幕高度的比例。 */
export const SHEET_COLLAPSED_RATIO = 0.5
/** 松手时高于这个比例吸附到全屏；低于 25% 退场；其余回到半屏。 */
export const SHEET_EXPAND_THRESHOLD = 0.75
/** 松手时低于这个比例直接退场。 */
export const SHEET_DISMISS_THRESHOLD = 0.25
