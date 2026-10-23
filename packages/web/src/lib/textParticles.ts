import { gsap } from 'gsap'
import { prefersReducedMotion } from '@/lib/uiMotion'

const PARTICLE_Z_INDEX = 100000
const TEXT_MARGIN = 48
const BADGE_MARGIN = 40
const SAMPLE_STEP = 3
const MAX_PARTICLES = 2600
const MAX_DPR = 2

interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

export interface TextSnapshot {
  text: string
  rect: RectLike
  font: string
  fontSize: number
  color: string
  letterSpacing: string
}

export interface BoxSnapshot {
  text: string
  rect: RectLike
  radius: number
  background: string
  borderColor: string
  borderWidth: number
  color: string
  font: string
  fontSize: number
}

export interface ParticleHandle {
  cancel: () => void
}

interface Particle {
  x: number
  y: number
  dx: number
  dy: number
  size: number
  color: string
  alpha: number
}

interface SampleSurface {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  dpr: number
  width: number
  height: number
}

interface ParticleLayer {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  left: number
  top: number
  width: number
  height: number
}

const readRect = (rect: DOMRect): RectLike => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
})

/** 记录标题文字当前的排版信息；下一帧文字变了就用它做粒子对照。 */
export const snapshotText = (element: HTMLElement | null): TextSnapshot | null => {
  if (!element) return null

  const text = element.textContent?.trim() ?? ''
  const rect = element.getBoundingClientRect()
  if (!text || rect.width < 1 || rect.height < 1) return null

  const style = window.getComputedStyle(element)
  return {
    text,
    rect: readRect(rect),
    font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
    fontSize: Number.parseFloat(style.fontSize) || 20,
    color: style.color,
    letterSpacing: style.letterSpacing,
  }
}

/** 记录「未保存」这类小标签的盒子和文字样式，供粒子消散使用。 */
export const snapshotBox = (element: HTMLElement | null): BoxSnapshot | null => {
  if (!element) return null

  const rect = element.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return null

  const style = window.getComputedStyle(element)
  return {
    text: element.textContent?.trim() ?? '',
    rect: readRect(rect),
    radius: Number.parseFloat(style.borderTopLeftRadius) || 0,
    background: style.backgroundColor,
    borderColor: style.borderTopColor,
    borderWidth: Number.parseFloat(style.borderTopWidth) || 0,
    color: style.color,
    font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
    fontSize: Number.parseFloat(style.fontSize) || 11,
  }
}

const createSampleSurface = (width: number, height: number): SampleSurface | null => {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  context.scale(dpr, dpr)

  return { canvas, context, dpr, width, height }
}

/**
 * 把画布上的像素按固定步长抽成粒子。
 *
 * 粒子的颜色和透明度直接取自像素，旧文字先做一点模糊，
 * 散开时边缘会软一些，不会像硬切图块。
 */
const collectParticles = (
  surface: SampleSurface,
  offsetX: number,
  offsetY: number,
  alphaThreshold: number
): Particle[] => {
  const { canvas, context, dpr, width, height } = surface
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data
  const step = Math.max(1, Math.round(SAMPLE_STEP * dpr))
  const size = SAMPLE_STEP * 0.82
  const particles: Particle[] = []

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const index = (y * canvas.width + x) * 4
      const alpha = data[index + 3]
      if (alpha < alphaThreshold) continue

      const cssX = (x + step / 2) / dpr
      const cssY = (y + step / 2) / dpr
      if (cssX > width || cssY > height) continue

      const angle = Math.random() * Math.PI * 2
      const radius = 6 + Math.random() * 22
      particles.push({
        x: offsetX + cssX,
        y: offsetY + cssY,
        dx: Math.cos(angle) * radius,
        dy: Math.sin(angle) * radius,
        size,
        color: `rgb(${data[index]} ${data[index + 1]} ${data[index + 2]})`,
        alpha: alpha / 255,
      })

      if (particles.length >= MAX_PARTICLES) return particles
    }
  }

  return particles
}

