import { gsap } from 'gsap'

interface ParticleField {
  done: Promise<void>
  stop: () => void
}

interface DissolveHandle {
  cardDone: Promise<void>
  particlesDone: Promise<void>
  restore: () => void
}

const findCard = (appId: string) => {
  const escaped = CSS.escape(appId)
  const activePanel = document.querySelector<HTMLElement>('.mobile-panel[aria-hidden="false"]')
  return (
    activePanel?.querySelector<HTMLElement>(`[data-bot-id="${escaped}"]`) ??
    document.querySelector<HTMLElement>(`[data-bot-id="${escaped}"]`)
  )
}

/**
 * 在整页最上层铺一张 canvas 画粒子。
 *
 * canvas 用 fixed 定位并设置很高的 z-index，粒子会盖住底部导航、列表和其他卡片；
 * pointer-events 为 none，不会挡住动画结束后的操作。
 */
const createParticles = (rect: DOMRect, statusColor: string): ParticleField => {
  const left = Math.max(0, rect.left)
  const top = Math.max(0, rect.top)
  const right = Math.min(window.innerWidth, rect.right)
  const bottom = Math.min(window.innerHeight, rect.bottom)
  if (right - left < 2 || bottom - top < 2) {
    return { done: Promise.resolve(), stop: () => {} }
  }

  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.setAttribute('data-dissolve-particles', 'true')
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;z-index:100002;pointer-events:none;'
  document.body.appendChild(canvas)

  const context = canvas.getContext('2d')
  if (!context) {
    canvas.remove()
    return { done: Promise.resolve(), stop: () => {} }
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  canvas.width = Math.round(viewportWidth * dpr)
  canvas.height = Math.round(viewportHeight * dpr)
  context.scale(dpr, dpr)

  const dark =
    document.documentElement.classList.contains('dark') ||
    document.documentElement.dataset.theme === 'dark'
  const baseColor = dark ? 'rgb(255 255 255)' : 'rgb(24 24 24)'
  const mutedColor = dark ? 'rgb(170 170 170)' : 'rgb(90 90 90)'
  const colors = [baseColor, baseColor, mutedColor, statusColor]

  const count = Math.max(44, Math.min(96, Math.round(((right - left) * (bottom - top)) / 760)))
  const particles = Array.from({ length: count }, () => {
    const angle = -Math.PI / 4 + (Math.random() - 0.5) * 1.15
    const speed = 0.12 + Math.random() * 0.3
    return {
      x: left + Math.random() * (right - left),
      y: top + Math.random() * (bottom - top),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 0.7 + Math.random() * 2.2,
      life: 520 + Math.random() * 420,
      age: 0,
      color: colors[Math.floor(Math.random() * colors.length)] ?? baseColor,
      alpha: 0.3 + Math.random() * 0.45,
    }
  })

  let frame = 0
  let stopped = false
  let last = performance.now()
  let resolveDone: (() => void) | null = null
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
  })

  const stop = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(frame)
    canvas.remove()
    resolveDone?.()
  }

  const tick = (now: number) => {
    if (stopped) return
    const delta = Math.min(40, now - last)
    last = now
    context.clearRect(0, 0, viewportWidth, viewportHeight)

    let alive = false
    for (const particle of particles) {
      particle.age += delta
      if (particle.age >= particle.life) continue
      alive = true

      const progress = particle.age / particle.life
      const lift = (1 - Math.pow(1 - progress, 3)) * 12
      const x = particle.x + particle.vx * particle.age
      const y = particle.y + particle.vy * particle.age - lift
      const radius = particle.size * (1 - progress * 0.35)

      context.globalAlpha = particle.alpha * (1 - progress)
      context.fillStyle = particle.color
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
    }

    if (!alive) {
      stop()
      return
    }
    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)
  return { done, stop }
}

/**
 * 让机器人卡片朝右上角模糊消散，并在整页上层撒出粒子。
 *
 * 用克隆节点做动画，避免卡片被列表的 overflow 裁掉；
 * 原卡片先隐藏但保留布局，等 remove 成功后再由列表移除。
 */
export const dissolveBotCard = (appId: string, statusColor: string): DissolveHandle | null => {
  const card = findCard(appId)
  if (!card) return null

  const rect = card.getBoundingClientRect()
  if (rect.width < 2 || rect.height < 2) return null

  const previousVisibility = card.style.visibility

  // 减少动态效果时不播粒子，直接把卡片藏起来，等配置删除后自然消失。
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    card.style.visibility = 'hidden'
    return {
      cardDone: Promise.resolve(),
      particlesDone: Promise.resolve(),
      restore: () => {
        card.style.visibility = previousVisibility
      },
    }
  }

  const clone = card.cloneNode(true) as HTMLElement
  clone.removeAttribute('data-bot-id')
  clone.setAttribute('aria-hidden', 'true')
  clone.setAttribute('tabindex', '-1')
  clone.setAttribute('data-dissolve-clone', 'true')
  // 原卡片上的 pressable 过渡会和 GSAP 抢 transform / opacity，克隆体不需要按压反馈。
  clone.classList.remove('pressable')
  clone.style.cssText = [
    'position:fixed',
    `left:${rect.left}px`,
    `top:${rect.top}px`,
    `width:${rect.width}px`,
    `height:${rect.height}px`,
    'margin:0',
    'z-index:100001',
    'pointer-events:none',
    'transform-origin:50% 50%',
    'transition:none',
    `background:${getComputedStyle(card.parentElement ?? card).backgroundColor}`,
  ].join(';')
  document.body.appendChild(clone)

  card.style.visibility = 'hidden'
  const particles = createParticles(rect, statusColor)

  const cardDone = new Promise<void>((resolve) => {
    gsap.to(clone, {
      x: 56,
      y: -64,
      scale: 0.96,
      opacity: 0,
      filter: 'blur(10px)',
      duration: 0.62,
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: () => {
        clone.remove()
        resolve()
      },
    })
  })

  const restore = () => {
    gsap.killTweensOf(clone)
    clone.remove()
    card.style.visibility = previousVisibility
    particles.stop()
  }

  return { cardDone, particlesDone: particles.done, restore }
}
