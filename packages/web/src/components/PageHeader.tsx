import { cn } from '@heroui/react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  titleSuffix?: ReactNode
  description?: string
  actions?: ReactNode
  className?: string
}

export const PageHeader = ({ eyebrow, title, titleSuffix, description, actions, className }: PageHeaderProps) => (
  <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className='min-w-0'>
      {eyebrow ? (
        <p className='mb-2 text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase'>{eyebrow}</p>
      ) : null}
      <div className='flex items-end gap-1.5'>
        <h1 className='text-2xl leading-[1.15] font-semibold tracking-[-0.02em] sm:text-[1.75rem]'>{title}</h1>
        {titleSuffix ? <span className='translate-y-0.5'>{titleSuffix}</span> : null}
      </div>
      {description ? <p className='mt-2 max-w-2xl text-sm leading-6 text-muted'>{description}</p> : null}
    </div>
    {actions ? <div className='flex shrink-0 items-center gap-2'>{actions}</div> : null}
  </header>
)
