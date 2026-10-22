import type { CSSProperties } from 'react'
import { SHEET_BACKDROP_COLOR } from '@/lib/sheetMotion'

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
 * 遮罩本身的透明度保持 1，只让背景色的 alpha 随抽屉一起变化：
 * 如果直接动 opacity，抽屉会被一起淡入淡出。
 */
export const mobileSheetBackdropStyle: CSSProperties = {
  backgroundColor: SHEET_BACKDROP_COLOR,
  // HeroUI 遮罩自带 opacity 过渡，会和 GSAP 驱动的压暗冲突。
  transition: 'none',
} as CSSProperties
