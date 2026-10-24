import { Description, Label, ListBox, NumberField, Select, Switch, cn } from '@heroui/react'
import type { BotConfig, MessageCacheLevel } from '@/lib/types'

type MessageCache = BotConfig['messageCache']

const levelOptions: { value: MessageCacheLevel; label: string; description: string }[] = [
  {
    value: 'minimal',
    label: '精简',
    description: '只保存消息 ID 与引用关系，正文不落库',
  },
  {
    value: 'standard',
    label: '标准',
    description: '保存文本、表情与媒体路径，适合大多数场景',
  },
  {
    value: 'full',
    label: '完整',
    description: '全部可缓存消息段原样保存，占用空间最大',
  },
]

interface MessageCacheFieldsProps {
  value: MessageCache
  onChange: (value: MessageCache) => void
  compact?: boolean
}

export const MessageCacheFields = ({ value, onChange, compact = false }: MessageCacheFieldsProps) => {
  const patch = (next: Partial<MessageCache>) => onChange({ ...value, ...next })

  return (
    <div className={compact ? 'flex flex-col gap-3' : 'flex flex-col gap-5'}>
      <Switch isSelected={value.enable} onChange={(enable) => patch({ enable })}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <span className='flex flex-col'>
            <span className='text-sm font-medium'>启用消息缓存</span>
            <span className={compact ? 'text-[11px] leading-4 text-muted' : 'text-xs leading-5 text-muted'}>
              用于 bot.getMsg、引用与撤回解析
            </span>
          </span>
        </Switch.Content>
      </Switch>

      <div
        className={cn(
          'grid transition-opacity duration-200',
          compact ? 'gap-3' : 'gap-5',
          !value.enable && 'pointer-events-none opacity-45'
        )}
      >
        <Switch isSelected={value.self} isDisabled={!value.enable} onChange={(self) => patch({ self })}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <span className='flex flex-col'>
              <span className='text-sm font-medium'>缓存机器人自己的消息</span>
              <span className={compact ? 'text-[11px] leading-4 text-muted' : 'text-xs leading-5 text-muted'}>
                发送后仍能通过消息 ID 回查
              </span>
            </span>
          </Switch.Content>
        </Switch>

        <Select
          fullWidth
          value={value.level}
          isDisabled={!value.enable}
          onChange={(next) => {
            if (typeof next !== 'string') return
            patch({ level: next as MessageCacheLevel })
          }}
        >
          <Label className={compact ? 'text-xs text-muted' : undefined}>存储分级</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {levelOptions.map((option) => (
                <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                  <div className='flex flex-col gap-1'>
                    <Label>{option.label}</Label>
                    <Description>{option.description}</Description>
                  </div>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <NumberField
          value={value.ttlHours}
          minValue={1}
          maxValue={720}
          isDisabled={!value.enable}
          onChange={(next) => {
            if (typeof next === 'number' && Number.isFinite(next)) patch({ ttlHours: next })
          }}
        >
          <Label className={compact ? 'text-xs text-muted' : undefined}>保留小时数</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description className={compact ? 'text-[11px] leading-4' : undefined}>
            1 到 720 小时，默认 24 小时
          </Description>
        </NumberField>

        <NumberField
          value={value.maxRows}
          minValue={1000}
          maxValue={5_000_000}
          step={1000}
          isDisabled={!value.enable}
          onChange={(next) => {
            if (typeof next === 'number' && Number.isFinite(next)) patch({ maxRows: next })
          }}
        >
          <Label className={compact ? 'text-xs text-muted' : undefined}>最大行数</Label>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input />
            <NumberField.IncrementButton />
          </NumberField.Group>
          <Description className={compact ? 'text-[11px] leading-4' : undefined}>
            超出后删除最旧记录，多个机器人取最大值
          </Description>
        </NumberField>
      </div>
    </div>
  )
}
