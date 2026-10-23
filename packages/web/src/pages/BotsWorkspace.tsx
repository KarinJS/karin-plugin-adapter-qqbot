import { Button, Skeleton, toast } from '@heroui/react'
import { gsap } from 'gsap'
import { Bot, QrCode, Trash2 } from 'lucide-react'
import { useCallback, useLayoutEffect, useEffect, useRef, useState } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import { BotForm } from '@/components/BotForm'
import { BotList } from '@/components/BotList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'
import { dissolveBotCard } from '@/lib/dissolveBotCard'
import { SHEET_MOTION_DURATION, SHEET_MOTION_EASE } from '@/lib/sheetMotion'
import { getSmoothScroll, resizeSmoothScroll } from '@/lib/smoothScroll'
import { isDesktopMotion, prefersReducedMotion } from '@/lib/uiMotion'

const HEADER_COLLAPSE_DURATION = 0.26

const decodeAppId = (value: string | undefined) => {
  if (!value || value === 'new') return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

interface SheetSnapshot {
  /** 顶栏下方的裁切窗口，固定在画布轨道上。 */
  frame: HTMLDivElement
  /** 窗口里滚动的表单内容快照。 */
  sheet: HTMLElement
}

/** cloneNode 不复制输入框的实时值，手动同步，退场时不会闪回旧数据。 */
const syncFormFields = (source: HTMLElement, target: HTMLElement) => {
  const sourceFields = source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  )
  const targetFields = target.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input, textarea, select'
  )
  targetFields.forEach((field, index) => {
    const sourceField = sourceFields[index]
    if (!sourceField) return
    if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio')) {
      if (sourceField instanceof HTMLInputElement) field.checked = sourceField.checked
      return
    }
    field.value = sourceField.value
  })
}

/**
 * 顶栏下方内容的布局起点。
 *
 * 直接从顶栏高度和表单的行间距算，不读表单主体的 boundingRect：
 * 快速连点时主体可能还带着上一段入场动画的位移，读 rect 会把快照放错位置。
 */
const measureBodyOffset = (panel: HTMLElement) => {
  const header = panel.querySelector<HTMLElement>('[data-form-header]')
  const body = panel.querySelector<HTMLElement>('[data-form-body]')
  if (!header || !body) return 0

  const form = body.closest('form')
  const gap = form ? Number.parseFloat(getComputedStyle(form).rowGap) || 0 : 0
  return header.getBoundingClientRect().height + gap
}

/**
 * 克隆表单面板里顶栏以下的内容，作为翻页时的一页。
 *
 * 顶栏固定在屏幕顶部不参与翻页，所以快照里直接去掉；
 * 去掉后表单主体自然从快照顶部开始，不会再留出顶栏高度的空白带。
 */
const createFormSheet = (source: HTMLElement) => {
  const sheet = source.cloneNode(true) as HTMLElement
  sheet.removeAttribute('data-bots-panel')
  sheet.setAttribute('data-bots-snapshot', '')
  sheet.setAttribute('inert', '')
  sheet.setAttribute('aria-hidden', 'true')

  sheet.querySelector<HTMLElement>('[data-form-header]')?.remove()
  // 快照按布局位置摆放；上一段动画留下的位移不能带进来。
  for (const part of sheet.querySelectorAll<HTMLElement>('[data-form-body], [data-form-footer]')) {
    part.style.removeProperty('transform')
  }

  sheet.style.position = 'absolute'
  sheet.style.inset = '0'
  sheet.style.width = '100%'
  sheet.style.height = '100%'
  sheet.style.margin = '0'
  sheet.style.overflowY = 'hidden'
  sheet.style.pointerEvents = 'none'
  sheet.style.background = 'var(--background)'

  syncFormFields(source, sheet)
  return sheet
}

