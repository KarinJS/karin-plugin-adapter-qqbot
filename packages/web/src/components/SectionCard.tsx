import { Card, cn } from '@heroui/react'
import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export const SectionCard = ({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: SectionCardProps) => (
  <Card className={cn('border border-border/80 bg-surface shadow-none', className)}>
    <Card.Header className='flex flex-row items-start justify-between gap-4 p-5 pb-0'>
      <div className='min-w-0'>
        <Card.Title className='text-base font-semibold tracking-tight'>{title}</Card.Title>
        {description ? <Card.Description className='mt-1 text-sm text-muted'>{description}</Card.Description> : null}
      </div>
      {actions ? <div className='shrink-0'>{actions}</div> : null}
    </Card.Header>
    <Card.Content className={cn('p-5', contentClassName)}>{children}</Card.Content>
  </Card>
)
