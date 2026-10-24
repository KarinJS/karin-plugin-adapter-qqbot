/**
 * 手机端可按压行的按压反馈。
 *
 * 只过渡 transform / opacity；减少动态效果时保留颜色变化，去掉缩放。
 */
export const PRESSABLE_CLASS =
  'transition-[scale,opacity] duration-[120ms] ease-[var(--ease-out)] active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100'

/** 隐藏滚动条，滚动本身不受影响。 */
export const NO_SCROLLBAR_CLASS = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
