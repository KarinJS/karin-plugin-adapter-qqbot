import { fileToUrl, karin } from 'node-karin'
import type { Contact, ElementTypes, SendMsgResults } from 'node-karin'
import { DEFAULT_FILENAME } from '@/core/constants'
import type { AdapterQQBot } from './base'
import type { FileToUrlExtra, UploadOrigin } from './media-source'

type StaticElement = Extract<ElementTypes, { type: 'image' | 'video' | 'record' | 'file' }>

interface PreparedSelfMessageCache {
  /** 传给发送 pipeline 的元素；静态资源转换成功时已经是 HTTP URL。 */
  sendElements: ElementTypes[]
  /** 写入 getMsg 缓存的元素；静态资源转换失败时会跳过对应元素。 */
  cacheElements: ElementTypes[]
}

interface PreparedElement {
  send: ElementTypes
  cache: ElementTypes | null
}

/**
 * 只有两个缓存开关同时开启时才需要等待发送结果并缓存自己消息。
 */
export const shouldCacheSelfMessage = (ctx: AdapterQQBot): boolean => {
  return ctx.cfg.messageCache.enable && ctx.cfg.messageCache.self
}

/**
 * 预处理自己消息元素。
 *
 * 静态资源只在这里转一次 HTTP URL，之后发送 pipeline 和缓存都复用该 URL。
 */
export const prepareSelfMessageCache = async (
  ctx: AdapterQQBot,
  contact: Contact,
  elements: ElementTypes[]
): Promise<PreparedSelfMessageCache> => {
  const sendElements: ElementTypes[] = []
  const cacheElements: ElementTypes[] = []
  const origin = resolveUploadOrigin(contact)

  for (const element of elements) {
    const prepared = await prepareSelfCacheElement(ctx, element, origin)
    sendElements.push(prepared.send)
    if (prepared.cache) cacheElements.push(prepared.cache)
  }

  return { sendElements, cacheElements }
}

/**
 * 发送成功后记录机器人自己的消息。
 *
 * 无论缓存开关如何，都会落库最小 ID 映射行（msg_id/ref_idx/is_self）——
 * 单聊撤回判定和引用解析没有任何内存映射，完全依赖数据库。
 * 只有 self 缓存开启时才附带消息正文，供 bot.getMsg(messageId) 查询。
 */
export const cacheSelfMessage = (
  ctx: AdapterQQBot,
  contact: Contact,
  cacheElements: ElementTypes[],
  result: SendMsgResults
): void => {
  const rawData = Array.isArray(result.rawData) ? result.rawData : [result.rawData]
  const responses = rawData.filter(item => item?.id)
  if (!responses.length) return

  const withContent = shouldCacheSelfMessage(ctx) && cacheElements.length > 0
  const elements = withContent ? cacheElements : []
  const level = withContent ? ctx.cfg.messageCache.level : 'minimal'
  const sender = selfSender(ctx, contact)
  const seen = new Set<string>()
  for (const response of responses) {
    const apiMessageId = String(response.id)
    const referenceMessageId = typeof response.ext_info?.ref_idx === 'string'
      ? response.ext_info.ref_idx
      : ''
    const messageId = apiMessageId
    if (!messageId || seen.has(messageId)) continue
    seen.add(messageId)

    ctx.messageStore
      .save(String(ctx.cfg.appId), {
        messageId,
        messageSeq: 0,
        time: responseTime(response.timestamp),
        contact,
        sender,
        elements,
      }, {
        refIdx: referenceMessageId && referenceMessageId !== messageId ? referenceMessageId : undefined,
        isSelf: true,
        level,
      })
      .catch(err => ctx.logger('warn', `[getMsg] 写入自己消息缓存失败: ${messageId}`, err))
  }
}

/**
 * 转换单个自己消息元素为缓存安全形态。
 */
const prepareSelfCacheElement = async (
  ctx: AdapterQQBot,
  element: ElementTypes,
  origin?: UploadOrigin
): Promise<PreparedElement> => {
  switch (element.type) {
    case 'text':
    case 'at':
    case 'reply':
    case 'face':
    case 'markdown': {
      const cached = { ...element } as ElementTypes
      return { send: cached, cache: cached }
    }
    case 'image':
    case 'video':
    case 'record':
    case 'file':
      return prepareStaticElement(ctx, element, origin)
    default:
      return { send: element, cache: null }
  }
}

/**
 * 静态资源统一转 HTTP URL 后再缓存；转换失败或没有处理器接手时跳过该元素。
 */
const prepareStaticElement = async (
  ctx: AdapterQQBot,
  element: StaticElement,
  origin?: UploadOrigin
): Promise<PreparedElement> => {
  if (element.file.startsWith('http')) {
    const cached = { ...element } as ElementTypes
    return { send: cached, cache: cached }
  }

  try {
    /**
     * 和发送链路传同一套附加信息：处理器需要知道是哪个 bot、哪个会话才能用对
     * openid。用途是 media —— 缓存要的是能长期访问的地址，内置图床给的是会过期的
     * 临时直链，按 purpose 主动放行正好。
     */
    const extra: FileToUrlExtra = { selfId: ctx.selfId, purpose: 'media', origin }
    const res = await fileToUrl(element.type, element.file, element.name || DEFAULT_FILENAME[element.type], extra)

    /**
     * 链路上的处理器全部放行时 fileToUrl 实际返回 undefined（类型声明未涵盖
     * 这种情况），不属于异常：发送继续使用原始来源，仅跳过该元素的缓存。
     */
    if (!res?.url) {
      ctx.logger('debug', `[getMsg] 没有 fileToUrl 处理器接手 ${element.type}，跳过该元素的缓存`)
      return { send: element, cache: null }
    }

    const cached = { ...element, file: res.url } as ElementTypes
    if (cached.type === 'image') {
      const { width, height } = res as { width?: number, height?: number }
      cached.width = width
      cached.height = height
    }
    return { send: cached, cache: cached }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    ctx.logger('debug', `[getMsg] 跳过自己消息资源缓存: ${element.type} ${message}`)
    return { send: element, cache: null }
  }
}

/**
 * 解析缓存用 URL 转换的归属会话。
 *
 * QQ 的 openid 按 bot 隔离，上传接口只接受该 bot 可见的 group_openid / user_openid；
 * 频道用 channel_id，没有可用 openid，返回 undefined。
 *
 * @param contact 本次发送目标。
 * @returns 可交给 fileToUrl 处理器的上传会话。
 */
const resolveUploadOrigin = (contact: Contact): UploadOrigin | undefined => {
  if (contact.scene === 'group') return { scene: 'group', peer: contact.peer }
  if (contact.scene === 'friend') return { scene: 'user', peer: contact.peer }
  return undefined
}

/**
 * 构造机器人自己的 sender。
 */
const selfSender = (ctx: AdapterQQBot, contact: Contact) => {
  const userId = ctx.selfSubId('id') || ctx.selfId
  const name = ctx.selfName || ''
  if (contact.scene === 'friend' || contact.scene === 'direct') {
    return karin.friendSender(userId, name)
  }
  return karin.groupSender(userId, 'member', name)
}

/**
 * QQ / 频道发送接口 timestamp 格式不同，统一转成毫秒时间戳。
 */
const responseTime = (timestamp: unknown): number => {
  if (typeof timestamp === 'string') {
    const time = new Date(timestamp).getTime()
    return Number.isFinite(time) ? time : Date.now()
  }
  if (typeof timestamp === 'number') {
    return timestamp < 1e12 ? timestamp * 1000 : timestamp
  }
  return Date.now()
}
