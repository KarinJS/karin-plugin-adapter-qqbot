import { cn } from '@heroui/react'

interface BrandProps {
  compact?: boolean
  className?: string
}

export const Brand = ({ compact = false, className }: BrandProps) => (
  <div className={cn('flex items-center gap-3', className)}>
    <span
      className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background'
      aria-hidden='true'
    >
      Q
    </span>
    {compact ? null : (
      <span className='min-w-0'>
        <span className='block text-sm font-semibold tracking-tight'>QQBot</span>
        <span className='block text-[0.6875rem] tracking-wide text-muted'>Karin 适配器</span>
      </span>
    )}
  </div>
)
