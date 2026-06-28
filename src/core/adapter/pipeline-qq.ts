import { karinToQQBot } from 'node-karin'
import { groupElements } from './grouping'
import { resolvePreferredMediaSource } from './media-source'
import { rememberApiMessageId, rememberOwnMessageId, resolveReferenceMessageId } from './message-id-map'
import { extractUrlButtons, imagesToMarkdown } from './text-to-md'
import type { Contact, ElementTypes, SendMsgResults } from 'node-karin'
import type { AdapterQQBot } from './base'
import type { Grouping, PassiveInfo } from './grouping'
import type { SendQQMsg, SendQQMsgResponse } from '@/core/api/types'

/** QQ 官方限制：单聊中同一 `msg_id` 最多发送四次被动回复。 */
const C2C_PASSIVE_REPLY_LIMIT = 4

/** 群聊 event_id 白名单 */
const GROUP_EVENT_WHITELIST = new Set([
  'INTERACTION_CREATE', 'GROUP_ADD_ROBOT', 'GROUP_MSG_RECEIVE',
])
/** 单聊 event_id 白名单 */
const FRIEND_EVENT_WHITELIST = new Set([
  'INTERACTION_CREATE', 'C2C_MSG_RECEIVE', 'FRIEND_ADD',
])

/**
 * 处理 QQ 场景（单聊 + 群聊）的发送
 */
export const sendQQ = async (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  elements: ElementTypes[]
): Promise<SendMsgResults> => {
  const target = contact.scene === 'friend' ? 'user' : 'group'
  const grouping = groupElements<'qq'>(contact.scene, elements)

  // 文本是否需要做 URL→ 按钮转化
  if (ctx.cfg.keyboard.enable && grouping.text.length) {
    const joined = grouping.text.join('')
    const { text, buttons } = extractUrlButtons(joined, contact.scene === 'friend')
    grouping.text = [text]
    grouping.buttons.push(...buttons)
  }

  /**
   * 默认走 markdown 通道：
   * text / at / 可转换为公网 URL 的图片通过 markdown content 渲染；无法转换的图片
   * 与视频 / 语音 / 文件由 sendQQMarkdown 内部以 msg_type=7 单独补发。所有富媒体
   * 都会优先通过 fileToUrl 取得公网地址，QQ 上传只做兜底。只有显式引用的
   * 纯文本消息会降级为 msg_type=0，以保证 QQ 客户端能稳定显示引用气泡。
   */
  return sendQQMarkdown(ctx, contact, grouping, target)
}

/**
 * Markdown 通道：合成一条 msg_type=2 + 可选 keyboard
 */
const sendQQMarkdown = async (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  grouping: Grouping<'qq'>,
  target: 'user' | 'group'
): Promise<SendMsgResults> => {
  const items: SendQQMsg[] = []

  // 1) 把文本 + 可公网访问的图片合并为一段 markdown content
  const lines: string[] = []
  if (grouping.text.length) lines.push(grouping.text.join(''))
  const fallbackImages = await appendMarkdownImages(ctx, lines, grouping.qqImages)

  if (grouping.markdowns.length) {
    grouping.markdowns.forEach(m => lines.push(m.markdown))
  }

  // markdown 主消息：有任意可渲染内容才推
  if (lines.length || grouping.buttons.length || grouping.keyboards.length) {
    const content = lines.join('\n')
    if (shouldUseTextForReference(ctx, contact, grouping)) {
      items.push(ctx.super.qq.text(content))
    } else {
      const keyboard = buildKeyboard(grouping)
      items.push(ctx.super.qq.markdown({ content }, keyboard))
    }
  }

  // 无法进入 markdown 的图片单独走 QQ 上传 fallback，避免依赖 fileToUrl 处理器。
  for (const file of fallbackImages) {
    const res = await ctx.super.media.uploadFallback(target, contact.peer, 'image', file, false)
    items.push(ctx.super.qq.media(res.file_info))
  }

  // 视频 / 语音 / 文件 → msg_type=7 单独补发
  for (const m of grouping.media) {
    const source = await resolvePreferredMediaSource(ctx, m.kind, m.source, m.name)
    const res = source.via === 'fallback'
      ? await ctx.super.media.uploadFallback(target, contact.peer, m.kind, source.source, false, m.name)
      : await ctx.super.media.upload(target, contact.peer, m.kind, source.source, false, m.name)
    items.push(ctx.super.qq.media(res.file_info))
  }

  if (!items.length) {
    items.push(ctx.super.qq.text('不支持发送的消息类型'))
  }

  return flushQQ(ctx, contact, grouping, items)
}

