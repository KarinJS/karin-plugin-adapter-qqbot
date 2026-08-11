import { fileToUrl, karin } from 'node-karin'
import type { Contact, ElementTypes, SendMsgResults } from 'node-karin'
import type { AdapterQQBot } from './base'

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
  elements: ElementTypes[]
): Promise<PreparedSelfMessageCache> => {
  const sendElements: ElementTypes[] = []
  const cacheElements: ElementTypes[] = []

  for (const element of elements) {
    const prepared = await prepareSelfCacheElement(ctx, element)
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
  element: ElementTypes
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
      return prepareStaticElement(ctx, element)
    default:
      return { send: element, cache: null }
  }
}

/**
 * 静态资源统一转 HTTP URL 后再缓存；转换失败时跳过该元素。
 */
const prepareStaticElement = async (
  ctx: AdapterQQBot,
  element: StaticElement
): Promise<PreparedElement> => {
  if (element.file.startsWith('http')) {
    const cached = { ...element } as ElementTypes
    return { send: cached, cache: cached }
  }

  try {
    switch (element.type) {
      case 'image': {
        const res = await fileToUrl('image', element.file, element.name || 'image.jpg')
        const cached = {
          ...element,
          file: res.url,
          width: res.width,
          height: res.height,
        } as ElementTypes
        return { send: cached, cache: cached }
      }
      case 'video': {
        const res = await fileToUrl('video', element.file, element.name || 'video.mp4')
        const cached = { ...element, file: res.url } as ElementTypes
        return { send: cached, cache: cached }
      }
      case 'record': {
        const res = await fileToUrl('record', element.file, element.name || 'record.mp3')
        const cached = { ...element, file: res.url } as ElementTypes
        return { send: cached, cache: cached }
      }
      case 'file': {
        const res = await fileToUrl('file', element.file, element.name || 'file.bin')
        const cached = { ...element, file: res.url } as ElementTypes
        return { send: cached, cache: cached }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    ctx.logger('debug', `[getMsg] 跳过自己消息资源缓存: ${element.type} ${message}`)
    return { send: element, cache: null }
  }
}

/**
 * 构造机器人自己的 sender。
 */
const selfSender = (ctx: AdapterQQBot, contact: Contact) => {
  const userId = ctx.selfSubId('id') || ctx.selfId
  const name = ctx.selfName || ctx.cfg.name || ''
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
