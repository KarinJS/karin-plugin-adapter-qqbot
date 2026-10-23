import { Button, Card, Description, FieldError, Input, Label, Tabs, TextField, toast } from '@heroui/react'
import { KeyRound, QrCode, Save } from 'lucide-react'
import { useLayoutEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { EventTypePicker, type EventType } from '@/components/EventTypePicker'
import { PageHeader } from '@/components/PageHeader'
import { QrPanel } from '@/components/QrPanel'
import { SecretField } from '@/components/SecretField'
import { useConfigStore } from '@/hooks/useConfigStore'
import type { BotConfig } from '@/lib/types'

const ManualAddForm = () => {
  const { config, defaults, save, saving } = useConfigStore()
  const navigate = useNavigate()

  const [appId, setAppId] = useState('')
  const [secret, setSecret] = useState('')
  const [eventType, setEventType] = useState<EventType>(2)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!defaults) return

    const nextErrors: Record<string, string> = {}
    const id = appId.trim()

    if (!id) nextErrors.appId = '请填写 AppID'
    else if (/\s/.test(id)) nextErrors.appId = 'AppID 不能包含空格'
    else if (config.some((item) => item.appId === id)) nextErrors.appId = '这个 AppID 已经存在'

    if (eventType !== 0 && !secret.trim()) nextErrors.secret = '连接机器人需要 AppSecret'

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const bot: BotConfig = {
      ...structuredClone(defaults),
      appId: id,
      secret: secret.trim(),
      event: { type: eventType },
    }

    try {
      await save([...config, bot])
      toast.success('机器人已添加', { description: '配置已写入，适配器会自动建立连接' })
      navigate(`/bots/${encodeURIComponent(id)}`)
    } catch {
      // ConfigProvider 已经记录错误。
    }
  }

  return (
    <Card className='border border-border/80 bg-surface shadow-none'>
      <Card.Header className='p-5 pb-0'>
        <Card.Title className='text-base font-semibold'>手动填写</Card.Title>
        <Card.Description className='mt-1 text-sm text-muted'>
          已经拿到 AppID 和 AppSecret 时使用。其余选项会使用默认值，创建后可以继续修改。
        </Card.Description>
      </Card.Header>

      <Card.Content className='p-5'>
        <form className='flex flex-col gap-5' autoComplete='off' onSubmit={handleSubmit}>
          <div className='grid gap-5 sm:grid-cols-2'>
            <TextField
              fullWidth
              value={appId}
              isInvalid={Boolean(errors.appId)}
              onChange={(value) => {
                setAppId(value)
                if (errors.appId) setErrors((current) => ({ ...current, appId: '' }))
              }}
            >
              <Label>AppID</Label>
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

            <SecretField
              value={secret}
              isInvalid={Boolean(errors.secret)}
              error={errors.secret}
              placeholder='机器人 AppSecret'
              onChange={(value) => {
                setSecret(value)
                if (errors.secret) setErrors((current) => ({ ...current, secret: '' }))
              }}
            />
          </div>

          <div className='flex flex-col gap-3'>
            <div>
              <p className='text-sm font-medium'>事件接收</p>
              <p className='mt-1 text-xs text-muted'>创建后可以在机器人配置里修改。</p>
            </div>
            <EventTypePicker value={eventType} onChange={setEventType} />
          </div>

          <div className='flex items-center justify-between gap-3 border-t border-border/60 pt-5'>
            <Description className='flex items-center gap-1.5 text-xs'>
              <KeyRound className='size-3.5' aria-hidden='true' />
              配置会写入 config.json
            </Description>
            <Button type='submit' isPending={saving} isDisabled={!defaults}>
              {({ isPending }) => (
                <>
                  {isPending ? null : <Save className='size-4' aria-hidden='true' />}
                  <span>{isPending ? '创建中' : '创建机器人'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  )
}

export const AddBotPage = () => {
  const { pathname } = useLocation()
  const [tab, setTab] = useState('qr')

  // 画布会一直挂载添加页，从概览等页面再次进入时把标签页重置回扫码授权。
  useLayoutEffect(() => {
    if (pathname === '/bots/new') setTab('qr')
  }, [pathname])

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        eyebrow='Add'
        title='添加机器人'
        description='推荐直接扫码授权。已经拿到凭据时，也可以手动填写。'
      />

      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))}>
        <Tabs.ListContainer>
          <Tabs.List aria-label='添加方式'>
            <Tabs.Tab id='qr'>
              <QrCode className='size-4' aria-hidden='true' />
              扫码授权
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id='manual'>
              <Tabs.Separator />
              手动填写
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id='qr' className='pt-5'>
          <QrPanel />
        </Tabs.Panel>

        <Tabs.Panel id='manual' className='pt-5'>
          <ManualAddForm />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
