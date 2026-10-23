import { Button, Skeleton, toast } from '@heroui/react'
import { gsap } from 'gsap'
import { Bot, QrCode, Trash2 } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { BotForm } from '@/components/BotForm'
import { BotList } from '@/components/BotList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useEmbedded } from '@/hooks/useEmbedded'
import { dissolveBotCard } from '@/lib/dissolveBotCard'

const HEADER_COLLAPSE_DURATION = 0.26
const PANEL_ENTER_DURATION = 0.22
const PANEL_ENTER_EASE = 'power3.out'

const decodeAppId = (value: string | undefined) => {
  if (!value || value === 'new') return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 桌面端机器人工作区。
 *
 * 列表和表单常驻在同一个工作区里：选中机器人时页头收起、右侧占位卡换成表单，
 * 而不是整页重新挂载。页头高度和右侧面板同时做过渡，
 * 左侧列表不会在点击的一瞬间整体上移。
 */
export const BotsWorkspace = () => {
  const match = useMatch('/bots/:appId')
  const appId = decodeAppId(match?.params.appId)
  const selected = Boolean(appId)
  const { config, statuses, loading, remove, saving } = useConfigStore()
  const embedded = useEmbedded()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const headerFirstRef = useRef(true)
  const panelFirstRef = useRef(true)

  const bot = config.find((item) => item.appId === appId)
  const status = bot ? statuses[bot.appId] : undefined

  useLayoutEffect(() => {
    const element = headerRef.current
    if (!element) return

    gsap.killTweensOf(element)
    const collapsed = Boolean(appId)

    if (headerFirstRef.current) {
      headerFirstRef.current = false
      gsap.set(element, { height: collapsed ? 0 : 'auto', autoAlpha: collapsed ? 0 : 1, y: 0 })
      return
    }

    if (reduceMotion()) {
      gsap.set(element, { height: collapsed ? 0 : 'auto', autoAlpha: collapsed ? 0 : 1, y: 0 })
      return
    }

    // 收起时把高度、位移和透明度一起走完，列表是滑上去而不是跳上去。
    gsap.to(element, {
      height: collapsed ? 0 : 'auto',
      autoAlpha: collapsed ? 0 : 1,
      y: collapsed ? -8 : 0,
      duration: HEADER_COLLAPSE_DURATION,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }, [appId])

  useLayoutEffect(() => {
    const element = panelRef.current
    if (!element) return

    gsap.killTweensOf(element)
    // 换机器人时表单从顶部开始，不沿用上一个机器人的滚动位置。
    element.scrollTop = 0

    if (panelFirstRef.current) {
      panelFirstRef.current = false
      gsap.set(element, { autoAlpha: 1, y: 0 })
      return
    }

    if (reduceMotion()) {
      gsap.set(element, { autoAlpha: 1, y: 0 })
      return
    }

    gsap.fromTo(
      element,
      { autoAlpha: 0, y: 8 },
      {
        autoAlpha: 1,
        y: 0,
        duration: PANEL_ENTER_DURATION,
        ease: PANEL_ENTER_EASE,
        clearProps: 'transform,visibility,opacity',
      }
    )
  }, [appId])

  const handleRemove = () => {
    if (!bot || removing) return

    const name = status?.name || bot.appId
    const color = !bot.event.type ? 'rgb(150 150 150)' : status?.online ? 'rgb(74 222 128)' : 'rgb(250 204 21)'

    setRemoving(true)
    setConfirmOpen(false)

    // 等确认框退场后再让卡片散开，粒子不会被遮罩挡住。
    window.setTimeout(
      () => {
        const dissolve = dissolveBotCard(bot.appId, color)

        void (async () => {
          if (dissolve) await dissolve.cardDone

          try {
            await remove(bot.appId)
            if (dissolve) await dissolve.particlesDone
            toast.success('机器人已移除', { description: `${name} 已从配置中删除` })
            navigate('/bots', { replace: true })
          } catch {
            dissolve?.restore()
            // ConfigProvider 已经记录错误。
          } finally {
            setRemoving(false)
          }
        })()
      },
      reduceMotion() ? 0 : 160
    )
  }

  const dangerZone = bot ? (
    <SectionCard title='移除机器人' description='从 config.json 中删除该机器人，并断开当前连接。'>
      <Button variant='danger' onPress={() => setConfirmOpen(true)}>
        <Trash2 className='size-4' aria-hidden='true' />
        移除 {bot.appId}
      </Button>
    </SectionCard>
  ) : null

  const panel = bot ? (
    <div key={bot.appId} className='flex min-w-0 flex-col gap-5'>
      <BotForm bot={bot} />
      {dangerZone}
    </div>
  ) : selected && loading ? (
    <div className='flex flex-col gap-4'>
      <Skeleton className='h-9 w-56 rounded-xl' />
      <Skeleton className='h-40 w-full rounded-2xl' />
      <Skeleton className='h-64 w-full rounded-2xl' />
    </div>
  ) : selected ? (
    <EmptyState
      icon={<Bot className='size-5' aria-hidden='true' />}
      title='找不到这个机器人'
      description='它可能已经被移除，或者配置文件在另一个窗口里被修改。'
      action={
        <Button variant='secondary' onPress={() => navigate('/bots')}>
          返回机器人列表
        </Button>
      }
    />
  ) : (
    <div className='flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-transparent p-8 text-center'>
      <span className='flex size-12 items-center justify-center rounded-full border border-border bg-surface text-muted'>
        <Bot className='size-5' aria-hidden='true' />
      </span>
      <h3 className='text-heading mt-4 text-base font-semibold'>选择一个机器人</h3>
      <p className='mt-2 max-w-sm text-sm leading-6 text-muted'>
        从左侧选择机器人查看和修改配置。保存后适配器会自动重连，不需要重启 Karin。
      </p>
    </div>
  )

  const empty = !loading && config.length === 0 && !selected

  return (
    <div className='flex flex-col xl:h-full xl:min-h-0'>
      <div ref={headerRef} className='overflow-hidden'>
        <PageHeader
          eyebrow='Bots'
          title='机器人'
          description='每个机器人独立配置事件通道、场景开关和消息缓存。'
          className='pb-6'
        />
      </div>

      {empty ? (
        <EmptyState
          icon={<QrCode className='size-5' aria-hidden='true' />}
          title='还没有机器人'
          description='扫码授权后会自动创建配置。也可以进入添加页面手动填写 AppID 和 AppSecret。'
          action={
            <Button onPress={() => navigate('/bots/new')}>
              <QrCode className='size-4' aria-hidden='true' />
              添加第一个机器人
            </Button>
          }
        />
      ) : (
        <div
          data-bots-workspace=''
          className='grid items-start gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[20rem_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] xl:items-stretch'
        >
          {/*
            左列占满工作区高度，标题固定在列顶不参与滚动，卡片在列表内部滚。
            右侧表单自己是一个滚动容器，两列各滚各的，整页不再滚动。
          */}
          <BotList selectedAppId={bot?.appId} showAdd={false} overlay={embedded} className='xl:h-full xl:min-h-0' />

          <div
            ref={panelRef}
            data-bots-panel=''
            className='no-scrollbar flex min-w-0 flex-col gap-5 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain'
          >
            {panel}
          </div>
        </div>
      )}

      {bot ? (
        <ConfirmDialog
          isOpen={confirmOpen}
          onOpenChange={setConfirmOpen}
          title='移除这个机器人？'
          description={
            <>
              将从配置文件中删除 <span className='font-medium text-foreground'>{bot.appId}</span>
              ，并断开它的连接。这个操作不会在 QQ 开放平台侧删除机器人。
            </>
          }
          confirmLabel='移除'
          isPending={removing || saving}
          onConfirm={handleRemove}
        />
      ) : null}
    </div>
  )
}
