import { UI_MOTION_DURATION, UI_MOTION_EASE } from '@/lib/uiMotion'

/**
 * 底部抽屉的动画参数。
 *
 * 进场、退场和高度吸附统一使用 75% → 100% 吸附动画的曲线与时长：
 * 0.5s power3.out，对应 CSS cubic-bezier(0.165, 0.84, 0.44, 1)。
 * 背景外壳的缩放也使用同一组时长与曲线。
 */
export const SHEET_MOTION_DURATION = UI_MOTION_DURATION
/** 对应 CSS cubic-bezier(0.165, 0.84, 0.44, 1)，即 easeOutQuart。 */
export const SHEET_MOTION_EASE = UI_MOTION_EASE

export const SHEET_ENTER_DURATION = SHEET_MOTION_DURATION
export const SHEET_EXIT_DURATION = SHEET_MOTION_DURATION
export const SHEET_ENTER_EASE = SHEET_MOTION_EASE
export const SHEET_EXIT_EASE = SHEET_MOTION_EASE

/** 高度吸附的时长与曲线；与进场 / 退场完全一致。 */
export const SHEET_SNAP_DURATION = SHEET_MOTION_DURATION

/** 抽屉遮罩层最终压暗到的不透明度。 */
export const SHEET_BACKDROP_ALPHA = 0.38

/** 抽屉打开时外壳的缩放、位移与圆角；拖到 25% 以下时按进度复原。 */
export const SHEET_FRAME_SCALE = 0.94
export const SHEET_FRAME_Y = 10
export const SHEET_FRAME_RADIUS = 24

/** 抽屉默认高度占可用屏幕高度的比例。 */
export const SHEET_COLLAPSED_RATIO = 0.5
/** 松手时高于这个比例吸附到全屏；低于 25% 退场；其余回到半屏。 */
export const SHEET_EXPAND_THRESHOLD = 0.75
/** 松手时低于这个比例直接退场。 */
export const SHEET_DISMISS_THRESHOLD = 0.25
