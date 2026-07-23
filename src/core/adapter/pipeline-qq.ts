import { karinToQQBot } from 'node-karin'
import {
  collectCommandEnterButtons,
  formatCommandEnterButtonNames,
  hasCommandEnterTextChain,
  normalizeQQBotButton,
} from './button-enter'
import { groupElements } from './grouping'
import { resolvePreferredMediaSource } from './media-source'
import { rememberApiMessageId, rememberOwnMessageId, resolveReferenceMessageId } from './message-id-map'
import { extractUrlButtons, imagesToMarkdown, splitMarkdownImages } from './text-to-md'
import type { Contact, ElementTypes, SendMsgResults } from 'node-karin'
import type { AdapterQQBot } from './base'
import type { Grouping, PassiveInfo } from './grouping'
import type { MediaType, SendQQMsg, SendQQMsgResponse } from '@/core/api/types'

/** QQ 官方限制：单聊中同一 `msg_id` 最多发送四次被动回复。 */
const C2C_PASSIVE_REPLY_LIMIT = 4
/** QQ keyboard 限制：最多 5 行，每行最多 5 个按钮。 */
const KEYBOARD_MAX_ROWS = 5
const KEYBOARD_MAX_BUTTONS_PER_ROW = 5
/** 只有按钮没有文本时仍需提供非空 markdown 内容。 */
const BUTTON_ONLY_MARKDOWN = '\u200b'

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
  await resolveOutgoingReferenceQQ(ctx, contact, grouping)

  // 文本是否需要做 URL→ 按钮转化
  if (ctx.cfg.markdown.enable && ctx.cfg.keyboard.enable && grouping.text.length) {
    const joined = grouping.text.join('')
    const { text, buttons } = extractUrlButtons(joined, contact.scene === 'friend')
    grouping.text = [text]
    grouping.buttons.push(...buttons)
  }

  /**
   * 自动 Markdown 通道：
   * text / at / 可转换为公网 URL 的图片通过 markdown content 渲染；无法转换的图片
   * 与视频 / 语音 / 文件由 sendQQMarkdown 内部以 msg_type=7 单独补发。所有富媒体
   * 都会优先通过 fileToUrl 取得公网地址，QQ 上传只做兜底。只有显式引用的
   * 纯文本消息会降级为 msg_type=0，以保证 QQ 客户端能稳定显示引用气泡。
   * 显式 segment.markdown 不受该自动通道开关影响。
   */
  if (ctx.cfg.markdown.enable) return sendQQMarkdown(ctx, contact, grouping, target)
  return sendQQClassic(ctx, contact, grouping, target)
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

  const markdownFallbackImages = await appendExplicitMarkdown(ctx, lines, grouping)
  fallbackImages.push(...markdownFallbackImages)

  if (contact.scene === 'group') {
    warnUnsupportedCommandEnterButtons(ctx, collectCommandEnterButtons(grouping.buttons, grouping.keyboards))
    warnUnsupportedCommandEnterMarkdowns(ctx, grouping.markdowns.map(m => m.markdown))
  }

  // markdown 主消息：有任意可渲染内容才推
  if (lines.length || grouping.buttons.length || grouping.keyboards.length) {
    if (shouldUseTextForReference(ctx, contact, grouping)) {
      items.push(ctx.super.qq.text(lines.join('\n')))
    } else {
      const keyboard = buildKeyboard(grouping)
      const content = lines.length ? lines.join('\n') : BUTTON_ONLY_MARKDOWN
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
 * 经典通道：文本走 msg_type=0，图片 / 富媒体走 msg_type=7。
 */
const sendQQClassic = async (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  grouping: Grouping<'qq'>,
  target: 'user' | 'group'
): Promise<SendMsgResults> => {
  const items: SendQQMsg[] = []
  const lines: string[] = []
  const images: string[] = [...grouping.qqImages]

  if (grouping.text.length) lines.push(grouping.text.join(''))

  if (!grouping.markdowns.length && (grouping.buttons.length || grouping.keyboards.length)) {
    ctx.logger('warn', 'Markdown 通道已关闭，button / keyboard 无法随普通文本发送，已跳过')
  }

  const content = lines.join('\n').trim()
  if (content) items.push(ctx.super.qq.text(content))

  for (const image of images) {
    items.push(await buildQQMediaItem(ctx, target, contact.peer, 'image', image))
  }

  for (const m of grouping.media) {
    items.push(await buildQQMediaItem(ctx, target, contact.peer, m.kind, m.source, m.name))
  }

  await appendExplicitMarkdownItems(ctx, contact, grouping, target, items)

  if (!items.length) {
    items.push(ctx.super.qq.text('不支持发送的消息类型'))
  }

  return flushQQ(ctx, contact, grouping, items)
}

/**
 * 显式 `segment.markdown` 是调用方指定的发送类型，不受 Markdown 自动通道开关影响。
 */
const appendExplicitMarkdownItems = async (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  grouping: Grouping<'qq'>,
  target: 'user' | 'group',
  items: SendQQMsg[]
): Promise<void> => {
  if (!grouping.markdowns.length) return

  const lines: string[] = []
  const fallbackImages = await appendExplicitMarkdown(ctx, lines, grouping)

  if (contact.scene === 'group') {
    warnUnsupportedCommandEnterButtons(ctx, collectCommandEnterButtons(grouping.buttons, grouping.keyboards))
    warnUnsupportedCommandEnterMarkdowns(ctx, grouping.markdowns.map(m => m.markdown))
  }

  const keyboard = buildKeyboard(grouping)
  const content = lines.length ? lines.join('\n') : BUTTON_ONLY_MARKDOWN
  items.push(ctx.super.qq.markdown({ content }, keyboard))

  for (const file of fallbackImages) {
    const res = await ctx.super.media.uploadFallback(target, contact.peer, 'image', file, false)
    items.push(ctx.super.qq.media(res.file_info))
  }
}

const buildQQMediaItem = async (
  ctx: AdapterQQBot,
  target: 'user' | 'group',
  peer: string,
  type: MediaType,
  source: string,
  name?: string
): Promise<SendQQMsg> => {
  const resolved = await resolvePreferredMediaSource(ctx, type, source, name)
  const res = resolved.via === 'fallback'
    ? await ctx.super.media.uploadFallback(target, peer, type, resolved.source, false, name)
    : await ctx.super.media.upload(target, peer, type, resolved.source, false, name)
  return ctx.super.qq.media(res.file_info)
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
 * 处理显式 segment.markdown 中的图片：可转公网 URL 的继续嵌入，无法转的改走富媒体。
 */
const appendExplicitMarkdown = async (
  ctx: AdapterQQBot,
  lines: string[],
  grouping: Grouping<'qq'>
): Promise<string[]> => {
  const fallback: string[] = []

  for (const markdown of grouping.markdowns) {
    for (const part of splitMarkdownImages(markdown.markdown)) {
      if (part.type === 'text') {
        const text = part.value.trim()
        if (text) lines.push(text)
        continue
      }

      const resolved = await resolvePreferredMediaSource(ctx, 'image', part.source)
      if (resolved.via === 'fallback') {
        fallback.push(part.source)
        continue
      }

      await appendImageUrlLine(lines, resolved.source)
    }
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
 * 发送前把显式引用的 API 消息 ID 解析为 REFIDX。
 *
 * 内存映射（重启后为空）未命中时回退查询 SQLite 消息缓存，保证重启后
 * `segment.reply(e.messageId)` 依然能渲染可见引用。解析结果直接写回
 * grouping，后续同步路径（降级判断、message_reference 附加）无需再查库。
 *
 * @param ctx 适配器实例。
 * @param contact 消息目标会话。
 * @param grouping 已归类的消息段。
 */
const resolveOutgoingReferenceQQ = async (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  grouping: Grouping<'qq'>
): Promise<void> => {
  const original = grouping.reply.messageId
  if (!original) return

  const resolved = resolveReferenceMessageId(ctx, contact, original)
  if (isQQReferenceMessageId(resolved)) {
    grouping.reply.messageId = resolved
    return
  }
  if (!ctx.cfg.messageCache.enable) return

  const fromStore = await ctx.messageStore
    .resolveRefIdx(String(ctx.cfg.appId), contact, original)
    .catch(() => null)
  if (fromStore) grouping.reply.messageId = fromStore
}

/**
 * 构造 keyboard 字段（buttons + keyboards 合并）
 */
const buildKeyboard = (grouping: Grouping<'qq' | 'guild'>) => {
  const rows: ReturnType<typeof karinToQQBot> = []
  grouping.buttons.forEach(b => rows.push(...karinToQQBot(b)))
  grouping.keyboards.forEach(k => rows.push(...karinToQQBot(k)))
  const normalizedRows: ReturnType<typeof karinToQQBot> = []
  let id = 0

  for (const row of rows.slice(0, KEYBOARD_MAX_ROWS)) {
    const buttons = row.buttons
      .slice(0, KEYBOARD_MAX_BUTTONS_PER_ROW)
      .map(button => normalizeQQBotButton(button, id++))
    if (buttons.length) normalizedRows.push({ buttons })
  }

  if (!normalizedRows.length) return undefined
  return { content: { rows: normalizedRows } }
}

/**
 * 群聊不支持 `enter: true` 直发按钮，只输出提示，不拦截 keyboard 发送。
 *
 * @param ctx 适配器实例，用于输出日志。
 * @param buttons 本次消息中的直发指令按钮。
 */
const warnUnsupportedCommandEnterButtons = (
  ctx: AdapterQQBot,
  buttons: ReturnType<typeof collectCommandEnterButtons>
): void => {
  if (!buttons.length) return
  const names = formatCommandEnterButtonNames(buttons)
  ctx.logger('debug', `群聊不支持 enter: true 直接发送，按钮仍会按原样发送: ${names}`)
}

/**
 * 群聊不支持 `<qqbot-cmd-enter>` 文本链，只输出提示，不拦截 markdown 发送。
 *
 * @param ctx 适配器实例，用于输出日志。
 * @param markdowns 本次消息中的 markdown 内容。
 */
const warnUnsupportedCommandEnterMarkdowns = (
  ctx: AdapterQQBot,
  markdowns: string[]
): void => {
  if (!markdowns.some(hasCommandEnterTextChain)) return
  ctx.logger('debug', '群聊不支持 <qqbot-cmd-enter> 直接发送，markdown 仍会按原样发送')
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
  const passive = buildPassiveQQ(ctx, contact.scene, grouping)
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
    const res: SendQQMsgResponse = await sendQQWithEventFallback(ctx, contact, send, item)
    rememberOwnMessageId(ctx, contact, res.id)
    if (res.ext_info?.ref_idx) rememberApiMessageId(ctx, contact, res.ext_info.ref_idx, res.id)
    result.rawData.push(res)
  }
  return ctx.handleResponse(result)
}

/**
 * 发送 QQ 消息，并在平台拒绝 `event_id` 时降级为普通消息重试。
 *
 * QQ 文档说明 `INTERACTION_CREATE.d.id` 可用于被动消息发送，但实测群聊接口会出现
 * 40034025。为了避免按钮回调业务回复把 Karin 命令链路打断，这里只对
 * `event_id` 参数无效做一次无 `event_id` 重试。
 *
 * @param ctx 适配器实例，用于输出降级日志。
 * @param contact 消息目标。
 * @param send 当前场景的发送函数。
 * @param item 即将发送的 QQ 消息体。
 * @returns QQ 消息发送响应。
 */
const sendQQWithEventFallback = async (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  send: (peer: string, item: SendQQMsg) => Promise<SendQQMsgResponse>,
  item: SendQQMsg
): Promise<SendQQMsgResponse> => {
  try {
    return await send(contact.peer, item)
  } catch (err) {
    if (!item.event_id || !isInvalidEventIdError(err)) throw err

    ctx.logger('warn', `event_id 被 QQ 拒绝，已改用普通消息重试: ${item.event_id}`)
    const retryItem: SendQQMsg = { ...item }
    delete retryItem.event_id
    delete retryItem.msg_seq
    return send(contact.peer, retryItem)
  }
}

/**
 * 判断发送失败是否来自 QQ 对 `event_id` 的参数校验。
 *
 * 当前错误由 Http 层格式化为普通 Error，因此这里基于官方错误码和中文错误信息兜底识别。
 *
 * @param err 捕获到的发送异常。
 * @returns 是否可以通过移除 `event_id` 重试。
 */
const isInvalidEventIdError = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('40034025') || message.includes('请求参数event_id无效')
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
  ctx: AdapterQQBot,
  scene: 'friend' | 'group',
  grouping: Grouping<'qq'>
) => {
  const source = resolvePassiveQQ(grouping)
  if (!source?.id) return (_item: SendQQMsg) => undefined

  const whitelist = scene === 'friend' ? FRIEND_EVENT_WHITELIST : GROUP_EVENT_WHITELIST

  if (source.type === 'event') {
    const eventName = source.id.split(':')[0]
    if (eventName && !whitelist.has(eventName)) {
      ctx.logger('warn', `跳过无效 event_id: ${source.id}`)
      return (_item: SendQQMsg) => undefined
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
