import { GradientAvatar } from '@outpacelabs/avatars'
import { cn } from '@heroui/react'
import { gsap } from 'gsap'
import { Bot, Camera, ChevronLeft, CirclePlus, Image as ImageIcon, Menu, Mic, Smile, Sparkles } from 'lucide-react'
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Ios27StatusBar } from '@/components/menu-panel/phone/Ios27StatusBar'
import { MenuBar } from '@/components/menu-panel/phone/MenuBar'
import { PanelSheet } from '@/components/menu-panel/phone/PanelSheet'
import { PhoneToast, type PhoneToastMessage } from '@/components/menu-panel/phone/PhoneToast'
import type { MenuItemDraft, PanelDraft } from '@/lib/menuPanelDraft'
import type { PanelScene } from '@/lib/menuPanelTypes'
import { prefersReducedMotion } from '@/lib/uiMotion'

interface FakeQQChatProps {
  scene: PanelScene
  panel: PanelDraft | null
  menuItems: MenuItemDraft[]
  sheetOpen: boolean
  onOpenSheet: () => void
  onCloseSheet: () => void
  scale: number
  botName: string
  botAvatar?: string
}

interface ChatMessage {
  id: string
  role: 'in' | 'out' | 'system'
  text?: string
  author?: string
  /** 与上一条不同时渲染时间分隔；第一条带「今天」。 */
  time?: string
  /** 引用回复。 */
  quote?: { author: string; text: string }
}

const SELF_SEED = 'preview-self'
const SELF_LABEL = '我'
const GROUP_TITLE = 'Karin 交流群'

const defaultMessages = (scene: PanelScene, botName: string): ChatMessage[] =>
  scene === 'c2c'
    ? [
        {
          id: 'c2c-1',
          role: 'in',
          text: `你好，我是 ${botName} 👋\n有什么可以帮你的吗？`,
          author: botName,
          time: '今天 09:41',
        },
        { id: 'c2c-3', role: 'out', text: '好呀，我先看看。' },
        {
          id: 'c2c-4',
          role: 'in',
          author: botName,
          time: '09:42',
          quote: { author: SELF_LABEL, text: '好呀，我先看看。' },
          text: '发送 /help 也可以随时唤起帮助。',
        },
        { id: 'c2c-5', role: 'out', text: '/help' },
        {
          id: 'c2c-6',
          role: 'in',
          author: botName,
          text: '可用指令：\n/天气 查询天气\n/签到 每日签到\n/帮助 查看全部功能',
        },
        { id: 'c2c-7', role: 'out', text: '收到，谢谢！' },
        {
          id: 'c2c-8',
          role: 'in',
          author: botName,
          time: '09:43',
          text: '不客气，有问题随时找我～',
        },
      ]
    : [
        {
          id: 'group-1',
          role: 'system',
          text: `你邀请 ${botName} 加入了群聊`,
          time: '今天 09:41',
        },
        { id: 'group-2', role: 'in', text: '欢迎欢迎 👏', author: '小明' },
        {
          id: 'group-3',
          role: 'in',
          text: '大家好，我是机器人，发送 /help 查看可用指令。',
          author: botName,
        },
        { id: 'group-4', role: 'in', text: '这个机器人能做什么？', author: '小红' },
        {
          id: 'group-5',
          role: 'in',
          author: botName,
          quote: { author: '小红', text: '这个机器人能做什么？' },
          text: '可以查天气、签到，输入 / 也能看到全部功能。',
        },
        { id: 'group-6', role: 'out', text: '我来试试 /help', time: '09:42' },
        {
          id: 'group-7',
          role: 'in',
          author: botName,
          text: '群聊可用指令：\n/天气 查询天气\n/签到 每日签到\n/帮助 查看全部功能',
        },
        { id: 'group-8', role: 'in', author: '小明', time: '09:43', text: '好耶 👍' },
      ]

let messageSeed = 0
const nextMessageId = () => `msg-${++messageSeed}`

/**
 * 聊天头像。
 *
 * 有真实头像地址时优先使用；否则用 @outpacelabs/avatars 按 seed 生成
 * 稳定的渐变头像，既不用请求图片，同一个用户每次渲染也保持一致。
 */
const PhoneAvatar = ({
  src,
  seed,
  size = 36,
  className,
}: {
  src?: string
  seed: string
  size?: number
  className?: string
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(src) && failedSrc !== src

  return (
    <span
      aria-hidden='true'
      className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={src}
          alt=''
          draggable={false}
          referrerPolicy='no-referrer'
          className='h-full w-full object-cover'
          onError={() => setFailedSrc(src ?? null)}
        />
      ) : (
        <GradientAvatar seed={seed} size={size} radius='9999px' />
      )}
    </span>
  )
}

