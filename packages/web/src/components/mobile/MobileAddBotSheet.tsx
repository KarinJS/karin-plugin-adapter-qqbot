import { Button, Drawer, FieldError, Input, Label, Tabs, TextField, toast } from '@heroui/react'
import { PenLine, QrCode, Save, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrPanel } from '@/components/QrPanel'
import { SecretField } from '@/components/SecretField'
import { MobileGroup, MobileRow } from '@/components/mobile/MobileGroup'
import { MobileEventTypePicker } from '@/components/mobile/MobileEventTypePicker'
import { MobileSegmentedTabs } from '@/components/mobile/MobileSegmentedTabs'
import { MobileSheet } from '@/components/mobile/MobileSheet'
import type { EventType } from '@/components/EventTypePicker'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useMobileSheet } from '@/hooks/useMobileSheet'
import type { BotConfig } from '@/lib/types'

const MobileManualAddForm = () => {
  const { config, defaults, save, saving } = useConfigStore()
  const { closeAdd } = useMobileSheet()
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
      closeAdd()
      navigate(`/bots/${encodeURIComponent(id)}`)
    } catch {
      // ConfigProvider 已经记录错误。
    }
  }

  return (
    <form className='flex flex-col gap-4' autoComplete='off' onSubmit={handleSubmit}>
      <MobileGroup title='凭据'>
        <MobileRow>
          <TextField
            fullWidth
            value={appId}
            isInvalid={Boolean(errors.appId)}
            onChange={(value) => {
              setAppId(value)
              if (errors.appId) setErrors((current) => ({ ...current, appId: '' }))
            }}
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
            value={secret}
            isInvalid={Boolean(errors.secret)}
            error={errors.secret}
            placeholder='机器人 AppSecret'
            onChange={(value) => {
              setSecret(value)
              if (errors.secret) setErrors((current) => ({ ...current, secret: '' }))
            }}
          />
        </MobileRow>
      </MobileGroup>

      <MobileGroup title='事件接收' contentClassName='p-3.5'>
        <MobileEventTypePicker value={eventType} onChange={setEventType} />
      </MobileGroup>

      <Button type='submit' fullWidth isPending={saving} isDisabled={!defaults}>
        {({ isPending }) => (
          <>
            {isPending ? null : <Save className='size-4' aria-hidden='true' />}
            <span>{isPending ? '创建中' : '创建机器人'}</span>
          </>
        )}
      </Button>
    </form>
  )
}

const addTabs = [
  { key: 'qr', label: '扫码授权', icon: QrCode },
  { key: 'manual', label: '手动填写', icon: PenLine },
] as const

/**
 * 扫码 / 手动添加机器人的底部抽屉。
 *
 * 默认全屏打开，并沿用机器人配置抽屉的滚动、收起和退场逻辑。
 * 扫码和手动共用同一个分段标签；切换标签不会卸载二维码，
 * 只有退出抽屉或点击「重新生成」才会结束当前二维码会话。
 */
export const MobileAddBotSheet = () => {
  const { isAddOpen, closeAdd } = useMobileSheet()
  const [mode, setMode] = useState<'qr' | 'manual'>('qr')
  const [sessionKey, setSessionKey] = useState(0)

  useEffect(() => {
    if (isAddOpen) setMode('qr')
  }, [isAddOpen])

  const handleExited = useCallback(() => {
    // 抽屉完全退场后销毁二维码和手动表单状态；下次打开是新的会话。
    setSessionKey((value) => value + 1)
    setMode('qr')
  }, [])

  return (
    <MobileSheet
      isOpen={isAddOpen}
      onRequestClose={closeAdd}
      onExited={handleExited}
      initialRatio={1}
      collapsedRatio={1}
      header={
        <header className='sheet-header px-5 pb-3'>
          <Drawer.Handle className='mx-auto mb-1' />
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <h2 className='text-[17px] leading-tight font-semibold tracking-[-0.02em]'>添加机器人</h2>
              <p className='mt-0.5 text-[11px] text-muted'>扫码授权，或手动填写凭据。</p>
            </div>
            <Button isIconOnly size='sm' variant='tertiary' aria-label='关闭添加机器人' onPress={closeAdd}>
              <X className='size-4' aria-hidden='true' />
            </Button>
          </div>
        </header>
      }
    >
      <div key={sessionKey} className='safe-bottom'>
        <MobileSegmentedTabs
          ariaLabel='添加方式'
          items={[...addTabs]}
          selectedKey={mode}
          className='gap-4'
          onSelectionChange={(key) => {
            if (key === 'qr' || key === 'manual') setMode(key)
          }}
        >
          <Tabs.Panel id='qr' shouldForceMount style={{ display: mode === 'qr' ? undefined : 'none' }}>
            <QrPanel />
          </Tabs.Panel>
          <Tabs.Panel id='manual' shouldForceMount style={{ display: mode === 'manual' ? undefined : 'none' }}>
            <MobileManualAddForm />
          </Tabs.Panel>
        </MobileSegmentedTabs>
      </div>
    </MobileSheet>
  )
}
