import { useGSAP } from '@gsap/react'
import { Spinner, cn } from '@heroui/react'
import { gsap } from 'gsap'
import { Check, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface SaveStatusProps {
  state: SaveState
  errorMessage?: string
}

/**
 * 保存状态提示。
 *
 * 首次出现时从顶部向下弹入，保存中切到已保存时只做一次轻微淡入，
 * 避免同一个提示反复从顶部弹跳。
 */
export const SaveStatus = ({ state, errorMessage }: SaveStatusProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const previous = useRef<SaveState>('idle')
  const [shown, setShown] = useState<SaveState>(state)
  const [mounted, setMounted] = useState(state !== 'idle')

  useEffect(() => {
    if (state !== 'idle') {
      setShown(state)
      setMounted(true)
    }
  }, [state])

  useGSAP(
    () => {
      const element = ref.current
      if (!element) return

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const wasIdle = previous.current === 'idle'
      previous.current = state

      if (state === 'idle') {
        gsap.to(element, {
          autoAlpha: 0,
          y: reduceMotion ? 0 : -10,
          duration: reduceMotion ? 0.12 : 0.18,
          ease: 'power2.in',
          overwrite: 'auto',
        })
        return
      }

      if (wasIdle) {
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: reduceMotion ? 0 : -14 },
          {
            autoAlpha: 1,
            y: 0,
            duration: reduceMotion ? 0.12 : 0.28,
            ease: reduceMotion ? 'power2.out' : 'back.out(1.35)',
            overwrite: 'auto',
          }
        )
        return
      }

      gsap.fromTo(
        element,
        { autoAlpha: 0.55 },
        { autoAlpha: 1, duration: reduceMotion ? 0.1 : 0.16, ease: 'power2.out', overwrite: 'auto' }
      )
    },
    { dependencies: [state, mounted], scope: ref }
  )

  if (!mounted) return null

  return createPortal(
    <div
      className='pointer-events-none fixed inset-x-0 z-[100001] flex justify-center'
      style={{ top: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
    >
      <div
        ref={ref}
        role='status'
        aria-live='polite'
        style={{ visibility: 'hidden' }}
        className='glass flex items-center gap-2 rounded-full border border-border/80 px-4 py-2 text-sm shadow-lg'
      >
        {shown === 'saving' ? <Spinner size='sm' aria-label='正在保存' /> : null}
        {shown === 'saved' ? <Check className='size-4 text-success' aria-hidden='true' /> : null}
        {shown === 'error' ? <TriangleAlert className='size-4 text-danger' aria-hidden='true' /> : null}
        <span
          className={cn(
            'font-medium',
            shown === 'saved' && 'text-success',
            shown === 'error' && 'text-danger',
            shown === 'saving' && 'text-muted'
          )}
        >
          {shown === 'saving' ? '保存中' : shown === 'saved' ? '已保存' : errorMessage || '保存失败'}
        </span>
      </div>
    </div>,
    document.body
  )
}
