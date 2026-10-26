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
  // HeroUI 自己还有一条 translate 过渡，会和 useSheetMotion 的 transform 叠加；
  // 这里关掉，滑入滑出完全由 useSheetMotion 驱动。
  translate: 'none',
  transition: 'none',
  // HeroUI 给 dialog 加了 will-change: translate，但位移已经挪到外层 div，
  // dialog 不再动；保留这条会多出一个没用的合成层，每帧白白多一次图层更新。
  willChange: 'auto',
  // 让 dialog 自己成为 backdrop root：顶栏 / 底栏的 backdrop-filter 只在
  // 抽屉内部取样，不再相对整页计算。抽屉是不透明的，视觉不变，但拖动时
  // 合成器要处理的范围小一圈，重绘和合成更新都更省。
  isolation: 'isolate',
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
  // HeroUI 在 [data-entering] / [data-exiting] 时会把整块遮罩的 opacity 切到 0，
  // 而抽屉就在这块遮罩里面：退场时抽屉会跟着一起瞬间消失，位移动画
  // 虽然在跑但肉眼什么都看不到。压暗已经交给内部独立的 scrim 层，
  // 这里用内联 opacity 固定住，React 每次重渲染也会保留。
  opacity: 1,
  // HeroUI 遮罩自带 opacity 过渡，会和 WAAPI 驱动的遮罩层冲突。
  transition: 'none',
  // 遮罩本身不参与动画（压暗由内部的 data-sheet-scrim 负责），
  // 不需要 HeroUI 在 entering / exiting 时给它加的 will-change，
  // 否则会多出一整层全屏合成层，外壳缩放时白白多一层要处理。
  willChange: 'auto',
} as CSSProperties