/**
 * 将能转成公网 URL 的图片追加到 markdown 行，无法转换的图片返回给富媒体 fallback。
 *
 * @param ctx 适配器实例，用于输出降级日志。
 * @param lines markdown 行数组。
 * @param files QQ 图片消息段的 file 字段。
 * @returns 需要改走 msg_type=7 富媒体发送的图片列表。
 */
const appendMarkdownImages = async (
  ctx: AdapterQQBot,
  lines: string[],
  files: string[]
): Promise<string[]> => {
  const fallback: string[] = []

  for (const file of files) {
    const resolved = await resolvePreferredMediaSource(ctx, 'image', file)
    if (resolved.via === 'fallback') {
      fallback.push(file)
      continue
    }

    await appendImageUrlLine(lines, resolved.source)
  }

  return fallback
}

/**
 * 生成单张 markdown 图片行。
 * 尺寸获取失败时使用保守默认尺寸，保证 fileToUrl 成功的图片仍走 markdown。
 *
 * @param lines markdown 行数组。
 * @param url 图片 URL。
 */
const appendImageUrlLine = async (lines: string[], url: string): Promise<void> => {
  try {
    const [line] = await imagesToMarkdown([url])
    lines.push(line)
  } catch {
    lines.push(`![karin #300px #300px](${url})`)
  }
}

/**
 * 判断显式引用回复是否应降级为普通文本消息。
 *
 * QQ 的 `message_reference` 对普通文本最稳定；markdown 带引用在客户端渲染上存在兼容问题。
 * 因此只有纯文本显式引用回复会走 msg_type=0，图片、按钮、keyboard、markdown 段仍走原通道。
 *
 * @param grouping 已归类的消息段。
 * @returns 是否使用普通文本发送主消息。
 */
const shouldUseTextForReference = (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  grouping: Grouping<'qq'>
): boolean => {
  return isQQReferenceMessageId(resolveReferenceMessageId(ctx, contact, grouping.reply.messageId)) &&
    !grouping.qqImages.length &&
    !grouping.buttons.length &&
    !grouping.keyboards.length &&
    !grouping.markdowns.length
}

/**
 * 判断给定 ID 是否是 QQ 客户端引用使用的 REFIDX。
 *
 * `ROBOT1.0_...` 这类官方消息 ID 只能作为被动发送的 `msg_id`，不能放进
 * `message_reference.message_id`。
 *
 * @param messageId 待判断的消息 ID。
 * @returns 是否为 QQ 引用索引。
 */
const isQQReferenceMessageId = (messageId: string): boolean => messageId.startsWith('REFIDX_')

/**
 * 构造 keyboard 字段（buttons + keyboards 合并）
 */
const buildKeyboard = (grouping: Grouping<'qq' | 'guild'>) => {
  const rows: ReturnType<typeof karinToQQBot> = []
  grouping.buttons.forEach(b => rows.push(...karinToQQBot(b)))
  grouping.keyboards.forEach(k => rows.push(...karinToQQBot(k)))
  if (!rows.length) return undefined
  return { content: { rows } }
}

/**
 * 逐条发送 + 被动消息附加 + 引用回复
 */