const QuoteBlock = ({ quote, out }: { quote: NonNullable<ChatMessage['quote']>; out: boolean }) => (
  <div
    className={cn(
      'mb-1.5 rounded-xl px-2 py-1.5 text-[11.5px] leading-[1.4]',
      out ? 'bg-white/15 text-white/85' : 'bg-(--qq-text)/5 text-(--qq-muted)'
    )}
  >
    <span className='font-medium'>{quote.author}</span>
    <span className='mx-1 opacity-60'>·</span>
    <span>{quote.text}</span>
  </div>
)

const MessageBubble = ({
  message,
  scene,
  botName,
  botAvatar,
}: {
  message: ChatMessage
  scene: PanelScene
  botName: string
  botAvatar?: string
}) => {
  if (message.role === 'system') {
    return (
      <div className='qq-message-in flex justify-center px-6'>
        <span className='text-center text-[11.5px] leading-normal text-(--qq-muted)'>{message.text}</span>
      </div>
    )
  }

  if (message.role === 'out') {
    return (
      <div className='qq-message-in flex items-start justify-end gap-2.5'>
        <div className='flex max-w-[70%] flex-col items-end'>
          <div className='rounded-[14px] bg-(--qq-bubble-out) px-3.5 py-2.5 text-[16px] leading-[1.4] wrap-break-word whitespace-pre-wrap text-(--qq-bubble-out-text)'>
            {message.quote ? <QuoteBlock quote={message.quote} out /> : null}
            {message.text}
          </div>
        </div>
        <PhoneAvatar seed={SELF_SEED} size={36} />
      </div>
    )
  }

  const isBot = message.author === botName
  const author = message.author || botName
  // QQ 单聊不在消息左侧展示对方头像；群聊才显示发送者头像和昵称。
  const showPeerAvatar = scene === 'group'

  return (
    <div className='qq-message-in flex items-start gap-2.5'>
      {showPeerAvatar ? (
        <PhoneAvatar src={isBot ? botAvatar : undefined} seed={isBot ? botName : author} size={36} />
      ) : null}
      <div className='flex max-w-[70%] flex-col items-start'>
        {scene === 'group' ? (
          <p className='mb-1 ml-0.5 max-w-full truncate text-[11.5px] leading-none text-(--qq-muted)'>{author}</p>
        ) : null}

        <div className='rounded-[14px] bg-(--qq-bubble-in) px-3.5 py-2.5 text-[16px] leading-[1.4] wrap-break-word whitespace-pre-wrap text-(--qq-bubble-in-text)'>
          {message.quote ? <QuoteBlock quote={message.quote} out={false} /> : null}
          {message.text}
        </div>
      </div>
    </div>
  )
}

const ToolButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) => (
  <button
    type='button'
    aria-label={label}
    onClick={onClick}
    className='flex size-6.5 shrink-0 items-center justify-center rounded-full text-(--qq-text) transition-[scale,opacity] duration-150 active:scale-90 active:opacity-60'
  >
    {children}
  </button>
)

/**
 * 样机里的 QQ 单聊 / 群聊界面。
 *
 * 顶部是 iOS 27 状态栏和 QQ 的机器人聊天导航栏，底部是输入区；
 * 单聊的自定义菜单条在输入框上方，输入 / 时从底部弹出快捷指令面板。
 */
