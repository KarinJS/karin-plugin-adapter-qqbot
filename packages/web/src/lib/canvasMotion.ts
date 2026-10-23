import { UI_MOTION_DURATION, UI_MOTION_EASE } from '@/lib/uiMotion'

/**
 * Karin iframe 内桌面画布的翻页参数。
 *
 * 页面和侧边栏滑块用同一组时长与曲线，翻页时两者保持同一条进度：
 * 0.5s power3.out，和手机端底部抽屉一致。
 */
export const CANVAS_SLIDE_DURATION = UI_MOTION_DURATION
export const CANVAS_SLIDE_EASE = UI_MOTION_EASE
