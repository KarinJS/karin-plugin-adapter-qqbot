import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, type RefObject } from 'react'

interface MorphBackButtonProps {
  scrollRef: RefObject<HTMLDivElement | null>
  onBack: () => void
}

/**
 * 详情页的返回按钮。
 *
 * 停留在页面顶部时是带文字的胶囊；内容向上滚动时，按钮宽度和文字一起连续收缩，
 * 最终变成左上角悬浮的圆形返回键，而不是到某个阈值突然切换。
 */
export const MorphBackButton = ({ scrollRef, onBack }: MorphBackButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const scroller = scrollRef.current
    const button = buttonRef.current
    if (!scroller || !button) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let lastProgress = -1

    const update = () => {
      frameRef.current = 0
      const progress = reduceMotion ? (scroller.scrollTop > 8 ? 1 : 0) : Math.min(1, scroller.scrollTop / 44)
      // 滚过 44px 后进度一直是 1；每帧重复写自定义属性会白白触发样式重算。
      if (progress === lastProgress) return
      lastProgress = progress
      button.style.setProperty('--back-p', progress.toFixed(3))
    }

    const schedule = () => {
      if (frameRef.current) return
      frameRef.current = requestAnimationFrame(update)
    }

    update()
    scroller.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      cancelAnimationFrame(frameRef.current)
      scroller.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [scrollRef])

  return (
    <div className='pointer-events-none sticky top-0 z-20 flex h-14 items-center px-4'>
      <button
        ref={buttonRef}
        type='button'
        className='pointer-events-auto flex h-10 items-center justify-center overflow-hidden rounded-full border text-sm font-medium text-foreground [--back-p:0] w-[calc(2.5rem_+_(1_-_var(--back-p))_*_6.5rem)] px-[calc(0.5rem_+_(1_-_var(--back-p))_*_0.5rem)] border-[color-mix(in_oklab,var(--border)_calc(var(--back-p)*100%),transparent)] bg-[color-mix(in_oklab,var(--background)_calc(var(--back-p)*82%),transparent)] shadow-[0_calc(var(--back-p)*6px)_calc(var(--back-p)*18px)_rgb(0_0_0/calc(var(--back-p)*0.12))] backdrop-blur-[calc(var(--back-p)*18px)] [transition:background-color_100ms_linear,border-color_100ms_linear] motion-reduce:[transition:none] [@media(prefers-reduced-transparency:reduce)]:bg-[color-mix(in_oklab,var(--background)_calc(var(--back-p)*100%),transparent)] [@media(prefers-reduced-transparency:reduce)]:[backdrop-filter:none] [@media(prefers-reduced-transparency:reduce)]:[-webkit-backdrop-filter:none]'
        aria-label='返回机器人列表'
        onClick={onBack}
      >
        <ArrowLeft className='size-4 shrink-0' aria-hidden='true' />
        <span className='overflow-hidden whitespace-nowrap max-w-[calc((1_-_var(--back-p))_*_6rem)] ml-[calc((1_-_var(--back-p))_*_0.5rem)] opacity-[calc(1_-_var(--back-p))]'>
          机器人列表
        </span>
      </button>
    </div>
  )
}
