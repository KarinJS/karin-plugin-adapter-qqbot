import { ToggleButton, ToggleButtonGroup, cn } from '@heroui/react'
import { PowerOff, RadioTower, Webhook } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { EventType } from '@/components/EventTypePicker'

const options = [
  {
    value: 2 as const,
    label: 'WebSocket',
    description: 'Karin 主动连接，不需要公网地址',
    icon: RadioTower,
  },
  {
    value: 1 as const,
    label: 'Webhook',
    description: 'QQ 回调到公网地址，需要签名校验',
    icon: Webhook,
  },
  {
    value: 0 as const,
    label: '关闭',
    description: '保留配置，不建立任何连接',
    icon: PowerOff,
  },
]

const selectedStyle: CSSProperties = {
  '--toggle-button-bg-selected': 'var(--surface)',
  '--toggle-button-bg-selected-hover': 'var(--surface)',
  '--toggle-button-bg-selected-pressed': 'var(--surface)',
  '--toggle-button-fg-selected': 'var(--foreground)',
} as CSSProperties

interface MobileEventTypePickerProps {
  value: EventType
  onChange: (value: EventType) => void
  isDisabled?: boolean
}

/**
 * 手机端事件通道选择器。
 *
 * 桌面用三张大卡片，手机改成一行分段控件，只把当前选项的说明放在下方，
 * 避免一个单选占掉半屏高度。
 */
export const MobileEventTypePicker = ({ value, onChange, isDisabled }: MobileEventTypePickerProps) => {
  const selected = options.find((option) => option.value === value) ?? options[0]

  return (
    <div className='flex flex-col gap-2'>
      <ToggleButtonGroup
        selectionMode='single'
        disallowEmptySelection
        isDisabled={isDisabled}
        selectedKeys={[String(value)]}
        size='sm'
        aria-label='事件接收方式'
        className='grid grid-cols-3 gap-1 rounded-xl bg-default p-1'
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
                'h-9 min-w-0 justify-center gap-1.5 rounded-lg px-1 text-[11px] font-medium',
                active ? 'shadow-sm' : 'text-muted'
              )}
              style={active ? selectedStyle : undefined}
            >
              <Icon className='size-3.5' aria-hidden='true' />
              <span className='truncate'>{option.label}</span>
            </ToggleButton>
          )
        })}
      </ToggleButtonGroup>
      <p className='px-1 text-[11px] leading-5 text-muted'>{selected.description}</p>
    </div>
  )
}
