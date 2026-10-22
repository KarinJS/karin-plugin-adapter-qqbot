import { AlertDialog, Button, Drawer, Spinner, toast } from '@heroui/react'
import { RotateCcw, Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { BotAvatar } from '@/components/BotAvatar'
import { SaveStatus } from '@/components/SaveStatus'
import { StatusPill } from '@/components/StatusPill'
import { MobileBotFields } from '@/components/mobile/MobileBotFields'
import { SheetScaffold } from '@/components/mobile/SheetScaffold'
import { mobileSheetBackdropStyle, mobileSheetStyle } from '@/components/mobile/mobileStyles'
import { useBotEditor } from '@/hooks/useBotEditor'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useMobileSheet } from '@/hooks/useMobileSheet'
import { useSheetMotion } from '@/hooks/useSheetMotion'
import { dissolveBotCard } from '@/lib/dissolveBotCard'
import type { BotConfig } from '@/lib/types'

interface SheetBodyProps {
  bot: BotConfig
  formId: string
  onClose: () => void
  onSaved: (saved: BotConfig) => void
  onRequestRemove: () => void
  removing: boolean
}

const SheetBody = ({ bot, formId, onClose, onSaved, onRequestRemove, removing }: SheetBodyProps) => {
  const { statuses } = useConfigStore()
  const controller = useBotEditor(bot)
  const { dirty, saving, reset, saveState } = controller
  const status = statuses[bot.appId]
  const title = status?.name || bot.appId

  return (
    <>
      <SaveStatus state={saveState} />

      <SheetScaffold
        header={
          <header className='px-5 pb-3'>
            <Drawer.Handle className='mx-auto mb-1' />
            <div className='flex items-start gap-3'>
              <BotAvatar name={title} avatar={status?.avatar} size='md' />
              <div className='min-w-0 flex-1'>
                <h2 className='truncate text-[17px] leading-tight font-semibold tracking-[-0.02em]'>{title}</h2>
                <div className='mt-1 flex min-w-0 items-center gap-2'>
                  <StatusPill
                    online={status?.online ?? false}
                    eventType={bot.event.type}
                    className='shrink-0 text-[11px]'
                  />
                  <span className='truncate text-[11px] text-muted'>{bot.appId}</span>
                </div>
              </div>
              <Button isIconOnly size='sm' variant='tertiary' aria-label='关闭机器人配置' onPress={onClose}>
                <X className='size-4' aria-hidden='true' />
              </Button>
            </div>
          </header>
        }
        footer={
          <footer className='safe-bottom px-4 pt-3'>
            <div className='flex items-center gap-2'>
              <Button variant='secondary' isDisabled={!dirty || saving} onPress={reset}>
                <RotateCcw className='size-4' aria-hidden='true' />
                撤销
              </Button>
              <Button type='submit' form={formId} fullWidth isPending={saving} isDisabled={!dirty}>
                {({ isPending }) => (
                  <>
                    {isPending ? null : <Save className='size-4' aria-hidden='true' />}
                    <span>{isPending ? '保存中' : '保存配置'}</span>
                  </>
                )}
              </Button>
            </div>
          </footer>
        }
      >
        <MobileBotFields
          formId={formId}
          controller={controller}
          onSaved={onSaved}
          onRemove={onRequestRemove}
          removing={removing}
        />
      </SheetScaffold>
    </>
  )
}

/**
 * 手机端机器人配置抽屉。
 *
 * 移除机器人走最强打断的居中模态窗：确认后先等模态窗退场，
 * 再让抽屉沿原路滑回去，最后让列表里的卡片模糊、散成粒子并消失。
 */
export const MobileBotSheet = () => {
  const { activeAppId, isOpen, close, open } = useMobileSheet()
  const { config, remove, statuses } = useConfigStore()
  const formId = useId()
  const [removing, setRemoving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const pendingRemoveRef = useRef<{ appId: string; name: string; color: string } | null>(null)
  const bot = activeAppId ? config.find((item) => item.appId === activeAppId) : undefined
  const status = bot ? statuses[bot.appId] : undefined
  const title = status?.name || bot?.appId || ''

  const handleSheetExited = useCallback(() => {
    const pending = pendingRemoveRef.current
    if (!pending) return
    pendingRemoveRef.current = null

    const dissolve = dissolveBotCard(pending.appId, pending.color)

    void (async () => {
      if (dissolve) await dissolve.cardDone

      try {
        await remove(pending.appId)
        if (dissolve) await dissolve.particlesDone
        toast.success('机器人已移除', { description: `${pending.name} 已从配置中删除` })
      } catch {
        dissolve?.restore()
        // ConfigProvider 已经记录错误。
      } finally {
        setRemoving(false)
      }
    })()
  }, [remove])

  const { backdropRef, mounted, handleOpenChange } = useSheetMotion({
    isOpen,
    onRequestClose: close,
    onExited: handleSheetExited,
  })

  useEffect(() => {
    if (isOpen && !bot) close()
  }, [bot, close, isOpen])

  const handleSaved = (saved: BotConfig) => {
    if (saved.appId !== activeAppId) open(saved.appId)
  }

  const handleConfirmRemove = () => {
    if (!bot || removing) return

    const name = status?.name || bot.appId
    const color = !bot.event.type ? 'rgb(150 150 150)' : status?.online ? 'rgb(74 222 128)' : 'rgb(250 204 21)'

    pendingRemoveRef.current = { appId: bot.appId, name, color }
    setRemoving(true)
    setConfirmOpen(false)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => close(), reduceMotion ? 0 : 140)
  }

  return (
    <>
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
            {bot ? (
              <SheetBody
                key={bot.appId}
                bot={bot}
                formId={formId}
                onClose={close}
                onSaved={handleSaved}
                onRequestRemove={() => setConfirmOpen(true)}
                removing={removing}
              />
            ) : (
              <div className='flex flex-1 items-center justify-center'>
                <Spinner aria-label='正在加载机器人配置' />
              </div>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>

      <AlertDialog isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Backdrop isDismissable={false} isKeyboardDismissDisabled style={{ zIndex: 100010 }}>
          <AlertDialog.Container placement='center' size='sm'>
            <AlertDialog.Dialog className='border border-border/60'>
              <AlertDialog.Header>
                <AlertDialog.Icon status='danger'>
                  <Trash2 className='size-4' aria-hidden='true' />
                </AlertDialog.Icon>
                <AlertDialog.Heading className='break-words'>移除「{title}」？</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                将从 config.json 中删除这个机器人并断开连接。QQ 开放平台侧的机器人不会被删除。
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  variant='secondary'
                  className='flex-1'
                  isDisabled={removing}
                  onPress={() => setConfirmOpen(false)}
                >
                  取消
                </Button>
                <Button variant='danger' className='flex-1' isPending={removing} onPress={handleConfirmRemove}>
                  移除
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  )
}
