import { Alert, Description, FieldError, Input, Label, ListBox, Select, Switch, TextField } from '@heroui/react'
import { Trash2 } from 'lucide-react'
import type { FormEvent } from 'react'
import { MessageCacheFields } from '@/components/MessageCacheFields'
import { RegexEditor } from '@/components/RegexEditor'
import { SecretField } from '@/components/SecretField'
import { MobileActionRow, MobileGroup, MobileRow } from '@/components/mobile/MobileGroup'
import { MobileEventTypePicker } from '@/components/mobile/MobileEventTypePicker'
import type { BotEditor } from '@/hooks/useBotEditor'
import type { BotConfig } from '@/lib/types'

interface SwitchRowProps {
  title: string
  description: string
  isSelected: boolean
  isDisabled?: boolean
  onChange: (selected: boolean) => void
}

const SwitchRow = ({ title, description, isSelected, isDisabled, onChange }: SwitchRowProps) => (
  <MobileRow className='flex items-center justify-between gap-3'>
    <span className='min-w-0 flex-1'>
      <span className='block text-sm font-medium'>{title}</span>
      <span className='mt-0.5 block text-[11px] leading-4 text-muted'>{description}</span>
    </span>
    <Switch isSelected={isSelected} isDisabled={isDisabled} onChange={onChange} aria-label={title}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  </MobileRow>
)

interface MobileBotFieldsProps {
  formId: string
  controller: BotEditor
  onSaved?: (bot: BotConfig) => void
  onRemove?: () => void
  removing?: boolean
}

/**
 * 手机端机器人配置表单。
 *
 * 只负责分组和字段，保存按钮由外层固定在底部，表单通过 form 属性提交。
 */
export const MobileBotFields = ({ formId, controller, onSaved, onRemove, removing }: MobileBotFieldsProps) => {
  const { draft, errors, saving, error, patch, submit } = controller

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    const saved = await submit(event)
    if (saved) onSaved?.(saved)
  }

  return (
    <form id={formId} autoComplete='off' className='flex flex-col gap-4' onSubmit={handleSubmit}>
      {error ? (
        <Alert status='danger'>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>操作失败</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <MobileGroup title='基本信息' description='AppSecret 修改或重新授权后会立即刷新，旧密钥失效。'>
        <MobileRow>
          <TextField
            fullWidth
            value={draft.appId}
            isInvalid={Boolean(errors.appId)}
            onChange={(appId) => patch({ appId })}
          >
            <Label className='text-xs text-muted'>AppID</Label>
            <Input
              autoComplete='off'
              spellCheck={false}
              placeholder='机器人 AppID'
              data-1p-ignore
              data-bwignore
              data-lpignore='true'
            />
            <FieldError>{errors.appId}</FieldError>
          </TextField>
        </MobileRow>
        <MobileRow>
          <SecretField
            compact
            value={draft.secret}
            isInvalid={Boolean(errors.secret)}
            error={errors.secret}
            placeholder='机器人 AppSecret'
            onChange={(secret) => patch({ secret })}
          />
        </MobileRow>
      </MobileGroup>

      <MobileGroup title='事件接收' contentClassName='p-3.5'>
        <MobileEventTypePicker value={draft.event.type} onChange={(type) => patch({ event: { type } })} />
      </MobileGroup>

      <MobileGroup title='能力开关'>
        <SwitchRow
          title='QQ 场景'
          description='单聊、群聊与 QQ 消息事件'
          isSelected={draft.qqEnable}
          onChange={(qqEnable) => patch({ qqEnable })}
        />
        <SwitchRow
          title='频道场景'
          description='频道消息与私域能力'
          isSelected={draft.guildEnable}
          onChange={(guildEnable) => patch({ guildEnable })}
        />
        <MobileRow>
          <Select
            fullWidth
            value={String(draft.guildMode)}
            isDisabled={!draft.guildEnable}
            onChange={(next) => {
              if (next === '0' || next === '1') patch({ guildMode: next === '1' ? 1 : 0 })
            }}
          >
            <Label className='text-xs text-muted'>频道模式</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Description className='text-[11px] leading-4'>公域机器人可直接加入频道；私域需要平台开通。</Description>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id='0' textValue='公域'>
                  <div className='flex flex-col gap-1'>
                    <Label>公域</Label>
                    <Description>默认模式，适用于大多数频道机器人</Description>
                  </div>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id='1' textValue='私域'>
                  <div className='flex flex-col gap-1'>
                    <Label>私域</Label>
                    <Description>仅限已开通私域能力的机器人</Description>
                  </div>
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </MobileRow>
      </MobileGroup>

      <MobileGroup title='消息缓存' contentClassName='p-4'>
        <MessageCacheFields compact value={draft.messageCache} onChange={(messageCache) => patch({ messageCache })} />
      </MobileGroup>

      <MobileGroup title='文本替换' contentClassName='p-4'>
        <RegexEditor compact value={draft.regex} onChange={(regex) => patch({ regex })} isDisabled={saving} />
      </MobileGroup>

      {onRemove ? (
        <MobileGroup>
          <MobileActionRow
            danger
            disabled={removing}
            icon={<Trash2 className='size-4' aria-hidden='true' />}
            label='移除机器人'
            description='从配置中删除并断开连接'
            onPress={onRemove}
          />
        </MobileGroup>
      ) : null}
    </form>
  )
}
