import { Alert, Button, Description, FieldError, Input, Label, ListBox, Select, Switch, TextField } from '@heroui/react'
import { RotateCcw, Save } from 'lucide-react'
import { useId, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventTypePicker } from '@/components/EventTypePicker'
import { MessageCacheFields } from '@/components/MessageCacheFields'
import { RegexEditor } from '@/components/RegexEditor'
import { SaveStatus } from '@/components/SaveStatus'
import { SecretField } from '@/components/SecretField'
import { SectionCard } from '@/components/SectionCard'
import { StatusPill } from '@/components/StatusPill'
import { useBotEditor } from '@/hooks/useBotEditor'
import { useConfigStore } from '@/hooks/useConfigStore'
import type { BotConfig } from '@/lib/types'

interface BotFormProps {
  bot: BotConfig
  onSaved?: (appId: string) => void
}

export const BotForm = ({ bot, onSaved }: BotFormProps) => {
  const { statuses } = useConfigStore()
  const navigate = useNavigate()
  const formId = useId()
  const { draft, errors, dirty, saving, error, saveState, patch, reset, submit } = useBotEditor(bot)

  const status = statuses[bot.appId]

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    const saved = await submit(event)
    if (!saved) return

    onSaved?.(saved.appId)

    if (saved.appId !== bot.appId) {
      navigate(`/bots/${encodeURIComponent(saved.appId)}`, { replace: true })
    }
  }

  const actions = (
    <div className='flex items-center gap-2'>
      <Button variant='secondary' isDisabled={!dirty || saving} onPress={reset}>
        <RotateCcw className='size-4' aria-hidden='true' />
        撤销
      </Button>
      <Button type='submit' isPending={saving} isDisabled={!dirty}>
        {({ isPending }) => (
          <>
            {isPending ? null : <Save className='size-4' aria-hidden='true' />}
            <span>{isPending ? '保存中' : '保存'}</span>
          </>
        )}
      </Button>
    </div>
  )

  return (
    <form id={formId} autoComplete='off' className='flex flex-col gap-5' onSubmit={handleSubmit}>
      <SaveStatus state={saveState} />

      {/*
        宽屏时表单标题和操作悬浮在滚动区顶部，卡片从下面滚过并化开；
        窄屏整页滚动，保持原来的静态布局。
      */}
      <div data-form-header='' className='xl:sticky xl:top-0 xl:z-20 xl:h-21'>
        <div aria-hidden='true' className='edge-blur edge-blur--top edge-blur--header hidden xl:block'>
          <div className='edge-blur__layer edge-blur__layer--strong' />
          <div className='edge-blur__layer edge-blur__layer--medium' />
          <div className='edge-blur__layer edge-blur__layer--soft' />
        </div>

        {/* 标题顶边和左侧列表标题对齐：84px 高、20px 字、顶部 30.5px。 */}
        <div className='relative z-20 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between xl:pt-[30.5px] xl:pb-2'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
              <h2 className='text-heading truncate text-xl font-semibold'>{status?.name || bot.appId}</h2>
              <StatusPill online={status?.online ?? false} eventType={bot.event.type} />
              {dirty ? (
                <span className='rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[0.6875rem] text-warning'>
                  未保存
                </span>
              ) : null}
            </div>
            <p className='mt-1 text-xs text-muted'>{bot.appId} · 保存后适配器会销毁旧连接并重新初始化</p>
          </div>
          {actions}
        </div>
      </div>

      <div className='flex flex-col gap-5'>
        {error ? (
          <Alert status='danger'>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>操作失败</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <div className='grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start'>
          <div className='flex flex-col gap-5'>
            <SectionCard title='基本信息' description='AppID 与 AppSecret 来自 QQ 开放平台，扫码授权会自动写入。'>
              <div className='grid gap-5'>
                <TextField
                  fullWidth
                  value={draft.appId}
                  isInvalid={Boolean(errors.appId)}
                  onChange={(appId) => patch({ appId })}
                >
                  <Label>AppID</Label>
                  <Input
                    autoComplete='off'
                    spellCheck={false}
                    placeholder='例如 102012345'
                    data-1p-ignore
                    data-bwignore
                    data-lpignore='true'
                  />
                  <Description>机器人唯一标识，保存后用于注册适配器。</Description>
                  <FieldError>{errors.appId}</FieldError>
                </TextField>

                <SecretField
                  value={draft.secret}
                  isInvalid={Boolean(errors.secret)}
                  error={errors.secret}
                  description='修改或重新授权会刷新密钥，旧密钥立即失效。'
                  placeholder='扫码授权后自动填写'
                  onChange={(secret) => patch({ secret })}
                />
              </div>
            </SectionCard>

            <SectionCard title='事件接收' description='决定 Karin 如何接收 QQ 平台的事件。'>
              <EventTypePicker value={draft.event.type} onChange={(type) => patch({ event: { type } })} />
            </SectionCard>

            <SectionCard title='文本替换' description='收到消息后按顺序对文本执行正则替换，适合统一指令前缀。'>
              <RegexEditor value={draft.regex} onChange={(regex) => patch({ regex })} />
            </SectionCard>
          </div>

          <div className='flex flex-col gap-5'>
            <SectionCard title='能力开关' description='按机器人实际开通的平台能力选择场景。'>
              <div className='flex flex-col gap-5'>
                <Switch isSelected={draft.qqEnable} onChange={(qqEnable) => patch({ qqEnable })}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <span className='flex flex-col'>
                      <span className='text-sm font-medium'>QQ 场景</span>
                      <span className='text-xs leading-5 text-muted'>单聊、群聊与 QQ 消息事件</span>
                    </span>
                  </Switch.Content>
                </Switch>

                <Switch isSelected={draft.guildEnable} onChange={(guildEnable) => patch({ guildEnable })}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <span className='flex flex-col'>
                      <span className='text-sm font-medium'>频道场景</span>
                      <span className='text-xs leading-5 text-muted'>频道消息与私域能力</span>
                    </span>
                  </Switch.Content>
                </Switch>

                <Select
                  fullWidth
                  value={String(draft.guildMode)}
                  isDisabled={!draft.guildEnable}
                  onChange={(next) => {
                    if (next === '0' || next === '1') patch({ guildMode: next === '1' ? 1 : 0 })
                  }}
                >
                  <Label>频道模式</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Description>公域机器人可直接加入频道；私域需要平台单独开通。</Description>
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
              </div>
            </SectionCard>

            <SectionCard title='消息缓存' description='把消息写入本地数据库，支持引用、撤回与 bot.getMsg。'>
              <MessageCacheFields value={draft.messageCache} onChange={(messageCache) => patch({ messageCache })} />
            </SectionCard>
          </div>
        </div>
      </div>
    </form>
  )
}
