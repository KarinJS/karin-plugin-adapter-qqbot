import { cn } from '@heroui/react'
import type { ReactNode } from 'react'

interface EditorSectionProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  /** 供配置步骤定位；只有需要被引导跳转的区块才传。 */
  anchor?: string
}

/**
 * 编辑区里的无边框分组。
 *
 * 右侧表单本身已经在一个大的滚动平面里，再套卡片会叠出很多边框；
 * 这里只保留小标题、说明和内容，分组靠间距和背景区分。
 */
export const EditorSection = ({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  anchor,
}: EditorSectionProps) => (
  <section data-guide-anchor={anchor} className={cn('flex flex-col gap-4', className)}>
    <header className='flex items-end justify-between gap-3 px-1'>
      <div className='min-w-0'>
        <h2 className='text-[15px] leading-tight font-semibold tracking-[-0.01em]'>{title}</h2>
        {description ? <p className='mt-1 text-xs leading-5 text-muted'>{description}</p> : null}
      </div>
      {actions ? <div className='shrink-0'>{actions}</div> : null}
    </header>
    <div className={cn('flex flex-col gap-4', contentClassName)}>{children}</div>
  </section>
)
