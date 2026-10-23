import { Button, Skeleton, cn, toast } from '@heroui/react'
import { gsap } from 'gsap'
import { Bot, QrCode, Trash2 } from 'lucide-react'
import { useLayoutEffect, useEffect, useRef, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { BotForm } from '@/components/BotForm'
import { BotList } from '@/components/BotList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useEmbedded } from '@/hooks/useEmbedded'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { dissolveBotCard } from '@/lib/dissolveBotCard'
import { SHEET_MOTION_DURATION, SHEET_MOTION_EASE } from '@/lib/sheetMotion'
import { getSmoothScroll, resizeSmoothScroll } from '@/lib/smoothScroll'

const HEADER_COLLAPSE_DURATION = 0.26

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
  const panelContentRef = useRef<HTMLDivElement>(null)
  const headerFirstRef = useRef(true)
  const panelFirstRef = useRef(true)
  const switchRef = useRef<{ up: boolean } | null>(null)
  const previousAppIdRef = useRef<string | null>(appId || null)
  const cloneRef = useRef<HTMLElement | null>(null)
  const transitioningRef = useRef(false)
  // 布局 effect 只跟 appId 走，用 ref 读最新列表顺序，避免列表更新时重放动画。
  const configRef = useRef(config)
  configRef.current = config

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

    const content = panelContentRef.current
    const pending = switchRef.current
    switchRef.current = null

    gsap.killTweensOf(element)
    // 换机器人时表单从顶部开始，不沿用上一个机器人的滚动位置。
    element.scrollTop = 0
    getSmoothScroll(element)?.scrollTo(0, { immediate: true })
    resizeSmoothScroll(element)

    if (panelFirstRef.current) {
      panelFirstRef.current = false
      previousAppIdRef.current = appId || null
      gsap.set(element, { autoAlpha: 1, y: 0 })
      return
    }

    const previousAppId = previousAppIdRef.current
    previousAppIdRef.current = appId || null

    if (reduceMotion() || !content) {
      transitioningRef.current = false
      return
    }

    if (pending) {
      // 旧表单的快照已经在 handleSelect 里滑出屏幕，新表单从相反方向滑进来。
      const distance = element.clientHeight
      gsap.killTweensOf(content)
      gsap.fromTo(
        content,
        { y: pending.up ? distance : -distance },
        {
          y: 0,
          duration: SHEET_MOTION_DURATION,
          ease: SHEET_MOTION_EASE,
          clearProps: 'transform',
          onComplete: () => {
            transitioningRef.current = false
          },
        }
      )
      return
    }

    // 非列表点击引起的路由变化（前进 / 后退、移除后回到列表）没有旧内容可快照，
    // 只让新内容按列表顺序从对应方向进入。
    const fromIndex = configRef.current.findIndex((item) => item.appId === previousAppId)
    const toIndex = configRef.current.findIndex((item) => item.appId === appId)
    const up = fromIndex === -1 || toIndex === -1 ? true : toIndex > fromIndex
    const distance = element.clientHeight
    gsap.killTweensOf(content)
    gsap.fromTo(
      content,
      { y: up ? distance : -distance },
      {
        y: 0,
        duration: SHEET_MOTION_DURATION,
        ease: SHEET_MOTION_EASE,
        clearProps: 'transform',
      }
    )
    transitioningRef.current = false
  }, [appId])

  // 卸载时清掉还在退场的快照，避免 fixed 副本留在页面上。
  useEffect(
    () => () => {
      const clone = cloneRef.current
      if (!clone) return
      gsap.killTweensOf(clone)
      clone.remove()
      cloneRef.current = null
    },
    []
  )

  /**
   * 列表点击换机器人。
   *
   * 先给当前面板拍一张快照（保留滚动位置、输入值和顶部模糊），让它按列表方向
   * 整块滑出屏幕；路由立即切到目标机器人，新表单从反方向滑入。
   * 中间经过的机器人不会依次播放，一次点击只走一段。
   */
  const handleSelect = (nextAppId: string) => {
    if (!nextAppId || nextAppId === appId || transitioningRef.current) return

    const panel = panelRef.current
    const content = panelContentRef.current
    const fromIndex = config.findIndex((item) => item.appId === appId)
    const toIndex = config.findIndex((item) => item.appId === nextAppId)
    // 列表里往下点（索引变大）时旧表单向上滑出、新表单从底部进入，反方向同理。
    const up = fromIndex === -1 || toIndex === -1 ? true : toIndex > fromIndex

    if (!panel || !content || reduceMotion()) {
      navigate(`/bots/${encodeURIComponent(nextAppId)}`)
      return
    }

    const rect = panel.getBoundingClientRect()
    const clone = panel.cloneNode(true) as HTMLElement
    clone.removeAttribute('data-bots-panel')
    clone.setAttribute('data-bots-snapshot', '')
    clone.setAttribute('inert', '')
    clone.setAttribute('aria-hidden', 'true')
    clone.style.position = 'fixed'
    clone.style.left = `${rect.left}px`
    clone.style.top = `${rect.top}px`
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`
    clone.style.margin = '0'
    clone.style.zIndex = '45'
    clone.style.overflowY = 'auto'
    clone.style.pointerEvents = 'none'
    clone.style.background = 'var(--background)'

    // cloneNode 不复制输入框的实时值，手动同步，退场时不会闪回旧数据。
    const sourceFields = panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select'
    )
    const cloneFields = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      'input, textarea, select'
    )
    cloneFields.forEach((field, index) => {
      const source = sourceFields[index]
      if (!source) return
      if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
        if (source instanceof HTMLInputElement) field.checked = source.checked
        return
      }
      field.value = source.value
    })

    document.body.appendChild(clone)
    clone.scrollTop = panel.scrollTop

    cloneRef.current = clone
    transitioningRef.current = true
    switchRef.current = { up }
    gsap.killTweensOf(clone)
    gsap.to(clone, {
      y: up ? -rect.height : rect.height,
      duration: SHEET_MOTION_DURATION,
      ease: SHEET_MOTION_EASE,
      onComplete: () => {
        clone.remove()
        if (cloneRef.current === clone) cloneRef.current = null
      },
    })

    navigate(`/bots/${encodeURIComponent(nextAppId)}`)
  }

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

  // 表单面板是独立滚动区，滚轮平滑交给 Lenis；空状态时面板不存在。
  useSmoothScroll(panelRef, panelContentRef, { enabled: !empty })

  return (
    <div className='flex flex-col xl:h-full xl:min-h-0'>
      {/*
        嵌入画布的宽屏工作区不需要再放一遍「机器人」大标题：
        列表自己的标题已经说明了内容，去掉后列表才能占满整屏、卡片从屏幕顶部滚出。
      */}
      <div ref={headerRef} className={cn('overflow-hidden', embedded && 'xl:hidden')}>
        <PageHeader
          eyebrow='Bots'
          title='机器人'
          description='每个机器人独立配置事件通道、场景开关和消息缓存。'
          className={cn('pb-6', embedded && 'xl:px-6 xl:pt-6')}
        />
      </div>

      {empty ? (
        <div className={cn(embedded && 'xl:px-6 xl:pb-6')}>
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
        </div>
      ) : (
        <div
          data-bots-workspace=''
          className='grid items-start gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[20rem_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] xl:items-stretch'
        >
          {/*
            左列占满工作区高度，标题固定在列顶不参与滚动，卡片在列表内部滚。
            右侧表单自己是一个滚动容器，两列各滚各的，整页不再滚动。
          */}
          <BotList
            selectedAppId={bot?.appId}
            showAdd={false}
            overlay={embedded}
            className='xl:h-full xl:min-h-0'
            onSelect={handleSelect}
          />

          <div
            ref={panelRef}
            data-bots-panel=''
            className={cn(
              'no-scrollbar flex min-w-0 flex-col gap-5 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain',
              embedded && 'xl:pr-6 xl:pb-6'
            )}
          >
            <div ref={panelContentRef} className={cn('flex min-w-0 flex-col gap-5', embedded && 'xl:pt-6')}>
              {panel}
            </div>
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