/** 顶栏下方那一页的固定裁切窗口。 */
const createSheetFrame = (left: number, top: number, width: number, height: number, zIndex: number) => {
  const frame = document.createElement('div')
  frame.setAttribute('data-bots-snapshot-frame', '')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.position = 'fixed'
  frame.style.left = `${left}px`
  frame.style.top = `${top}px`
  frame.style.width = `${width}px`
  frame.style.height = `${height}px`
  frame.style.overflow = 'hidden'
  frame.style.pointerEvents = 'none'
  frame.style.zIndex = String(zIndex)
  return frame
}

interface PanelCloneOptions {
  left: number
  top: number
  width: number
  height: number
  zIndex: number
  /** 宽屏整块面板翻页时把顶栏换成等高占位，顶栏由固定层单独显示。 */
  blankHeader?: boolean
}

/** 整块面板快照：窄屏翻页，以及宽屏首次选中/骨架态没有表单主体时使用。 */
const createPanelClone = (source: HTMLElement, options: PanelCloneOptions) => {
  // 顶栏高度要在原面板上量，克隆节点脱离文档后量不到。
  const headerHeight = options.blankHeader
    ? (source.querySelector<HTMLElement>('[data-form-header]')?.getBoundingClientRect().height ?? 0)
    : 0
  const clone = source.cloneNode(true) as HTMLElement
  clone.removeAttribute('data-bots-panel')
  clone.setAttribute('data-bots-snapshot', '')
  clone.setAttribute('inert', '')
  clone.setAttribute('aria-hidden', 'true')
  clone.style.position = 'fixed'
  clone.style.left = `${options.left}px`
  clone.style.top = `${options.top}px`
  clone.style.width = `${options.width}px`
  clone.style.height = `${options.height}px`
  clone.style.margin = '0'
  clone.style.zIndex = String(options.zIndex)
  clone.style.overflowY = 'auto'
  clone.style.pointerEvents = 'none'
  clone.style.background = 'var(--background)'

  if (options.blankHeader) {
    const cloneHeader = clone.querySelector<HTMLElement>('[data-form-header]')
    if (cloneHeader) {
      const spacer = document.createElement('div')
      spacer.setAttribute('aria-hidden', 'true')
      spacer.style.height = `${headerHeight}px`
      cloneHeader.replaceWith(spacer)
    }
  }

  syncFormFields(source, clone)
  return clone
}

/**
 * 桌面端机器人工作区。
 *
 * 列表和表单常驻在同一个工作区里：选中机器人时页头收起、右侧占位卡换成表单，
 * 而不是整页重新挂载。页头高度和右侧面板同时做过渡，
 * 左侧列表不会在点击的一瞬间整体上移。
 */
