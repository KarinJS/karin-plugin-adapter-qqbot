import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '@/lib/uiMotion'

export interface PhoneToastMessage {
  id: number
  text: string
}

interface PhoneToastProps {
  message: PhoneToastMessage | null
  onDone: () => void
}

/**
 * 样机内部的轻提示。
 *
 * 停留在屏幕底部、输入区上方，出现和消失都只动 opacity / transform，
 * 不参与页面布局。
 */
export const PhoneToast = ({ message, onDone }: PhoneToastProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const element = ref.current
    if (!element || !message) return

    gsap.killTweensOf(element)
    const reduce = prefersReducedMotion()

    gsap.fromTo(
      element,
      { autoAlpha: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.96 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: reduce ? 0.12 : 0.26,
        ease: 'power3.out',
      }
    )

    const timer = window.setTimeout(
      () => {
        gsap.to(element, {
          autoAlpha: 0,
          y: reduce ? 0 : 6,
          duration: reduce ? 0.1 : 0.18,
          ease: 'power2.in',
          onComplete: () => doneRef.current(),
        })
      },
      reduce ? 1400 : 1700
    )

    return () => {
      window.clearTimeout(timer)
      gsap.killTweensOf(element)
    }
  }, [message])

  if (!message) return null

  return (
    <div
      ref={ref}
      role='status'
      aria-live='polite'
      style={{ visibility: 'hidden' }}
      className='pointer-events-none absolute bottom-[158px] left-1/2 z-[60] max-w-[78%] -translate-x-1/2 rounded-full bg-[var(--qq-toast-bg)] px-4 py-2 text-center text-[12.5px] leading-[1.35] font-medium text-[var(--qq-toast-text)] backdrop-blur-md'
    >
      {message.text}
    </div>
  )
}
