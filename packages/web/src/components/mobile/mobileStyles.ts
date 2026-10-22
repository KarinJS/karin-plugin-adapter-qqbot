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

/** 抽屉背后压暗遮罩。遮罩不做透明度渐变，抽屉打开时直接到位。 */
export const mobileSheetBackdropStyle: CSSProperties = {
  backgroundColor: 'rgb(0 0 0 / 0.38)',
  // HeroUI 遮罩自带 opacity 过渡，会和“100% 不透明弹出”冲突。
  transition: 'none',
} as CSSProperties

/** 分段控件的选中态：跟随主题表面色，而不是 HeroUI 默认的强调色。 */
export const mobileSegmentSelectedStyle: CSSProperties = {
  '--toggle-button-bg-selected': 'var(--surface)',
  '--toggle-button-bg-selected-hover': 'var(--surface)',
  '--toggle-button-bg-selected-pressed': 'var(--surface)',
  '--toggle-button-fg-selected': 'var(--foreground)',
} as CSSProperties