const sampleText = (
  snapshot: TextSnapshot,
  offsetX: number,
  offsetY: number,
  blurred: boolean
): Particle[] => {
  const width = Math.max(1, Math.ceil(snapshot.rect.width))
  const height = Math.max(1, Math.ceil(snapshot.rect.height))
  const surface = createSampleSurface(width, height)
  if (!surface) return []

  const { context } = surface
  context.font = snapshot.font
  const spacingContext = context as CanvasRenderingContext2D & { letterSpacing?: string }
  if (snapshot.letterSpacing !== 'normal') spacingContext.letterSpacing = snapshot.letterSpacing
  context.fillStyle = snapshot.color
  context.textBaseline = 'alphabetic'
  if (blurred) context.filter = 'blur(1.1px)'

  // 文字在行盒里垂直居中：用字体自身的上下沿算基线，和 DOM 里的位置对齐。
  const metrics = context.measureText(snapshot.text)
  const ascent = metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent || snapshot.fontSize * 0.8
  const descent = metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent || snapshot.fontSize * 0.2
  const baseline = Math.max(ascent, (height - ascent - descent) / 2 + ascent)
  context.fillText(snapshot.text, 0, baseline)
  context.filter = 'none'

  return collectParticles(surface, offsetX, offsetY, 24)
}

const sampleBox = (snapshot: BoxSnapshot, offsetX: number, offsetY: number): Particle[] => {
  const width = Math.max(1, Math.ceil(snapshot.rect.width))
  const height = Math.max(1, Math.ceil(snapshot.rect.height))
  const surface = createSampleSurface(width, height)
  if (!surface) return []

  const { context } = surface
  const border = snapshot.borderWidth
  const inset = border > 0 ? border / 2 : 0
  const radius = Math.max(0, Math.min(snapshot.radius, height / 2, width / 2) - inset)

  context.beginPath()
  context.roundRect(inset, inset, Math.max(1, width - inset * 2), Math.max(1, height - inset * 2), radius)
  context.fillStyle = snapshot.background
  context.fill()
  if (border > 0) {
    context.strokeStyle = snapshot.borderColor
    context.lineWidth = border
    context.stroke()
  }

  context.font = snapshot.font
  context.fillStyle = snapshot.color
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(snapshot.text, width / 2, height / 2)

  return collectParticles(surface, offsetX, offsetY, 16)
}

/**
 * 粒子画布铺在 body 上，fixed 定位并高于页面内所有容器，
 * 这样名字和标签散开时不会被滚动区、遮罩或顶栏模糊裁掉。
 */
const createLayer = (rects: RectLike[], margin: number): ParticleLayer | null => {
  const left = Math.min(...rects.map((rect) => rect.left)) - margin
  const top = Math.min(...rects.map((rect) => rect.top)) - margin
  const right = Math.max(...rects.map((rect) => rect.left + rect.width)) + margin
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height)) + margin
  const width = Math.max(1, Math.ceil(right - left))
  const height = Math.max(1, Math.ceil(bottom - top))
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * dpr))
  canvas.height = Math.max(1, Math.round(height * dpr))
  canvas.setAttribute('aria-hidden', 'true')
  canvas.setAttribute('data-particle-canvas', '')
  canvas.style.position = 'fixed'
  canvas.style.left = `${left}px`
  canvas.style.top = `${top}px`
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  canvas.style.zIndex = String(PARTICLE_Z_INDEX)
  canvas.style.pointerEvents = 'none'
  document.body.appendChild(canvas)

  const context = canvas.getContext('2d')
  if (!context) {
    canvas.remove()
    return null
  }
  context.scale(dpr, dpr)

  return { canvas, context, left, top, width, height }
}

const paintMorph = (
  layer: ParticleLayer,
  oldParticles: Particle[],
  newParticles: Particle[],
  out: number,
  inn: number
) => {
  const { context, width, height } = layer
  context.clearRect(0, 0, width, height)

  for (const particle of oldParticles) {
    const alpha = particle.alpha * (1 - out)
    if (alpha <= 0) continue
    context.globalAlpha = alpha
    context.fillStyle = particle.color
    const x = particle.x + particle.dx * out
    const y = particle.y + particle.dy * out
    context.fillRect(x - particle.size / 2, y - particle.size / 2, particle.size, particle.size)
  }

  for (const particle of newParticles) {
    const alpha = particle.alpha * inn
    if (alpha <= 0) continue
    const remaining = 1 - inn
    context.globalAlpha = alpha
    context.fillStyle = particle.color
    const x = particle.x + particle.dx * remaining
    const y = particle.y + particle.dy * remaining
    context.fillRect(x - particle.size / 2, y - particle.size / 2, particle.size, particle.size)
  }

  context.globalAlpha = 1
}

