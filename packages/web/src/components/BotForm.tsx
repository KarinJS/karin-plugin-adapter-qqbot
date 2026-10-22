import {
  Alert,
  Button,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextField,
  toast,
} from '@heroui/react'
import { Eye, EyeOff, RotateCcw, Save } from 'lucide-react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { EventTypePicker } from '@/components/EventTypePicker'
import { MessageCacheFields } from '@/components/MessageCacheFields'
import { RegexEditor } from '@/components/RegexEditor'
import { SectionCard } from '@/components/SectionCard'
import { StatusPill } from '@/components/StatusPill'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useViewport } from '@/hooks/useViewport'
import type { BotConfig } from '@/lib/types'

interface BotFormProps {
  bot: BotConfig
  onSaved?: (appId: string) => void
}

const cloneBot = (bot: BotConfig): BotConfig => structuredClone(bot)

/**
 * 服务端会重新格式化配置，对象键顺序可能变化；比较草稿时忽略顺序。
 */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .toSorted()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export const BotForm = ({ bot, onSaved }: BotFormProps) => {
  const { config, statuses, save, saving, error, clearError } = useConfigStore()
  const { isMobile } = useViewport()
  const navigate = useNavigate()
  const formId = useId()

  const [draft, setDraft] = useState<BotConfig>(() => cloneBot(bot))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    setDraft(cloneBot(bot))
    setErrors({})
    setShowSecret(false)
  }, [bot])

  const status = statuses[bot.appId]
  const otherAppIds = config.filter((item) => item.appId !== bot.appId).map((item) => item.appId)
  const dirty = stableStringify(draft) !== stableStringify(bot)

  const patch = (next: Partial<BotConfig>) => {
    setDraft((current) => ({ ...current, ...next }))
    clearError()
  }

  const reset = () => {
    setDraft(cloneBot(bot))
    setErrors({})
    clearError()
  }

  const validate = (value: BotConfig) => {
    const next: Record<string, string> = {}
    const appId = value.appId.trim()

    if (!appId) next.appId = '请填写 AppID'
    else if (/\s/.test(appId)) next.appId = 'AppID 不能包含空格'
    else if (otherAppIds.includes(appId)) next.appId = '这个 AppID 已经存在'

    if (value.event.type !== 0 && !value.secret.trim()) {
      next.secret = '连接机器人需要 AppSecret，扫码授权会自动填写'
    }

    return next
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validate(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const normalized: BotConfig = {
      ...draft,
      appId: draft.appId.trim(),
      secret: draft.secret.trim(),
      regex: draft.regex.map((rule) => ({ reg: rule.reg.trim(), rep: rule.rep })).filter((rule) => rule.reg.length > 0),
    }

    const nextConfig = config.map((item) => (item.appId === bot.appId ? normalized : item))

    try {
      await save(nextConfig)
      setDraft(cloneBot(normalized))
      toast.success('配置已保存', {
        description: '适配器会自动重连受影响的机器人',
      })
      onSaved?.(normalized.appId)

      if (normalized.appId !== bot.appId) {
        navigate(`/bots/${encodeURIComponent(normalized.appId)}`, { replace: true })
      }
    } catch {
      // 错误已经由 ConfigProvider 统一记录并展示。
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
    <form
      id={formId}
      className={isMobile ? 'flex flex-col gap-5 pb-28' : 'flex flex-col gap-5'}
      onSubmit={handleSubmit}
    >
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
            <h2 className='text-heading truncate text-xl font-semibold'>{status?.name || bot.appId}</h2>
            <StatusPill online={status?.online ?? false} eventType={bot.event.type} />
            {dirty ? (
              <span className='rounded-full border border-border px-2 py-0.5 text-[0.6875rem] text-muted'>未保存</span>
            ) : null}
          </div>
          <p className='mt-1 text-xs text-muted'>{bot.appId} · 保存后适配器会销毁旧连接并重新初始化</p>
        </div>
        {isMobile ? null : actions}
      </div>

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
                <Input autoComplete='off' spellCheck={false} placeholder='例如 102012345' />
                <Description>机器人唯一标识，保存后用于注册适配器。</Description>
                <FieldError>{errors.appId}</FieldError>
              </TextField>

              <TextField
                fullWidth
                value={draft.secret}
                isInvalid={Boolean(errors.secret)}
                onChange={(secret) => patch({ secret })}
              >
                <Label>AppSecret</Label>
                <div className='flex items-center gap-2'>
                  <Input
                    className='min-w-0 flex-1'
                    autoComplete='new-password'
                    spellCheck={false}
                    placeholder='扫码授权后自动填写'
                    type={showSecret ? 'text' : 'password'}
                  />
                  <Button
                    isIconOnly
                    variant='tertiary'
                    type='button'
                    aria-label={showSecret ? '隐藏 AppSecret' : '显示 AppSecret'}
                    onPress={() => setShowSecret((current) => !current)}
                  >
                    {showSecret ? (
                      <EyeOff className='size-4' aria-hidden='true' />
                    ) : (
                      <Eye className='size-4' aria-hidden='true' />
                    )}
                  </Button>
                </div>
                <Description>修改或重新授权会刷新密钥，旧密钥立即失效。</Description>
                <FieldError>{errors.secret}</FieldError>
              </TextField>
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

      {isMobile ? (
        <div className='glass fixed inset-x-0 bottom-0 z-30 border-t border-border px-4 pt-3 safe-bottom'>
          <div className='flex items-center gap-3'>
            <Button variant='secondary' isDisabled={!dirty || saving} onPress={reset}>
              撤销
            </Button>
            <Button type='submit' fullWidth isPending={saving} isDisabled={!dirty}>
              {({ isPending }) => <span>{isPending ? '保存中' : '保存配置'}</span>}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  )
}
