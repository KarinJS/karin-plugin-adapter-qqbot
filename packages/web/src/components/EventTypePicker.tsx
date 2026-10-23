import { ToggleButton, ToggleButtonGroup, cn } from '@heroui/react'
import { PowerOff, RadioTower, Webhook } from 'lucide-react'

export type EventType = 0 | 1 | 2

const options = [
  {
    value: 2 as const,
    label: 'WebSocket',
    description: '由 Karin 主动连接，不需要公网地址',
    icon: RadioTower,
  },
  {
    value: 1 as const,
    label: 'Webhook',
    description: 'QQ 回调到你的公网地址，需要签名校验',
    icon: Webhook,
  },
  {
    value: 0 as const,
    label: '关闭',
    description: '保留配置，但不建立任何连接',
    icon: PowerOff,
  },
]

interface EventTypePickerProps {
  value: EventType
  onChange: (value: EventType) => void
  isDisabled?: boolean
}

export const EventTypePicker = ({ value, onChange, isDisabled }: EventTypePickerProps) => (
  <ToggleButtonGroup
    selectionMode='single'
    disallowEmptySelection
    isDetached
    isDisabled={isDisabled}
    selectedKeys={[String(value)]}
    className='grid items-stretch gap-3 sm:grid-cols-3'
    onSelectionChange={(keys) => {
      const [next] = Array.from(keys)
      const parsed = Number(next)
      if (parsed === 0 || parsed === 1 || parsed === 2) onChange(parsed)
    }}
  >
    {options.map((option) => {
      const Icon = option.icon
      const active = value === option.value

      return (
        <ToggleButton
          key={option.value}
          id={String(option.value)}
          className={cn(
            'h-auto w-full flex-col items-start gap-3 rounded-xl border p-4 text-left whitespace-normal',
            active
              ? 'border-transparent bg-accent text-accent-foreground'
              : 'border-border/80 bg-surface text-foreground'
          )}
        >
          <span className='flex w-full items-center justify-between'>
            <Icon className='size-4' aria-hidden='true' />
            <span
              className={cn('size-2 rounded-full border', active ? 'border-current bg-current' : 'border-current/40')}
              aria-hidden='true'
            />
          </span>
          <span className='flex flex-col gap-1'>
            <span className='text-sm font-medium'>{option.label}</span>
            <span className={cn('text-xs leading-5', active ? 'text-accent-foreground/70' : 'text-muted')}>
              {option.description}
            </span>
          </span>
        </ToggleButton>
      )
    })}
  </ToggleButtonGroup>
)
