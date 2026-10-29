import { cn } from '@heroui/react'
import { gsap } from 'gsap'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { prefersReducedMotion } from '@/lib/uiMotion'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
  disabled?: boolean
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  buttonClassName?: string
}

const SEGMENT_DURATION = 0.32
const SEGMENT_EASE = 'power3.out'

/**
 * iOS 分段控件。
 *
 * 选中块用 GSAP 在按钮之间移动，宽度和位置都按真实按钮测量；
 * 按钮本身只负责文字和按压反馈，避免出现两个状态来源。
 */
export const SegmentedControl = <T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  buttonClassName,
}: SegmentedControlProps<T>) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLSpanElement>(null)
  const firstRef = useRef(true)

  // 选中块只在 value 变化时补动画。ResizeObserver 必须单独挂载：
  // 如果和 value 放在同一个 effect 里，observer 每次重新 observe 都会先回调一次，
  // 把刚启动的 GSAP 补间直接 set 到终点，看起来就是“没有动画”。
  useLayoutEffect(() => {
    const root = rootRef.current
    const thumb = thumbRef.current
    if (!root || !thumb) return

    const active = root.querySelector<HTMLElement>(`[data-segment="${CSS.escape(value)}"]`)
    if (!active) return

    const width = active.offsetWidth
    const x = active.offsetLeft
    gsap.killTweensOf(thumb)

    if (firstRef.current) {
      firstRef.current = false
      gsap.set(thumb, { x, width })
      return
    }

    if (prefersReducedMotion()) {
      gsap.set(thumb, { x, width })
      return
    }

    gsap.to(thumb, { x, width, duration: SEGMENT_DURATION, ease: SEGMENT_EASE })
  }, [value, options.length])

  // 字体加载或窗口变化后按钮宽度会变，选中块跟着重新对齐。
  // 这里只落位、不播动画，避免和上面的切换动画抢同一个 transform。
  useLayoutEffect(() => {
    const root = rootRef.current
    const thumb = thumbRef.current
    if (!root || !thumb) return

    const observer = new ResizeObserver(() => {
      const active = root.querySelector<HTMLElement>('[data-segment][aria-selected="true"]')
      if (!active) return
      gsap.killTweensOf(thumb)
      gsap.set(thumb, { x: active.offsetLeft, width: active.offsetWidth })
    })

    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={rootRef}
      role='tablist'
      aria-label={ariaLabel}
      className={cn('relative inline-flex rounded-full bg-default p-1', className)}
    >
      <span
        ref={thumbRef}
        aria-hidden='true'
        className='pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-surface shadow-[var(--surface-shadow)]'
      />
      {options.map((option) => {
        const active = option.value === value

        return (
          <button
            key={option.value}
            type='button'
            role='tab'
            aria-selected={active}
            aria-disabled={option.disabled || undefined}
            disabled={option.disabled}
            data-segment={option.value}
            onClick={() => {
              if (option.disabled || option.value === value) return
              onChange(option.value)
            }}
            className={cn(
              'relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap',
              'transition-[color,scale] duration-150 ease-[var(--ease-out)] active:scale-[0.97]',
              'disabled:cursor-not-allowed disabled:opacity-35 disabled:active:scale-100',
              active ? 'text-foreground' : 'text-muted',
              buttonClassName
            )}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
