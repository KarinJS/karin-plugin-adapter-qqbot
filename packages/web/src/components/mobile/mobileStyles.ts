import type { CSSProperties } from 'react'

/** 手机端 bottom sheet 共用尺寸：占屏幕 90%，底部圆角。 */
export const mobileSheetStyle: CSSProperties = {
  height: '90dvh',
  maxHeight: '90dvh',
  padding: 0,
  borderRadius: '28px 28px 0 0',
} as CSSProperties

/** 抽屉背后压暗遮罩。 */
export const mobileSheetBackdropStyle: CSSProperties = {
  backgroundColor: 'rgb(0 0 0 / 0.38)',
  // 入场前先保持透明，避免挂载瞬间闪一帧全黑遮罩；GSAP 会接管后续透明度。
  opacity: 0,
} as CSSProperties

/** 分段控件的选中态：跟随主题表面色，而不是 HeroUI 默认的强调色。 */
export const mobileSegmentSelectedStyle: CSSProperties = {
  '--toggle-button-bg-selected': 'var(--surface)',
  '--toggle-button-bg-selected-hover': 'var(--surface)',
  '--toggle-button-bg-selected-pressed': 'var(--surface)',
  '--toggle-button-fg-selected': 'var(--foreground)',
} as CSSProperties
