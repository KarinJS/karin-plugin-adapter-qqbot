import { gsap } from 'gsap'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { UI_MOTION_DURATION, UI_MOTION_EASE } from '@/lib/uiMotion'

interface AnimatedHeightProps {
  children: ReactNode
}

/**
 * 内容变多或变少时，让外层跟着长高 / 缩短，而不是瞬间撑开。
 *
 * 外层高度由 GSAP 写成内联值，内层保持自然高度；ResizeObserver 只观察内层，
 * 所以动画过程中不会自己触发自己。首帧直接落位，之后每次都从当前高度过渡。
 * 只有动画进行中才裁切内容，避免平时把按钮的焦点环切掉。
 */
export const AnimatedHeight = ({ children }: AnimatedHeightProps) => {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const heightRef = useRef<number | null>(null)

  useLayoutEffect(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const sync = () => {
      const next = inner.getBoundingClientRect().height
      const previous = heightRef.current

      if (previous !== null && Math.abs(next - previous) < 0.5) return

      heightRef.current = next
      gsap.killTweensOf(outer)

      // 高度归零或从零恢复通常是面板被隐藏 / 显示，属于可见性切换，不该当成展开动画。
      if (
        previous === null ||
        previous === 0 ||
        next === 0 ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        outer.classList.remove('overflow-hidden')
        gsap.set(outer, { height: next })
        return
      }

      outer.classList.add('overflow-hidden')
      gsap.fromTo(
        outer,
        { height: outer.getBoundingClientRect().height },
        {
          height: next,
          duration: UI_MOTION_DURATION,
          ease: UI_MOTION_EASE,
          onComplete: () => outer.classList.remove('overflow-hidden'),
        }
      )
    }

    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(inner)

    return () => {
      observer.disconnect()
      gsap.killTweensOf(outer)
      outer.classList.remove('overflow-hidden')
    }
  }, [])

  return (
    <div ref={outerRef}>
      <div ref={innerRef}>{children}</div>
    </div>
  )
}
