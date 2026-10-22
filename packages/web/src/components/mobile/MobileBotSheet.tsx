import { Button, Drawer, Spinner, toast } from '@heroui/react'
import { RotateCcw, Save, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { BotAvatar } from '@/components/BotAvatar'
import { SaveStatus } from '@/components/SaveStatus'
import { StatusPill } from '@/components/StatusPill'
import { MobileBotFields } from '@/components/mobile/MobileBotFields'
import { useBotEditor } from '@/hooks/useBotEditor'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useMobileSheet } from '@/hooks/useMobileSheet'
import type { BotConfig } from '@/lib/types'

interface SheetBodyProps {
  bot: BotConfig
  formId: string
  onClose: () => void
  onSaved: (saved: BotConfig) => void
  onRemove: () => void
  removing: boolean
}

const SheetBody = ({ bot, formId, onClose, onSaved, onRemove, removing }: SheetBodyProps) => {
  const { statuses } = useConfigStore()
  const controller = useBotEditor(bot)
  const { dirty, saving, reset, saveState } = controller
  const status = statuses[bot.appId]
  const title = status?.name || bot.appId

  return (
    <>
      <SaveStatus state={saveState} />

      <div className='flex shrink-0 items-start gap-3 px-5 pb-3'>
        <BotAvatar name={title} avatar={status?.avatar} size='md' />
        <div className='min-w-0 flex-1'>
          <div className='flex min-w-0 items-center gap-2'>
            <h2 className='truncate text-[17px] leading-tight font-semibold tracking-[-0.02em]'>{title}</h2>
            <StatusPill online={status?.online ?? false} eventType={bot.event.type} className='shrink-0 text-[11px]' />
          </div>
          <p className='mt-0.5 truncate text-[11px] text-muted'>{bot.appId}</p>
        </div>
        <Button isIconOnly size='sm' variant='ghost' aria-label='关闭机器人配置' onPress={onClose}>
          <X className='size-4' aria-hidden='true' />
        </Button>
      </div>

      <div className='mobile-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4'>
        <MobileBotFields
          formId={formId}
          controller={controller}
          onSaved={onSaved}
          onRemove={onRemove}
          removing={removing}
        />
      </div>

      <footer className='safe-bottom shrink-0 border-t border-border/60 bg-surface/95 px-4 pt-3 backdrop-blur'>
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
    </>
  )
}

/**
 * 手机端机器人配置抽屉。
 *
 * 占屏幕 80% 高度，背景由外壳负责压暗和缩放；抽屉本身只做内容与保存。
 */
export const MobileBotSheet = () => {
  const { activeAppId, isOpen, close, open } = useMobileSheet()
  const { config, remove } = useConfigStore()
  const formId = useId()
  const [removing, setRemoving] = useState(false)
  const bot = activeAppId ? config.find((item) => item.appId === activeAppId) : undefined

  useEffect(() => {
    if (isOpen && !bot) close()
  }, [bot, close, isOpen])

  const handleSaved = (saved: BotConfig) => {
    if (saved.appId !== activeAppId) open(saved.appId)
  }

  const handleRemove = async () => {
    if (!bot) return
    setRemoving(true)

    try {
      await remove(bot.appId)
      close()
      toast.success('机器人已移除', { description: `${bot.appId} 已从配置中删除` })
    } catch {
      // ConfigProvider 已经记录错误。
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Drawer.Backdrop
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (!next) close()
      }}
      style={{ backgroundColor: 'rgb(0 0 0 / 0.38)' }}
    >
      <Drawer.Content placement='bottom'>
        <Drawer.Dialog
          className='flex flex-col border border-border/60 bg-surface shadow-overlay'
          style={{ height: '80dvh', maxHeight: '80dvh', padding: 0, borderRadius: '28px 28px 0 0' }}
        >
          <Drawer.Handle className='pt-2' />
          {bot ? (
            <SheetBody
              key={bot.appId}
              bot={bot}
              formId={formId}
              onClose={close}
              onSaved={handleSaved}
              onRemove={handleRemove}
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
  )
}