/**
 * 旧名字打散、新名字收拢。
 *
 * 总时长和表单翻页一致（0.5s）：旧粒子 0.32s 散开淡出，
 * 新粒子从 0.1s 开始收拢；0.3s 时粒子已经接近最终位置，
 * 这时真实文字淡入、粒子画布同步淡出，避免最后一帧从点阵硬切成清晰文字。
 */
export const morphText = (previous: TextSnapshot, element: HTMLElement | null): ParticleHandle | null => {
  if (!element || prefersReducedMotion()) return null

  const next = snapshotText(element)
  if (!next) return null

  const layer = createLayer([previous.rect, next.rect], TEXT_MARGIN)
  if (!layer) return null

  const oldParticles = sampleText(previous, previous.rect.left - layer.left, previous.rect.top - layer.top, true)
  const newParticles = sampleText(next, next.rect.left - layer.left, next.rect.top - layer.top, false)
  if (oldParticles.length + newParticles.length === 0) {
    layer.canvas.remove()
    return null
  }

  const previousOpacity = element.style.opacity
  const parsedOpacity = Number.parseFloat(previousOpacity)
  const restoredOpacity = Number.isFinite(parsedOpacity) ? parsedOpacity : 1
  element.style.opacity = '0'
  layer.canvas.style.opacity = '1'

  const state = { out: 0, inn: 0 }
  const render = () => paintMorph(layer, oldParticles, newParticles, state.out, state.inn)
  render()

  let finished = false
  let timeline: gsap.core.Timeline | null = null
  const cleanup = () => {
    if (finished) return
    finished = true
    timeline?.kill()
    layer.canvas.remove()
    element.style.opacity = previousOpacity
  }

  timeline = gsap.timeline({ onUpdate: render, onComplete: cleanup })
  timeline.to(state, { out: 1, duration: 0.32, ease: 'power2.out' }, 0)
  timeline.to(state, { inn: 1, duration: 0.34, ease: 'power3.out' }, 0.1)
  // 同一段曲线、同一段时长做交叉淡化，两者的透明度之和始终是 1。
  timeline.to(element, { opacity: restoredOpacity, duration: 0.2, ease: 'power2.out' }, 0.3)
  timeline.to(layer.canvas, { opacity: 0, duration: 0.2, ease: 'power2.out' }, 0.3)

  return { cancel: cleanup }
}

/**
 * 标签整体散成粒子并淡出，用于切换机器人时移除「未保存」。
 * 标签已经从 DOM 里卸载，画布按上一帧记录的盒子重建它的样子。
 */
export const dissolveBox = (snapshot: BoxSnapshot | null): ParticleHandle | null => {
  if (!snapshot || prefersReducedMotion()) return null

  const layer = createLayer([snapshot.rect], BADGE_MARGIN)
  if (!layer) return null

  const particles = sampleBox(snapshot, snapshot.rect.left - layer.left, snapshot.rect.top - layer.top)
  if (particles.length === 0) {
    layer.canvas.remove()
    return null
  }

  const state = { progress: 0 }
  const render = () => {
    const { context, width, height } = layer
    context.clearRect(0, 0, width, height)
    for (const particle of particles) {
      const alpha = particle.alpha * (1 - state.progress)
      if (alpha <= 0) continue
      context.globalAlpha = alpha
      context.fillStyle = particle.color
      const x = particle.x + particle.dx * state.progress
      const y = particle.y + particle.dy * state.progress - state.progress * 4
      context.fillRect(x - particle.size / 2, y - particle.size / 2, particle.size, particle.size)
    }
    context.globalAlpha = 1
  }
  render()

  let finished = false
  let tween: gsap.core.Tween | null = null
  const cleanup = () => {
    if (finished) return
    finished = true
    tween?.kill()
    layer.canvas.remove()
  }

  tween = gsap.to(state, {
    progress: 1,
    duration: 0.42,
    ease: 'power2.out',
    onUpdate: render,
    onComplete: cleanup,
  })

  return { cancel: cleanup }
}
