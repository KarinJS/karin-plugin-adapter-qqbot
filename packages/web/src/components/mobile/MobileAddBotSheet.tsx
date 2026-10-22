import {
  Button,
  Drawer,
  FieldError,
  Input,
  Label,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  toast,
} from '@heroui/react'
import { QrCode, Save, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { QrPanel } from '@/components/QrPanel'
import { SecretField } from '@/components/SecretField'
import { MobileGroup, MobileRow } from '@/components/mobile/MobileGroup'
import { MobileEventTypePicker } from '@/components/mobile/MobileEventTypePicker'
import { SheetScaffold } from '@/components/mobile/SheetScaffold'
import type { EventType } from '@/components/EventTypePicker'
import {
  mobileSegmentSelectedStyle,
  mobileSheetBackdropStyle,
  mobileSheetStyle,
} from '@/components/mobile/mobileStyles'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useMobileSheet } from '@/hooks/useMobileSheet'
import { useSheetMotion } from '@/hooks/useSheetMotion'
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

/**
 * 扫码 / 手动添加机器人的底部抽屉。
 *
 * 占屏幕 90%，从机器人列表右上角的按钮打开；两种添加方式共用同一个抽屉。
 */
export const MobileAddBotSheet = () => {
  const { isAddOpen, closeAdd } = useMobileSheet()
  const { backdropRef, mounted, handleOpenChange } = useSheetMotion({
    isOpen: isAddOpen,
    onRequestClose: closeAdd,
  })
  const [mode, setMode] = useState<'qr' | 'manual'>('qr')

  useEffect(() => {
    if (isAddOpen) setMode('qr')
  }, [isAddOpen])

  return (
    <Drawer.Backdrop
      ref={backdropRef}
      isOpen={mounted}
      onOpenChange={handleOpenChange}
      style={mobileSheetBackdropStyle}
    >
      <Drawer.Content placement='bottom'>
        <Drawer.Dialog
          className='flex flex-col overflow-hidden border border-border/60 bg-surface shadow-overlay'
          style={mobileSheetStyle}
        >
          <SheetScaffold
            header={
              <header className='px-5 pb-3'>
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
            <div className='flex flex-col gap-4 pb-4'>
              <ToggleButtonGroup
                selectionMode='single'
                disallowEmptySelection
                selectedKeys={[mode]}
                size='sm'
                aria-label='添加方式'
                className='grid grid-cols-2 gap-1 rounded-xl bg-default p-1'
                onSelectionChange={(keys) => {
                  const [next] = Array.from(keys)
                  if (next === 'qr' || next === 'manual') setMode(next)
                }}
              >
                <ToggleButton
                  id='qr'
                  className='h-9 justify-center gap-1.5 rounded-lg text-xs font-medium'
                  style={mode === 'qr' ? mobileSegmentSelectedStyle : undefined}
                >
                  <QrCode className='size-3.5' aria-hidden='true' />
                  扫码授权
                </ToggleButton>
                <ToggleButton
                  id='manual'
                  className='h-9 justify-center gap-1.5 rounded-lg text-xs font-medium'
                  style={mode === 'manual' ? mobileSegmentSelectedStyle : undefined}
                >
                  手动填写
                </ToggleButton>
              </ToggleButtonGroup>

              {mode === 'qr' ? <QrPanel /> : <MobileManualAddForm />}
            </div>
          </SheetScaffold>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}
