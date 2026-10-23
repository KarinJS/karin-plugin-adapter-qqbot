import Lenis from 'lenis'

/**
 * SmoothScroll 的 iPhone 预设。
 *
 * 步长 120px 对应 wheelMultiplier 1.2，动画时间 600ms 对应 duration 0.6，
 * 缓动使用 Lenis 默认的 easeOutExpo；触摸和触控板保持原生滚动。
 * 插件里的加速度上限 / 脉冲参数 Lenis 没有对应项，这里用 duration 近似。
 */
export const smoothScrollOptions = {
  duration: 0.6,
  wheelMultiplier: 1.2,
  smoothWheel: true,
  syncTouch: false,
  touchMultiplier: 1,
  autoRaf: true,
  respectReducedMotion: true,
}

const instances = new WeakMap<HTMLElement, Lenis>()

interface AttachOptions {
  content?: HTMLElement | null
  /** 关闭 Lenis 自己的滚轮处理，由调用方决定滚哪个容器。 */
  manual?: boolean
}

export const attachSmoothScroll = (wrapper: HTMLElement, { content, manual = false }: AttachOptions = {}) => {
  const existing = instances.get(wrapper)
  if (existing) return existing

  const lenis = new Lenis({
    ...smoothScrollOptions,
    wrapper,
    content: content ?? wrapper,
    ...(manual ? { prevent: () => true } : null),
  })

  instances.set(wrapper, lenis)
  return lenis
}

export const detachSmoothScroll = (wrapper: HTMLElement | null) => {
  if (!wrapper) return
  const lenis = instances.get(wrapper)
  if (!lenis) return
  lenis.destroy()
  instances.delete(wrapper)
}

export const getSmoothScroll = (wrapper: HTMLElement | null | undefined) =>
  wrapper ? instances.get(wrapper) ?? null : null

export const resizeSmoothScroll = (wrapper: HTMLElement | null | undefined) => {
  getSmoothScroll(wrapper)?.resize()
}

const LINE_HEIGHT = 100 / 6

/** 和 Lenis 内部一致：把行 / 页模式的滚轮增量换算成像素。 */
export const normalizeWheelDelta = (event: WheelEvent) => {
  const multiplier = event.deltaMode === 1 ? LINE_HEIGHT : event.deltaMode === 2 ? window.innerHeight : 1
  return event.deltaY * multiplier * smoothScrollOptions.wheelMultiplier
}

/**
 * 把滚轮增量交给目标容器的 Lenis。
 * 返回 false 表示这个容器没有平滑滚动实例，调用方可以退回原生 scrollTop。
 */
export const smoothScrollBy = (wrapper: HTMLElement | null | undefined, delta: number) => {
  const lenis = getSmoothScroll(wrapper)
  if (!lenis) return false
  lenis.scrollTo(lenis.targetScroll + delta)
  return true
}
