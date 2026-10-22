import { Tabs } from '@heroui/react'
import { PowerOff, RadioTower, Webhook } from 'lucide-react'
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

interface MobileEventTypePickerProps {
  value: EventType
  onChange: (value: EventType) => void
  isDisabled?: boolean
}

/**
 * 手机端事件通道选择器。
 *
 * 用 HeroUI Tabs 的分段样式：选中指示器在三个等宽标签之间连续移动，
 * 说明文字放在下方面板里，避免桌面那三张大卡片占掉半屏。
 */
export const MobileEventTypePicker = ({ value, onChange, isDisabled }: MobileEventTypePickerProps) => (
  <Tabs
    selectedKey={String(value)}
    isDisabled={isDisabled}
    className='w-full gap-2'
    onSelectionChange={(key) => {
      const next = Number(key)
      if (next === 0 || next === 1 || next === 2) onChange(next)
    }}
  >
    <Tabs.List aria-label='事件接收方式' className='grid grid-cols-3 gap-1 rounded-xl bg-default p-1'>
      {options.map((option) => {
        const Icon = option.icon

        return (
          <Tabs.Tab
            key={option.value}
            id={String(option.value)}
            className='h-9 min-w-0 justify-center gap-1.5 rounded-lg px-1 text-[11px] font-medium data-[selected=true]:text-foreground'
          >
            <Icon className='size-3.5' aria-hidden='true' />
            <span className='truncate'>{option.label}</span>
            <Tabs.Indicator className='rounded-lg bg-surface shadow-sm' />
          </Tabs.Tab>
        )
      })}
    </Tabs.List>

    {options.map((option) => (
      <Tabs.Panel key={option.value} id={String(option.value)} className='mt-0 px-1 text-[11px] leading-5 text-muted'>
        {option.description}
      </Tabs.Panel>
    ))}
  </Tabs>
)
