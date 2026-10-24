import { Tabs, cn } from '@heroui/react'
import type { LucideIcon } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { useDragSelect } from '@/hooks/useDragSelect'

export interface MobileSegmentedTabItem {
  key: string
  label: string
  icon?: LucideIcon
}

interface MobileSegmentedTabsProps {
  items: MobileSegmentedTabItem[]
  selectedKey: string
  onSelectionChange: (key: string) => void
  ariaLabel: string
  isDisabled?: boolean
  className?: string
  children?: ReactNode
}

/**
 * 手机端分段标签。
 *
 * 事件接收方式、添加方式共用这一套视觉和手势：点击切换，
 * 也可以按住横向拖动，手指经过哪个标签就选中哪个。
 * 纵向手势仍然交给外层抽屉的滚动逻辑。
 */
export const MobileSegmentedTabs = ({
  items,
  selectedKey,
  onSelectionChange,
  ariaLabel,
  isDisabled,
  className,
  children,
}: MobileSegmentedTabsProps) => {
  const listRef = useRef<HTMLDivElement>(null)

  useDragSelect({
    containerRef: listRef,
    itemSelector: '[role="tab"]',
    disabled: isDisabled,
    onSelectIndex: (index) => {
      const item = items[index]
      if (item) onSelectionChange(item.key)
    },
  })

  return (
    <Tabs
      selectedKey={selectedKey}
      isDisabled={isDisabled}
      className={cn('w-full', className)}
      onSelectionChange={(key) => {
        if (typeof key === 'string') onSelectionChange(key)
      }}
    >
      <div ref={listRef} className='w-full'>
        <Tabs.List
          aria-label={ariaLabel}
          className='grid gap-1 rounded-xl bg-default p-1'
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const Icon = item.icon

            return (
              <Tabs.Tab
                key={item.key}
                id={item.key}
                className='h-9 min-w-0 justify-center gap-1.5 rounded-lg px-1 text-[11px] font-medium data-[selected=true]:text-foreground'
              >
                {Icon ? <Icon className='size-3.5' aria-hidden='true' /> : null}
                <span className='truncate'>{item.label}</span>
                <Tabs.Indicator className='rounded-lg bg-surface shadow-sm' />
              </Tabs.Tab>
            )
          })}
        </Tabs.List>
      </div>
      {children}
    </Tabs>
  )
}