export const BotsWorkspace = () => {
  const match = useMatch('/bots/:appId')
  const { pathname } = useLocation()
  const appId = decodeAppId(match?.params.appId)
  const selected = Boolean(appId)
  // 画布会一直挂载这个页面；只有路由停在机器人工作区时列表才应该保留滚动位置。
  const workspaceActive = pathname === '/bots' || (pathname.startsWith('/bots/') && pathname !== '/bots/new')
  const { config, statuses, loading, remove, saving } = useConfigStore()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelContentRef = useRef<HTMLDivElement>(null)
  const headerFirstRef = useRef(true)
  const panelFirstRef = useRef(true)
  const switchRef = useRef<{ up: boolean } | null>(null)
  const previousAppIdRef = useRef<string | null>(appId || null)
  const cloneRef = useRef<HTMLElement | null>(null)
  // 宽屏翻页时旧内容和新内容各是一张固定在顶栏下方的快照，两张快照同一条时间线。
  const outgoingRef = useRef<SheetSnapshot | null>(null)
  const incomingRef = useRef<SheetSnapshot | null>(null)
  const pageTurnRef = useRef<gsap.core.Timeline | null>(null)
  // 布局 effect 只跟 appId 走，用 ref 读最新列表顺序，避免列表更新时重放动画。
  const configRef = useRef(config)
  configRef.current = config

  const cancelPageTurn = useCallback(() => {
    pageTurnRef.current?.kill()
    pageTurnRef.current = null

    for (const snapshot of [outgoingRef.current, incomingRef.current]) {
      if (!snapshot) continue
      gsap.killTweensOf(snapshot.sheet)
      snapshot.frame.remove()
    }
    outgoingRef.current = null
    incomingRef.current = null

    // 窄屏整块面板快照。
    const clone = cloneRef.current
    if (clone) {
      gsap.killTweensOf(clone)
      clone.remove()
      cloneRef.current = null
    }
  }, [])

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

    if (prefersReducedMotion()) {
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

    // 不是列表点击引起的路由变化：清掉可能残留的翻页快照。
    if (!pending) cancelPageTurn()

    gsap.killTweensOf(element)
    // 换机器人时表单从顶部开始，不沿用上一个机器人的滚动位置。
    element.scrollTop = 0
    getSmoothScroll(element)?.scrollTo(0, { immediate: true })
    resizeSmoothScroll(element)

    if (panelFirstRef.current) {
      panelFirstRef.current = false
      previousAppIdRef.current = appId || null
      // 不要给面板写 transform：面板一旦成为层叠上下文，内部固定顶栏的 z-index
      // 就会被关在里面，翻页快照反而盖住顶栏。
      gsap.set(element, { autoAlpha: 1 })
      element.style.transform = ''
      return
    }

    const previousAppId = previousAppIdRef.current
    previousAppIdRef.current = appId || null

    // 宽屏顶栏固定，只移动顶栏下面的表单内容和底部卡片；窄屏仍然整块翻页。
    const body = element.querySelector<HTMLElement>('[data-form-body]')
    const footer = element.querySelector<HTMLElement>('[data-form-footer]')
    const parts = [body, footer].filter((node): node is HTMLElement => Boolean(node))
    const target = isDesktopMotion() && parts.length > 0 ? parts : content

    if (prefersReducedMotion()) {
      cancelPageTurn()
      if (target) {
        gsap.killTweensOf(target)
        gsap.set(target, { clearProps: 'transform' })
      }
      if (content) {
        gsap.killTweensOf(content)
        gsap.set(content, { clearProps: 'transform' })
      }
      return
    }

    /*
      宽屏列表翻页：旧内容快照已经在 handleSelect 里放到顶栏下方，
      这里再给新内容拍一张同样大小的快照，两张快照首尾相接，
      在同一个时间线里朝同一方向滑过。真实内容留在快照后面，
      动画结束时直接露出最终位置，不会出现新旧内容之间的空白带。
    */
    const outgoing = pending ? outgoingRef.current : null
    if (pending && outgoing && workspaceRef.current) {
      // 真实内容先归位，快照结束时无跳变。
      gsap.killTweensOf(target)
      if (target) gsap.set(target, { clearProps: 'transform' })
      if (content) {
        gsap.killTweensOf(content)
        gsap.set(content, { clearProps: 'transform' })
      }

      if (body) {
        const frame = outgoing.frame.cloneNode(false) as HTMLDivElement
        frame.style.zIndex = '10'
        const sheet = createFormSheet(element)
        frame.appendChild(sheet)
        workspaceRef.current.appendChild(frame)
        sheet.scrollTop = 0

        const pageHeight = outgoing.frame.getBoundingClientRect().height
        const direction = pending.up ? -1 : 1
        const incoming: SheetSnapshot = { frame, sheet }
        incomingRef.current = incoming

        const timeline = gsap.timeline({
          onComplete: () => {
            outgoing.frame.remove()
            frame.remove()
            if (outgoingRef.current === outgoing) outgoingRef.current = null
            if (incomingRef.current === incoming) incomingRef.current = null
            if (pageTurnRef.current === timeline) pageTurnRef.current = null
          },
        })
        timeline.fromTo(
          outgoing.sheet,
          { y: 0 },
          {
            y: direction * pageHeight,
            duration: SHEET_MOTION_DURATION,
            ease: SHEET_MOTION_EASE,
          },
          0
        )
        timeline.fromTo(
          sheet,
          { y: -direction * pageHeight },
          {
            y: 0,
            duration: SHEET_MOTION_DURATION,
            ease: SHEET_MOTION_EASE,
          },
          0
        )
        pageTurnRef.current = timeline
        return
      }

      // 目标没有可翻入的表单内容（例如加载骨架），只让旧快照滑出。
      const pageHeight = outgoing.frame.getBoundingClientRect().height
      const direction = pending.up ? -1 : 1
      const timeline = gsap.timeline({
        onComplete: () => {
          outgoing.frame.remove()
          if (outgoingRef.current === outgoing) outgoingRef.current = null
          if (pageTurnRef.current === timeline) pageTurnRef.current = null
        },
      })
      timeline.fromTo(
        outgoing.sheet,
        { y: 0 },
        {
          y: direction * pageHeight,
          duration: SHEET_MOTION_DURATION,
          ease: SHEET_MOTION_EASE,
        }
      )
      pageTurnRef.current = timeline
      return
    }

    if (!target) return

    const distance = element.clientHeight
    // 内容顶边要贴着屏幕边缘入场：顶栏占掉的高度不参与这段位移。
    const bodyOffset = body ? measureBodyOffset(element) : 0
    const startY = (up: boolean) => (up ? distance - bodyOffset : -bodyOffset)

    if (pending) {
      // 窄屏：旧面板快照已经在 handleSelect 里滑出屏幕，新内容从相反方向滑进来。
      gsap.killTweensOf(target)
      gsap.fromTo(
        target,
        { y: startY(pending.up) },
        {
          y: 0,
          duration: SHEET_MOTION_DURATION,
          ease: SHEET_MOTION_EASE,
          clearProps: 'transform',
        }
      )
      return
    }

    // 非列表点击引起的路由变化（前进 / 后退、移除后回到列表）没有旧内容可快照，
    // 只让新内容按列表顺序从对应方向进入。
    const fromIndex = configRef.current.findIndex((item) => item.appId === previousAppId)
    const toIndex = configRef.current.findIndex((item) => item.appId === appId)
    const up = fromIndex === -1 || toIndex === -1 ? true : toIndex > fromIndex
    gsap.killTweensOf(target)
    gsap.fromTo(
      target,
      { y: startY(up) },
      {
        y: 0,
        duration: SHEET_MOTION_DURATION,
        ease: SHEET_MOTION_EASE,
        clearProps: 'transform',
      }
    )
  }, [appId, cancelPageTurn])

  // 卸载时清掉还在退场的快照，避免 fixed 副本留在页面上。
  useEffect(() => cancelPageTurn, [cancelPageTurn])

  /**
   * 列表点击换机器人。
   *
   * 宽屏下顶栏固定不动，只让顶栏下面的表单内容翻页：先给旧内容拍一张快照，
   * 路由切到目标机器人后再给新内容拍一张，两张快照在同一个时间线里首尾相接滑过。
   * 窄屏保持原来的整块面板翻页。翻页途中再次点击直接撤掉旧快照，从当前画面重新开始。
   */
  const handleSelect = (nextAppId: string) => {
    if (!nextAppId || nextAppId === appId) return

    cancelPageTurn()

    const panel = panelRef.current
    const content = panelContentRef.current
    const workspace = workspaceRef.current
    const fromIndex = config.findIndex((item) => item.appId === appId)
    const toIndex = config.findIndex((item) => item.appId === nextAppId)
    // 列表里往下点（索引变大）时旧内容向上滑出、新内容从底部进入，反方向同理。
    const up = fromIndex === -1 || toIndex === -1 ? true : toIndex > fromIndex
    const desktopMotion = isDesktopMotion()

    if (!panel || !content || !workspace || prefersReducedMotion()) {
      navigate(`/bots/${encodeURIComponent(nextAppId)}`)
      return
    }

    const rect = panel.getBoundingClientRect()
    const body = panel.querySelector<HTMLElement>('[data-form-body]')
    // 顶栏下方内容的起点（滚动内容坐标）；面板滚过也能还原到同一个位置。
    const bodyOffset = body ? measureBodyOffset(panel) : 0
    const pageHeight = rect.height - bodyOffset

    if (desktopMotion && body && pageHeight > 0) {
      // 快照固定在画布轨道上，而不是跟着面板的滚动区走：
      // 否则快照滑到工作区外面会把整页的 scrollHeight 撑大。
      const track = workspace.closest<HTMLElement>('.will-change-transform')
      const trackRect = track?.getBoundingClientRect() ?? null
      const frame = createSheetFrame(
        rect.left - (trackRect?.left ?? 0),
        rect.top - (trackRect?.top ?? 0) + bodyOffset,
        rect.width,
        pageHeight,
        11
      )
      const sheet = createFormSheet(panel)
      frame.appendChild(sheet)
      workspace.appendChild(frame)
      // 快照从旧表单当前的滚动位置开始，退场时内容和点击前完全一致。
      sheet.scrollTop = panel.scrollTop
      outgoingRef.current = { frame, sheet }
    } else {
      // 宽屏首次选中/骨架态还没有表单主体，沿用整块面板翻页；窄屏同理。
      const track = desktopMotion ? workspace.closest<HTMLElement>('.will-change-transform') : null
      const trackRect = track?.getBoundingClientRect() ?? null
      const clone = createPanelClone(panel, {
        left: rect.left - (trackRect?.left ?? 0),
        top: rect.top - (trackRect?.top ?? 0),
        width: rect.width,
        height: rect.height,
        zIndex: desktopMotion ? 10 : 45,
        blankHeader: desktopMotion,
      })
      ;(desktopMotion ? workspace : document.body).appendChild(clone)
      clone.scrollTop = panel.scrollTop
      cloneRef.current = clone

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
    }

    switchRef.current = { up }
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
      prefersReducedMotion() ? 0 : 160
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
    <div className='flex min-w-0 flex-col gap-5'>
      <BotForm bot={bot} />
      {dangerZone ? <div data-form-footer=''>{dangerZone}</div> : null}
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
      <h3 className='mt-4 text-base leading-[1.15] font-semibold tracking-[-0.02em]'>选择一个机器人</h3>
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
        画布的宽屏工作区不需要再放一遍「机器人」大标题：
        列表自己的标题已经说明了内容，去掉后列表才能占满整屏、卡片从屏幕顶部滚出。
      */}
      <div ref={headerRef} className='overflow-hidden xl:hidden'>
        <PageHeader
          eyebrow='Bots'
          title='机器人'
          description='每个机器人独立配置事件通道、场景开关和消息缓存。'
          className='pb-6'
        />
      </div>

      {empty ? (
        <div className='xl:px-6 xl:pb-6'>
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
          ref={workspaceRef}
          data-bots-workspace=''
          className='relative grid items-start gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[20rem_minmax(0,1fr)] xl:grid-rows-[minmax(0,1fr)] xl:items-stretch'
        >
          {/*
            左列占满工作区高度，标题固定在列顶不参与滚动，卡片在列表内部滚。
            右侧表单自己是一个滚动容器，两列各滚各的，整页不再滚动。
          */}
          <BotList
            selectedAppId={bot?.appId}
            showAdd={false}
            overlay
            className='xl:h-full xl:min-h-0'
            syncRouteScroll
            active={workspaceActive}
            onSelect={handleSelect}
          />

          <div
            ref={panelRef}
            data-bots-panel=''
            className='[scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex min-w-0 flex-col gap-5 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-6 xl:pb-6'
          >
            <div ref={panelContentRef} className='flex min-w-0 flex-col gap-5'>
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
