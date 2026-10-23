import type { CSSProperties } from 'react'

/**
 * 手机端 bottom sheet 共用样式。
 *
 * 高度不再写死：打开时由 MobileSheet 按可用高度设为 50%，拖动 / 吸附时动态变化。
 * 顶部圆角同时写物理和逻辑属性：部分安卓浏览器（例如安卓 Edge）在
 * overflow + backdrop-filter 的组合下会按逻辑属性绘制，只写 border-radius 会丢圆角。
 */
export const mobileSheetStyle: CSSProperties = {
  padding: 0,
  borderRadius: '28px 28px 0 0',
  borderTopLeftRadius: '28px',
  borderTopRightRadius: '28px',
  borderStartStartRadius: '28px',
  borderStartEndRadius: '28px',
  // HeroUI 自己还有一条 translate 过渡，会和 GSAP 的 transform 叠加；
  // 这里关掉，滑入滑出完全由 useSheetMotion 驱动。
  translate: 'none',
  transition: 'none',
} as CSSProperties

/**
 * 抽屉背后压暗遮罩。
 *
 * 压暗交给抽屉里的独立遮罩层（data-sheet-scrim），这里保持透明。
 * 遮罩层只动 opacity，属于合成属性；如果直接动背景色，
 * 拖动和进出场时每帧都要重绘整块全屏遮罩。
 */
export const mobileSheetBackdropStyle: CSSProperties = {
  backgroundColor: 'transparent',
  // HeroUI 遮罩自带 opacity 过渡，会和 GSAP 驱动的遮罩层冲突。
  transition: 'none',
} as CSSProperties