export const FakeQQChat = ({
  scene,
  panel,
  menuItems,
  sheetOpen,
  onOpenSheet,
  onCloseSheet,
  scale,
  botName,
  botAvatar,
}: FakeQQChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => defaultMessages(scene, botName))
  const [input, setInput] = useState('')
  const [replying, setReplying] = useState(false)
  const [focused, setFocused] = useState(false)
  const [toast, setToast] = useState<PhoneToastMessage | null>(null)
  const toastIdRef = useRef(0)
  const replyTimerRef = useRef<number | undefined>(undefined)
  const previousSceneRef = useRef(scene)
  const previousBotRef = useRef(botName)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRowRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const lastMessageCountRef = useRef(messages.length)
  const scrollToBottomRef = useRef(true)

  // 抽屉停在输入框上沿，盖住自定义菜单条和它与输入框之间的留白；
  // 输入框和工具行始终露出来。
  useLayoutEffect(() => {
    const root = rootRef.current
    const field = fieldRef.current
    const inputRow = inputRowRef.current
    if (!root || !field || !inputRow) return

    const update = () => {
      const rootRect = root.getBoundingClientRect()
      const fieldRect = field.getBoundingClientRect()
      root.style.setProperty('--qq-sheet-bottom', `${(rootRect.bottom - fieldRect.top) / scale}px`)
    }
    update()

    const observer = new ResizeObserver(update)
    observer.observe(root)
    observer.observe(inputRow)
    return () => observer.disconnect()
  }, [scale])

  const showToast = useCallback((text: string) => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, text })
  }, [])

  const clearToast = useCallback(() => {
    setToast((current) => (current?.id === toastIdRef.current ? null : current))
  }, [])

  useEffect(() => {
    if (previousSceneRef.current === scene && previousBotRef.current === botName) return
    previousSceneRef.current = scene
    previousBotRef.current = botName

    window.clearTimeout(replyTimerRef.current)
    setMessages(defaultMessages(scene, botName))
    setInput('')
    setReplying(false)
    scrollToBottomRef.current = true

    const content = contentRef.current
    if (!content || prefersReducedMotion()) return

    gsap.killTweensOf(content)
    gsap.fromTo(
      content,
      { autoAlpha: 0, x: scene === 'c2c' ? -14 : 14 },
      { autoAlpha: 1, x: 0, duration: 0.4, ease: 'power3.out', clearProps: 'transform' }
    )
  }, [botName, scene])

  useLayoutEffect(() => {
    const element = messagesRef.current
    if (!element) return

    // 进入会话和切换场景时停在最新消息，和 QQ 的打开位置一致。
    if (scrollToBottomRef.current) {
      scrollToBottomRef.current = false
      lastMessageCountRef.current = messages.length
      element.scrollTop = element.scrollHeight
      return
    }

    if (messages.length <= lastMessageCountRef.current) {
      lastMessageCountRef.current = messages.length
      return
    }

    lastMessageCountRef.current = messages.length
    element.scrollTo({
      top: element.scrollHeight,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
  }, [messages])

  useEffect(
    () => () => {
      window.clearTimeout(replyTimerRef.current)
      if (contentRef.current) gsap.killTweensOf(contentRef.current)
    },
    []
  )

  // 面板页自动展开抽屉时，输入框里保留一个 /，和官方截图里的入口状态一致；
  // 抽屉收起后如果只剩这个 / 就还原成占位符，避免切到自定义菜单页时残留。
  useEffect(() => {
    if (sheetOpen) {
      setInput((current) => (current.trim() ? current : '/'))
      return
    }
    setInput((current) => (current.trim() === '/' ? '' : current))
  }, [scene, sheetOpen])

  const fillInput = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text) return

      onCloseSheet()
      setInput(text)
      requestAnimationFrame(() => {
        const element = inputRef.current
        if (!element) return
        element.focus()
        const end = element.value.length
        element.setSelectionRange(end, end)
      })
    },
    [onCloseSheet]
  )

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text) return

      onCloseSheet()
      setMessages((current) => [...current, { id: nextMessageId(), role: 'out', text, time: '刚刚' }])
      setInput('')

      if (!text.startsWith('/')) return

      window.clearTimeout(replyTimerRef.current)
      setReplying(true)
      replyTimerRef.current = window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          {
            id: nextMessageId(),
            role: 'in',
            text: '预览模式：这条指令不会真的发送到 QQ。',
            author: botName,
            time: '刚刚',
          },
        ])
        setReplying(false)
      }, 700)
    },
    [botName, onCloseSheet]
  )

  const hasText = input.trim().length > 0
  const title = scene === 'c2c' ? botName : GROUP_TITLE
  const subtitle = replying ? '正在输入…' : scene === 'group' ? '4人' : null

  return (
    <div
      ref={rootRef}
      className='qq-screen relative flex h-full w-full flex-col overflow-hidden bg-(--qq-bg) text-(--qq-text)'
    >
      <Ios27StatusBar />

      <header className='absolute inset-x-0 top-0 z-20 bg-(--qq-glass) pt-17 backdrop-blur-2xl backdrop-saturate-150'>
        <div className='flex h-11 items-center pr-1'>
          <button
            type='button'
            aria-label='返回聊天列表'
            onClick={() => showToast('这是预览界面，返回按钮不可用')}
            className='flex h-11 shrink-0 items-center gap-1 pl-4 pr-1 transition-opacity duration-150 active:opacity-60'
          >
            <ChevronLeft className='size-6' strokeWidth={2.2} aria-hidden='true' />
            <span className='flex h-6.5 min-w-6.5 items-center justify-center rounded-full bg-(--qq-text)/8 px-1.5 text-[12px] leading-none font-medium text-(--qq-text)'>
              10
            </span>
          </button>

          <div className='ml-1 min-w-0 flex-1'>
            <div className='flex min-w-0 items-center gap-1.5'>
              <span className='truncate text-[17px] leading-[1.15] font-semibold tracking-[-0.01em]'>{title}</span>
              {scene === 'c2c' ? (
                <span
                  aria-hidden='true'
                  className='flex size-3.5 shrink-0 items-center justify-center rounded-full bg-(--qq-blue) text-white'
                >
                  <Bot className='size-2.25' strokeWidth={2.4} />
                </span>
              ) : null}
            </div>
            {subtitle ? <p className='mt-0.5 truncate text-[11px] leading-none text-(--qq-muted)'>{subtitle}</p> : null}
          </div>

          <button
            type='button'
            aria-label='更多'
            onClick={() => showToast('这是预览界面，更多菜单不可用')}
            className='flex size-11 shrink-0 items-center justify-center transition-opacity duration-150 active:opacity-60'
          >
            <Menu className='size-5' aria-hidden='true' />
          </button>
        </div>
      </header>

      <div ref={contentRef} className='relative z-10 flex min-h-0 flex-1 flex-col'>
        <div
          ref={messagesRef}
          data-lenis-prevent
          className='[scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1 overflow-y-auto overscroll-contain px-4 pt-28 pb-4'
        >
          <div className='flex min-h-full flex-col justify-end gap-3.5'>
            {messages.map((message, index) => {
              const previous = messages[index - 1]
              const showTime = Boolean(message.time) && message.time !== previous?.time

              return (
                <Fragment key={message.id}>
                  {showTime ? (
                    <p className='pt-0.5 text-center text-[11.5px] leading-none text-(--qq-muted)'>{message.time}</p>
                  ) : null}
                  <MessageBubble message={message} scene={scene} botName={botName} botAvatar={botAvatar} />
                </Fragment>
              )
            })}
          </div>
        </div>
      </div>

      <div className='relative z-20 shrink-0 bg-(--qq-bar)'>
        {scene === 'c2c' ? <MenuBar items={menuItems} onFill={fillInput} onToast={showToast} /> : null}

        <div ref={inputRowRef} className='px-4 pt-2.25 pb-10.75'>
          <div ref={fieldRef} className='flex h-10.75 items-center rounded-3xl bg-(--qq-field) px-3.5'>
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => {
                const next = event.target.value
                setInput(next)
                if (next.startsWith('/') && !sheetOpen) onOpenSheet()
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
                event.preventDefault()
                send(input)
              }}
              aria-label='发送消息'
              className='w-full min-w-0 bg-transparent text-[16px] leading-none text-(--qq-text) outline-none'
            />
            {focused || hasText ? (
              <button
                type='button'
                aria-label='AI 输入'
                onClick={() => showToast('预览界面暂不支持 AI 输入')}
                className='ml-1 flex h-7 shrink-0 items-center gap-0.5 rounded-full px-1 text-(--qq-text)/80 transition-[scale,opacity] duration-150 active:scale-90 active:opacity-60'
              >
                <Sparkles className='size-3.5' strokeWidth={2} aria-hidden='true' />
                <span className='text-[12px] leading-none font-medium'>A</span>
              </button>
            ) : null}
          </div>

          <div className='mt-2.25 flex h-6.5 items-center justify-between px-9.5'>
            <ToolButton label='语音' onClick={() => showToast('预览界面暂不支持语音')}>
              <Mic className='size-5.5' strokeWidth={2} aria-hidden='true' />
            </ToolButton>
            <ToolButton label='图片' onClick={() => showToast('预览界面暂不支持发送图片')}>
              <ImageIcon className='size-5.5' strokeWidth={2} aria-hidden='true' />
            </ToolButton>
            <ToolButton label='拍摄' onClick={() => showToast('预览界面暂不支持拍照')}>
              <Camera className='size-5.5' strokeWidth={2} aria-hidden='true' />
            </ToolButton>
            <ToolButton label='表情' onClick={() => showToast('预览界面暂不支持表情')}>
              <Smile className='size-5.5' strokeWidth={2} aria-hidden='true' />
            </ToolButton>
            <ToolButton label='更多功能' onClick={() => showToast('预览界面暂不支持更多功能')}>
              <CirclePlus className='size-5.5' strokeWidth={2} aria-hidden='true' />
            </ToolButton>
          </div>
        </div>
      </div>

      <PanelSheet
        open={sheetOpen}
        panel={panel}
        scale={scale}
        onClose={onCloseSheet}
        onPick={fillInput}
        onToast={showToast}
      />

      <PhoneToast message={toast} onDone={clearToast} />
    </div>
  )
}
