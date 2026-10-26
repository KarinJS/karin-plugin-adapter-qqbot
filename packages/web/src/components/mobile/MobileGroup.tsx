import { cn } from '@heroui/react'
import type { ReactNode } from 'react'
import { PRESSABLE_CLASS } from '@/lib/uiClasses'

interface MobileGroupProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  contentClassName?: string
}

/**
 * 手机端的分组容器。
 *
 * 桌面卡片有独立标题和大内边距，手机上改成 iOS 设置页式的分组：
 * 小标题留在组外，组内用行和分隔线组织内容。
 */
export const MobileGroup = ({ title, description, children, className, contentClassName }: MobileGroupProps) => (
  <section className={cn('flex flex-col gap-2', className)}>
    {title ? <h2 className='px-1 text-[13px] font-medium text-muted'>{title}</h2> : null}
    <div className={cn('overflow-hidden rounded-2xl border border-border/60 bg-surface', contentClassName)}>
      {children}
    </div>
    {description ? <p className='px-1 text-[11px] leading-5 text-muted'>{description}</p> : null}
  </section>
)

interface MobileRowProps {
  children: ReactNode
  className?: string
}

export const MobileRow = ({ children, className }: MobileRowProps) => (
  <div className={cn('border-b border-border/50 px-4 py-3 last:border-b-0', className)}>{children}</div>
)

interface MobileActionRowProps {
  icon: ReactNode
  label: string
  description?: string
  trailing?: ReactNode
  danger?: boolean
  disabled?: boolean
  onPress: () => void
  className?: string
}

export const MobileActionRow = ({
  icon,
  label,
  description,
  trailing,
  danger,
  disabled,
  onPress,
  className,
}: MobileActionRowProps) => (
  <button
    type='button'
    disabled={disabled}
    className={cn(
      PRESSABLE_CLASS,
      'flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left last:border-b-0 active:bg-default/70 disabled:opacity-50',
      className
    )}
    onClick={onPress}
  >
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-muted',
        danger && 'bg-danger/10 text-danger'
      )}
    >
      {icon}
    </span>
    <span className='min-w-0 flex-1'>
      <span className={cn('block text-sm font-medium', danger ? 'text-danger' : 'text-foreground')}>{label}</span>
      {description ? <span className='mt-0.5 block truncate text-[11px] text-muted'>{description}</span> : null}
    </span>
    {trailing}
  </button>
)

interface MobilePageHeaderProps {
  title: string
  titleSuffix?: ReactNode
  description?: string
  action?: ReactNode
}

export const MobilePageHeader = ({ title, titleSuffix, description, action }: MobilePageHeaderProps) => (
  <header className='flex items-end justify-between gap-3 px-1 pb-1'>
    <div className='min-w-0'>
      <div className='flex items-end gap-1.5'>
        <h1 className='text-[26px] leading-tight font-semibold tracking-[-0.03em]'>{title}</h1>
        {titleSuffix ? <span className='translate-y-0.5'>{titleSuffix}</span> : null}
      </div>
      {description ? <p className='mt-1 text-[12px] leading-5 text-muted'>{description}</p> : null}
    </div>
    {action ? <div className='shrink-0 pb-0.5'>{action}</div> : null}
  </header>
)
