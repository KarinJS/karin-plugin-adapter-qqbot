import { Button, ToggleButton, ToggleButtonGroup, cn } from '@heroui/react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { charUnits } from '@/lib/menuPanelDraft'

export const CharacterCount = ({ value, max, suffix }: { value: string; max: number; suffix?: string }) => {
  const units = charUnits(value)
  return (
    <span className={cn('tabular-nums', units > max && 'text-danger')}>
      {units} / {max}
      {suffix ? ` · ${suffix}` : ''}
    </span>
  )
}

interface OrderButtonsProps {
  index: number
  total: number
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  removeLabel: string
}

/** 列表项的上移 / 下移 / 删除按钮。 */
export const OrderButtons = ({ index, total, onMove, onRemove, removeLabel }: OrderButtonsProps) => (
  <div className='flex items-center gap-0.5'>
    <Button isIconOnly size='sm' variant='ghost' aria-label='上移' isDisabled={index === 0} onPress={() => onMove(-1)}>
      <ArrowUp className='size-3.5' aria-hidden='true' />
    </Button>
    <Button
      isIconOnly
      size='sm'
      variant='ghost'
      aria-label='下移'
      isDisabled={index === total - 1}
      onPress={() => onMove(1)}
    >
      <ArrowDown className='size-3.5' aria-hidden='true' />
    </Button>
    <Button
      isIconOnly
      size='sm'
      variant='ghost'
      aria-label={removeLabel}
      className='text-muted hover:text-danger'
      onPress={onRemove}
    >
      <Trash2 className='size-3.5' aria-hidden='true' />
    </Button>
  </div>
)

export interface TypeOption<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface TypeToggleProps<T extends string> {
  value: T
  options: TypeOption<T>[]
  onChange: (value: T) => void
  isDisabled?: boolean
  className?: string
  compact?: boolean
  label?: string
}

/** 表单里的类型切换，样式与分段控件一致，但使用 ToggleButtonGroup 的语义。 */
export const TypeToggle = <T extends string>({
  value,
  options,
  onChange,
  isDisabled,
  className,
  compact,
  label,
}: TypeToggleProps<T>) => (
  <ToggleButtonGroup
    selectionMode='single'
    disallowEmptySelection
    isDetached
    isDisabled={isDisabled}
    aria-label={label}
    selectedKeys={[value]}
    className={cn('grid gap-1 rounded-xl bg-default p-1', className)}
    onSelectionChange={(keys) => {
      const [next] = Array.from(keys)
      if (typeof next !== 'string') return
      const option = options.find((item) => item.value === next)
      if (option) onChange(option.value)
    }}
  >
    {options.map((option) => {
      const active = option.value === value
      return (
        <ToggleButton
          key={option.value}
          id={option.value}
          className={cn(
            'w-full justify-center gap-1.5 rounded-lg border-0 font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150',
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
            active ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'
          )}
        >
          {option.icon}
          {option.label}
        </ToggleButton>
      )
    })}
  </ToggleButtonGroup>
)
