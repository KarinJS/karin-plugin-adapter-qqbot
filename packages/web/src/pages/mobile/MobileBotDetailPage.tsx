import { Button, Skeleton, toast } from '@heroui/react'
import { ArrowLeft, Bot, RotateCcw, Save } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotAvatar } from '@/components/BotAvatar'
import { SaveStatus } from '@/components/SaveStatus'
import { StatusPill } from '@/components/StatusPill'
import { MorphBackButton } from '@/components/mobile/MorphBackButton'
import { MobileBotFields } from '@/components/mobile/MobileBotFields'
import { useBotEditor } from '@/hooks/useBotEditor'
import { useConfigStore } from '@/hooks/useConfigStore'
import { animateProgress, EASE_POWER2_IN, EASE_POWER3_OUT, readTranslate } from '@/lib/waapi'
import type { BotConfig } from '@/lib/types'

interface MobileBotDetailPageProps {
  appId: string
}

interface DetailBodyProps {
  bot: BotConfig
  onBack: () => void
  onRemoved: () => void
}

const DetailBody = ({ bot, onBack, onRemoved }: DetailBodyProps) => {
  const { statuses, remove } = useConfigStore()
  const controller = useBotEditor(bot)
  const { dirty, saving, reset, saveState } = controller
  const navigate = useNavigate()
  const formId = useId()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [removing, setRemoving] = useState(false)
  const status = statuses[bot.appId]
  const title = status?.name || bot.appId

  const handleSaved = (saved: BotConfig) => {
    if (saved.appId !== bot.appId) {
      navigate(`/bots/${encodeURIComponent(saved.appId)}`, { replace: true })
    }
  }

  const handleRemove = async () => {
    setRemoving(true)

    try {
      await remove(bot.appId)
      toast.success('机器人已移除', { description: `${bot.appId} 已从配置中删除` })
      onRemoved()
    } catch {
      // ConfigProvider 已经记录错误。
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <SaveStatus state={saveState} />

      <div
        ref={scrollRef}
        className='[scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-0 flex-1 overflow-y-auto overscroll-contain'
      >
        <MorphBackButton scrollRef={scrollRef} onBack={onBack} />

        <div className='px-4 pb-6'>
          <header className='flex items-center gap-3 pb-4'>
            <BotAvatar name={title} avatar={status?.avatar} size='md' />
            <div className='min-w-0 flex-1'>
              <div className='flex min-w-0 items-center gap-2'>
                <h1 className='truncate text-[20px] leading-tight font-semibold tracking-[-0.02em]'>{title}</h1>
                {dirty ? (
                  <span className='shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning'>
                    未保存
                  </span>
                ) : null}
              </div>
              <p className='mt-0.5 truncate text-[11px] text-muted'>{bot.appId}</p>
              <StatusPill online={status?.online ?? false} eventType={bot.event.type} className='mt-1 text-[11px]' />
            </div>
          </header>

          <MobileBotFields
            formId={formId}
            controller={controller}
            onSaved={handleSaved}
            onRemove={handleRemove}
            removing={removing}
          />
        </div>
      </div>

      <footer className='shrink-0 border-t border-border/60 bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur'>
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
 * 手机端机器人详情页。
 *
 * 以整页覆盖层从右侧推入，底部保存栏参与布局而不是浮在内容上，
 * 因此不会出现保存栏挡住内容或弹窗的情况。
 */
export const MobileBotDetailPage = ({ appId }: MobileBotDetailPageProps) => {
  const { config, loading } = useConfigStore()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const enterRef = useRef<Animation | null>(null)
  const leavingRef = useRef(false)
  const bot = config.find((item) => item.appId === appId)

  // 进场交给 WAAPI：整页从右侧推入，transform 由合成器插值。
  useLayoutEffect(() => {
    const element = rootRef.current
    if (!element) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const animation = animateProgress(
      element,
      (progress) => ({ transform: `translate3d(${(1 - progress) * 100}%, 0, 0)` }),
      EASE_POWER3_OUT,
      0.32,
      () => {
        enterRef.current = null
        element.style.transform = 'translate3d(0, 0, 0)'
      }
    )
    enterRef.current = animation

    return () => {
      animation.cancel()
      enterRef.current = null
    }
  }, [])

  useEffect(() => {
    rootRef.current?.focus()
  }, [])

  const handleBack = () => {
    const element = rootRef.current
    if (!element || leavingRef.current) return
    leavingRef.current = true

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      navigate('/bots', { replace: true })
      return
    }

    // 进场还没跑完就返回时，从当前位置继续滑出，不跳回屏幕内重播。
    const width = element.offsetWidth
    const from = readTranslate(element, 'x')
    enterRef.current?.cancel()
    enterRef.current = null
    element.style.transform = `translate3d(${from}px, 0, 0)`

    animateProgress(
      element,
      (progress) => ({ transform: `translate3d(${from + (width - from) * progress}px, 0, 0)` }),
      EASE_POWER2_IN,
      0.24,
      () => navigate('/bots', { replace: true })
    )
  }

  const handleRemoved = () => {
    navigate('/bots', { replace: true })
  }

  return (
    <div
      ref={rootRef}
      className='fixed inset-0 z-[60] flex h-dvh flex-col bg-background outline-none'
      role='dialog'
      aria-modal='true'
      aria-label='机器人配置'
      tabIndex={-1}
    >
      {loading && !bot ? (
        <>
          <div className='flex h-14 items-center px-4'>
            <Button variant='ghost' size='sm' onPress={handleBack}>
              <ArrowLeft className='size-4' aria-hidden='true' />
              机器人列表
            </Button>
          </div>
          <div className='flex flex-col gap-4 px-4'>
            <Skeleton className='h-16 w-full rounded-2xl' />
            <Skeleton className='h-40 w-full rounded-2xl' />
            <Skeleton className='h-56 w-full rounded-2xl' />
          </div>
        </>
      ) : null}

      {!loading && !bot ? (
        <div className='flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center'>
          <span className='flex size-12 items-center justify-center rounded-full bg-surface-secondary text-muted'>
            <Bot className='size-5' aria-hidden='true' />
          </span>
          <div>
            <p className='text-base font-semibold'>找不到这个机器人</p>
            <p className='mt-1 text-[11px] leading-5 text-muted'>它可能已经被移除，或者配置在另一个窗口里被修改。</p>
          </div>
          <Button size='sm' variant='secondary' onPress={() => navigate('/bots', { replace: true })}>
            返回机器人列表
          </Button>
        </div>
      ) : null}

      {bot ? <DetailBody key={bot.appId} bot={bot} onBack={handleBack} onRemoved={handleRemoved} /> : null}
    </div>
  )
}
