/**
 * 翻页 / 吸附手势的轻扫判定。
 *
 * 距离和速度都按目标方向归一化：正数表示朝目标方向。
 * 速度取最后一次有效采样的瞬时值，不用整段手势的平均速度。
 */

/** 速度分支要求的最小位移，避免原地快速点一下也触发翻页。 */
export const FLICK_MIN_DISTANCE = 24

/** 离手速度阈值，单位 px/ms。 */
export const FLICK_VELOCITY_THRESHOLD = 0.45

/** 最后一次移动超过这个时间，视为手指已经停住，不再按速度翻页。 */
export const FLICK_VELOCITY_STALE = 100

/** 速度采样之间至少要有这么长的时间差，避免高采样率下除以接近 0 的 dt。 */
export const FLICK_MIN_SAMPLE_DT = 4

/** 只保留最近几次采样；高刷屏的 touchmove 可能非常密集。 */
export const FLICK_SAMPLE_LIMIT = 8

export interface FlickSample {
  t: number
  value: number
}

/**
 * 取离手瞬间的瞬时速度（px/ms）。
 *
 * 从最近一次采样往前找第一段足够长的区间，而不是对整段手势求平均；
 * 如果手指在松手前已经停住，返回 0。
 */
export const getReleaseVelocity = (samples: readonly FlickSample[], now = performance.now()) => {
  const last = samples[samples.length - 1]
  if (!last || now - last.t > FLICK_VELOCITY_STALE) return 0

  for (let i = samples.length - 2; i >= 0; i--) {
    const previous = samples[i]
    if (!previous) continue

    const dt = last.t - previous.t
    if (dt >= FLICK_MIN_SAMPLE_DT) return (last.value - previous.value) / dt
  }

  return 0
}

export const pushFlickSample = (samples: FlickSample[], value: number, now = performance.now()) => {
  samples.push({ t: now, value })
  if (samples.length > FLICK_SAMPLE_LIMIT) samples.shift()
}

/** 位移和速度都已按目标方向归一化；速度达到阈值时才走轻扫分支。 */
export const isFlick = (distance: number, velocity: number) =>
  distance >= FLICK_MIN_DISTANCE && velocity >= FLICK_VELOCITY_THRESHOLD

/**
 * 翻页判定：位移达到常规距离阈值，或者越过最小防误触距离且离手速度达标。
 * 慢速长滑未达到距离阈值时不翻页；快速短滑靠速度翻页。
 */
export const shouldAdvance = (distance: number, velocity: number, distanceThreshold: number) =>
  distance >= distanceThreshold || isFlick(distance, velocity)
