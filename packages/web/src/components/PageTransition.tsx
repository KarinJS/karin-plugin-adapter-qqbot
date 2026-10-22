import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * 路由切换时只做一次很短的淡入上移，避免页面内容整体闪跳。
 */
export const PageTransition = ({ children, className }: { children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()

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
    { scope: ref, dependencies: [location.pathname], revertOnUpdate: true }
  )

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
