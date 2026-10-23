import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-14 text-center'>
    <div className='mb-4 flex size-12 items-center justify-center rounded-full border border-border bg-surface text-muted'>
      {icon}
    </div>
    <h3 className='text-base leading-[1.15] font-semibold tracking-[-0.02em]'>{title}</h3>
    <p className='mt-2 max-w-sm text-sm leading-6 text-muted'>{description}</p>
    {action ? <div className='mt-5'>{action}</div> : null}
  </div>
)