const flushQQ = async (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  grouping: Grouping<'qq'>,
  items: SendQQMsg[]
): Promise<SendMsgResults> => {
  const result = ctx.initSendMsgResults()
  const passiveSource = resolvePassiveQQ(grouping)
  const passive = buildPassiveQQ(contact.scene, grouping)
  const send = contact.scene === 'friend'
    ? (peer: string, item: SendQQMsg) => ctx.super.messages.sendFriendMsg(peer, item)
    : (peer: string, item: SendQQMsg) => ctx.super.messages.sendGroupMsg(peer, item)

  /**
   * 仅单聊 `msg_id` 回复受四次上限约束。`event_id` 事件回复和群聊不适用该限制。
   * 这是 QQ 官方 2026-01-10 更新后的限制，超出部分不请求平台接口。
   */
  const maxItems = contact.scene === 'friend' && passiveSource?.type === 'msg' && passiveSource.id
    ? C2C_PASSIVE_REPLY_LIMIT
    : Infinity
  if (items.length > maxItems) {
    ctx.logger('warn', `单聊被动回复最多 ${C2C_PASSIVE_REPLY_LIMIT} 条，已跳过 ${items.length - maxItems} 条`)
  }

  let referenceHandled = false
  for (const item of items.slice(0, maxItems)) {
    passive(item)
    if (!referenceHandled) referenceHandled = attachVisibleReferenceQQ(ctx, contact, item, grouping)
    const res: SendQQMsgResponse = await send(contact.peer, item)
    rememberOwnMessageId(ctx, contact, res.id)
    if (res.ext_info?.ref_idx) rememberApiMessageId(ctx, contact, res.ext_info.ref_idx, res.id)
    result.rawData.push(res)
  }
  return ctx.handleResponse(result)
}

/**
 * 解析 QQ 场景应使用的被动回复来源。
 *
 * `msg_id/event_id` 是 QQBot 被动发送凭证，不等于客户端展示引用使用的
 * `message_reference.message_id`。因此这里只读取事件入口追加的 pasmsg，显式
 * `segment.reply` 交给 `attachVisibleReferenceQQ` 处理。
 *
 * @param grouping 已归类的消息段。
 * @returns 可附加到发送体的被动回复来源；没有可用来源时返回 undefined。
 */
const resolvePassiveQQ = (grouping: Grouping<'qq'>): PassiveInfo | undefined => {
  if (grouping.pasmsg.id) return grouping.pasmsg
  return undefined
}

/**
 * 附加 QQ 客户端可见的引用对象。
 *
 * 群聊/单聊里真正发给 QQ 的值必须是 `message_scene.ext` 的 `msg_idx=REFIDX_xxx`。
 * 如果插件传入的是 Karin 暴露的官方 API 消息 ID，这里会先按同会话映射转换。
 *
 * @param item 即将发送的 QQ 消息体。
 * @param grouping 已归类的消息段。
 * @returns 是否已经消费一次显式引用。
 */
const attachVisibleReferenceQQ = (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  item: SendQQMsg,
  grouping: Grouping<'qq'>
): boolean => {
  const messageId = resolveReferenceMessageId(ctx, contact, grouping.reply.messageId)
  if (!isQQReferenceMessageId(messageId)) return false
  item.message_reference = { message_id: messageId }
  return true
}

/**
 * 递增并返回下一条 QQ 被动回复序号。
 *
 * @param grouping 已归类的消息段。
 * @returns 0..65535 范围内的 msg_seq。
 */
const nextPassiveMsgSeq = (grouping: Grouping<'qq'>): number => {
  grouping.pasmsg.seq = (grouping.pasmsg.seq + 1) % 65536
  return grouping.pasmsg.seq
}

/**
 * 构造被动消息附加器（含白名单校验）
 */
const buildPassiveQQ = (
  scene: 'friend' | 'group',
  grouping: Grouping<'qq'>
) => {
  const source = resolvePassiveQQ(grouping)
  if (!source?.id) return (_item: SendQQMsg) => undefined

  const whitelist = scene === 'friend' ? FRIEND_EVENT_WHITELIST : GROUP_EVENT_WHITELIST

  if (source.type === 'event') {
    // 极保守：event_id 不在白名单里也允许（防止误打 warn）
    const eventName = source.id.split(':')[0]
    if (eventName && !whitelist.has(eventName)) {
      // 仍然交给服务端按 event_id 校验，避免本地误拦截新开放的事件。
    }
    return (item: SendQQMsg) => {
      item.msg_seq = nextPassiveMsgSeq(grouping)
      item.event_id = source.id
    }
  }

  return (item: SendQQMsg) => {
    item.msg_seq = nextPassiveMsgSeq(grouping)
    item.msg_id = source.id
  }
}
