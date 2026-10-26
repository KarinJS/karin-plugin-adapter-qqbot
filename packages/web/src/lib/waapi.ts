/**
 * 松手后的动画统一交给 WAAPI。
 *
 * transform / opacity 的 WAAPI 动画由合成器驱动，主线程掉帧不会影响它，
 * 和原生滚动的流畅度是同一档。GSAP 的曲线用等距采样点还原：
 * WAAPI 的 easing 只接受 CSS 曲线，这里把 power2 / power3 采样成关键帧，
 * 浏览器在采样点之间线性插值，60 个点（约 8ms 一段）肉眼与 GSAP 一致。
 */

export const EASE_POWER2_IN = (t: number) => t * t
export const EASE_POWER2_OUT = (t: number) => 1 - (1 - t) * (1 - t)
export const EASE_POWER3_OUT = (t: number) => 1 - (1 - t) ** 3

const STEPS = 60

/**
 * 按进度 0→1 生成关键帧；format 负责把进度变成 transform / opacity。
 * steps 可以调高：指数衰减的惯性首段速度最快，采样点太稀会看出折线。
 */
export const animateProgress = (
  element: Element,
  format: (progress: number) => Keyframe,
  ease: (t: number) => number,
  duration: number,
  onFinish?: () => void,
  steps = STEPS
) => {
  const frames = Array.from({ length: steps + 1 }, (_, index) => format(ease(index / steps)))
  const animation = element.animate(frames, {
    duration: duration * 1000,
    easing: 'linear',
    fill: 'forwards',
  })

  animation.onfinish = () => {
    // 先把最终值写回内联样式，再撤掉 fill，避免结束瞬间跳回旧值。
    animation.cancel()
    onFinish?.()
  }

  return animation
}

/** 读当前 transform 的平移量；WAAPI 动画进行中也能读到实时值。 */
export const readTranslate = (element: Element | null | undefined, axis: 'x' | 'y' = 'y') => {
  if (!element) return 0

  const transform = getComputedStyle(element).transform
  if (!transform || transform === 'none') return 0

  const matrix = new DOMMatrixReadOnly(transform)
  return axis === 'x' ? matrix.m41 : matrix.m42
}

/** 读当前 transform 的缩放；用于从动画中间接管。 */
export const readScale = (element: Element | null | undefined) => {
  if (!element) return 1

  const transform = getComputedStyle(element).transform
  if (!transform || transform === 'none') return 1

  return new DOMMatrixReadOnly(transform).m11 || 1
}
