import Lenis from 'lenis'

/**
 * SmoothScroll 的 iPhone 预设。
 *
 * 步长 120px 对应 wheelMultiplier 1.2，动画时间 600ms 对应 duration 0.6，
 * 缓动使用 Lenis 默认的 easeOutExpo；触摸和触控板保持原生滚动。
 * 插件里的加速度上限 / 脉冲参数 Lenis 没有对应项，这里用 duration 近似。
 *
 * autoRaf 关掉：Lenis 默认每个实例常驻一个 rAF，移动端空闲时
 * 两个分页 + 详情页会每帧唤醒 2~3 次；改由滚轮事件按需启动共享 ticker。
 */
export const smoothScrollOptions = {
  duration: 0.6,
  wheelMultiplier: 1.2,
  smoothWheel: true,
  syncTouch: false,
  touchMultiplier: 1,
  autoRaf: false,
  respectReducedMotion: true,
}

interface SmoothScrollEntry {
  lenis: Lenis
  onWheel?: () => void
}

const instances = new WeakMap<HTMLElement, SmoothScrollEntry>()
const active = new Set<Lenis>()
let tickerFrame = 0

/**
 * 所有 Lenis 实例共用一个按需 rAF。
 *
 * 只在滚轮平滑滚动期间运行，结束后立即停下；触摸滚动完全走原生，
 * 不会因为 Lenis 的常驻循环占用主线程。
 */
const tick = (time: number) => {
  tickerFrame = 0
  let running = false
  for (const lenis of active) {
    lenis.raf(time)
    if (lenis.isScrolling === 'smooth') running = true
  }
  if (running) tickerFrame = requestAnimationFrame(tick)
}

const ensureTicker = () => {
  if (tickerFrame) return
  // 先把时间基准对齐到当前帧，否则空闲很久后的第一帧会拿到巨大的 delta。
  const now = performance.now()
  for (const lenis of active) lenis.time = now
  tickerFrame = requestAnimationFrame(tick)
}

/** 触屏设备没有滚轮，Lenis 只会白白挂上 scroll 监听和 rAF。 */
const hasFinePointer = () => window.matchMedia('(any-pointer: fine)').matches

interface AttachOptions {
  content?: HTMLElement | null
  /** 关闭 Lenis 自己的滚轮处理，由调用方决定滚哪个容器。 */
  manual?: boolean
}

export const attachSmoothScroll = (wrapper: HTMLElement, { content, manual = false }: AttachOptions = {}) => {
  const existing = instances.get(wrapper)
  if (existing) return existing.lenis
  if (!hasFinePointer()) return

  const lenis = new Lenis({
    ...smoothScrollOptions,
    wrapper,
    content: content ?? wrapper,
    ...(manual ? { prevent: () => true } : null),
  })

  const onWheel = manual ? undefined : () => ensureTicker()
  if (onWheel) wrapper.addEventListener('wheel', onWheel, { passive: true, capture: true })

  active.add(lenis)
  instances.set(wrapper, { lenis, onWheel })
  return lenis
}

export const detachSmoothScroll = (wrapper: HTMLElement | null) => {
  if (!wrapper) return
  const entry = instances.get(wrapper)
  if (!entry) return

  if (entry.onWheel) wrapper.removeEventListener('wheel', entry.onWheel, { capture: true })
  entry.lenis.destroy()
  active.delete(entry.lenis)
  instances.delete(wrapper)

  if (active.size === 0 && tickerFrame) {
    cancelAnimationFrame(tickerFrame)
    tickerFrame = 0
  }
}

export const getSmoothScroll = (wrapper: HTMLElement | null | undefined) =>
  wrapper ? instances.get(wrapper)?.lenis ?? null : null

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
  ensureTicker()
  lenis.scrollTo(lenis.targetScroll + delta)
  return true
}
