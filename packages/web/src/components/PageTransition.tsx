import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 路由切换时只做一次很短的淡入上移，避免页面内容整体闪跳。
 *
 * `sectionKey` 用来把同一个区块下的子路由（例如切换机器人）视为同一次切换，
 * 切换机器人时只更新内容，不重新播放入场动画。
 */
export const PageTransition = ({
  children,
  className,
  sectionKey,
}: {
  children: ReactNode
  className?: string
  sectionKey?: string
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const transitionKey = sectionKey ?? location.pathname

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      gsap.fromTo(
        ref.current,
        { autoAlpha: 0, y: reduceMotion ? 0 : 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reduceMotion ? 0.15 : 0.24,
          ease: 'power3.out',
          overwrite: 'auto',
          clearProps: 'transform,visibility,opacity',
        }
      )
    },
    { scope: ref, dependencies: [transitionKey], revertOnUpdate: true }
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
