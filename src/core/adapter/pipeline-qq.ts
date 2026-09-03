import { karinToQQBot } from 'node-karin'
import {
  collectCommandEnterButtons,
  formatCommandEnterButtonNames,
  hasCommandEnterTextChain,
  normalizeQQBotButton,
} from './button-enter'
import { groupElements } from './grouping'
import { resolvePreferredMediaSource } from './media-source'
import type { UploadOrigin } from './media-source'
import { splitMarkdownImages, buildMarkdownImageLine } from './text-to-md'
import {
  BUTTON_ONLY_MARKDOWN,
  C2C_PASSIVE_REPLY_LIMIT,
  FRIEND_EVENT_WHITELIST,
  GROUP_EVENT_WHITELIST,
  KEYBOARD_MAX_BUTTONS_PER_ROW,
  KEYBOARD_MAX_ROWS,
  QQ_NUMBER_RE,
} from '@/core/constants'
import type { Contact, ElementTypes, SendMsgResults } from 'node-karin'
import type { AdapterQQBot } from './base'
import type { Grouping, PassiveInfo } from './grouping'
import type { KeyboardRow, SendQQMediaMessageRequest, SendQQMsg, SendQQMsgResponse } from '@/core/api/types'

/**
 * 处理 QQ 场景（单聊 + 群聊）的发送
 *
 * QQ 单聊 / 群聊的自定义 Markdown 自 2026-04-23 起已开放给所有机器人，无需申请
 * （见 `api-docs/server-inter/message/type/markdown.md`），所以这里只保留一条发送通道：
 * text / at / 可转换为公网 URL 的图片通过 markdown content 渲染；无法转换的图片
 * 与视频 / 语音 / 文件由 sendQQMarkdown 内部以 msg_type=7 紧随主消息补发。所有
 * 富媒体都会优先通过 fileToUrl 取得公网地址，QQ 上传只做兜底。只有显式引用的
 * 纯文本消息会降级为 msg_type=0，以保证 QQ 客户端能稳定显示引用气泡。
 */
export const sendQQ = async (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  elements: ElementTypes[]
): Promise<SendMsgResults> => {
  assertOpenIdPeer(contact)
  const target = contact.scene === 'friend' ? 'user' : 'group'
  const grouping = groupElements<'qq'>(contact.scene, elements)
  await resolveOutgoingReferenceQQ(ctx, contact, grouping)
  return sendQQMarkdown(ctx, contact, grouping, target)
}

/**
 * QQ 官方接口只接受 openid（32 位十六进制或 UUID 形态）寻址。纯数字 peer 一定是
 * QQ 号/群号，继续走下去只会在媒体上传或消息下发时被平台以 40011028
 * 「请求的资源不存在」拒绝，且平台错误信息没有指向性（上游常见场景：把 karin
 * 主人列表里的 QQ 号直接当私聊目标）。这里提前拦截，给出可操作的说明。
 */
const assertOpenIdPeer = (contact: Contact<'friend' | 'group'>): void => {
  if (!QQ_NUMBER_RE.test(contact.peer)) return

  const sceneLabel = contact.scene === 'friend' ? '私聊' : '群聊'
  throw new Error(
    `[sendQQ] ${sceneLabel} peer 不是有效 openid: ${contact.peer}。` +
    'QQ 官方 Bot API 不使用 QQ 号/群号寻址，请让对方先给机器人发一条消息，从事件中获取其 openid 后填入配置'
  )
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

  /** 上传归属会话固定为本次发送目标，保证 openid 与执行发送的 bot 同域。 */
  const origin: UploadOrigin = { scene: target, peer: contact.peer }

  // 1) 把文本 + 可公网访问的图片合并为一段 markdown content
  const lines: string[] = []
  if (grouping.text.length) lines.push(grouping.text.join(''))
  const fallbackImages = await appendMarkdownImages(ctx, lines, grouping.qqImages, origin)

  const markdownFallbackImages = await appendExplicitMarkdown(ctx, lines, grouping, origin)
  fallbackImages.push(...markdownFallbackImages)

  if (contact.scene === 'group') {
    warnUnsupportedCommandEnterButtons(ctx, collectCommandEnterButtons(grouping.buttons, grouping.keyboards))
    warnUnsupportedCommandEnterMarkdowns(ctx, grouping.markdowns.map(m => m.markdown))
  }

  // 2) 先备好富媒体：无法进入 markdown 的图片走 QQ 上传兜底，视频 / 语音 / 文件本就单独发送
  const mediaItems: SendQQMediaMessageRequest[] = []

  for (const file of fallbackImages) {
    const res = await ctx.super.media.uploadFallback(target, contact.peer, 'image', file, false)
    mediaItems.push(ctx.super.qq.media(res.file_info))
  }

  for (const m of grouping.media) {
    const source = await resolvePreferredMediaSource(ctx, m.kind, m.source, m.name, origin)
    const res = source.via === 'fallback'
      ? await ctx.super.media.uploadFallback(target, contact.peer, m.kind, source.source, false, m.name)
      : await ctx.super.media.upload(target, contact.peer, m.kind, source.source, false, m.name)
    mediaItems.push(ctx.super.qq.media(res.file_info))
  }

  // 3) markdown 主消息：有任意可渲染内容才推
  if (lines.length || grouping.buttons.length || grouping.keyboards.length) {
    if (shouldUseTextForReference(grouping)) {
      items.push(ctx.super.qq.text(lines.join('\n')))
    } else if (lines.length) {
      items.push(ctx.super.qq.markdown({ content: lines.join('\n') }, buildKeyboard(grouping)))
    } else {
      attachKeyboardWithoutMarkdown(ctx, grouping, mediaItems, items)
    }
  }

  items.push(...mediaItems)

  if (!items.length) {
    items.push(ctx.super.qq.text('不支持发送的消息类型'))
  }

  return flushQQ(ctx, contact, grouping, items)
}

/**
 * 处理「没有任何 markdown 正文，但存在按钮」的边缘情况。
 *
 * 典型触发路径：下游只发一张 markdown 语法图片 + 若干按钮，而这张图片没能通过
 * `fileToUrl` 取到公网地址，被降级成 msg_type=7 富媒体。此时 markdown 正文为空，
 * 旧实现会补一个零宽字符当正文，把按钮单独发成一条消息，客户端就会看到
 * 「一条空的按钮消息 + 一条富媒体消息」两条消息。
 *
 * 这里改为把 keyboard 挂到第一条富媒体上，合并成一条消息；只有在连富媒体都没有时，
 * 才保留零宽字符 markdown 兜底（纯按钮消息是正常用法，不能丢）。
 *
 * @param ctx 适配器实例，用于输出日志。
 * @param grouping 已归类的消息段。
 * @param mediaItems 本次待发送的富媒体消息体，keyboard 会挂到第一条上。
 * @param items 最终发送队列，仅在没有富媒体时追加纯按钮 markdown。
 */
const attachKeyboardWithoutMarkdown = (
  ctx: AdapterQQBot,
  grouping: Grouping<'qq'>,
  mediaItems: SendQQMediaMessageRequest[],
  items: SendQQMsg[]
): void => {
  const keyboard = buildKeyboard(grouping)
  if (!keyboard) return

  const [first] = mediaItems
  if (!first) {
    items.push(ctx.super.qq.markdown({ content: BUTTON_ONLY_MARKDOWN }, keyboard))
    return
  }

  first.keyboard = keyboard
  ctx.logger('debug', '图片未能进入 markdown 通道，按钮已随富媒体一起发送，避免拆成两条消息')
}

/**
 * 将能转成公网 URL 的图片追加到 markdown 行，无法转换的图片返回给富媒体 fallback。
 *
 * @param ctx 适配器实例，用于输出降级日志。
 * @param lines markdown 行数组。
 * @param files QQ 图片消息段的 file 字段。
 * @param origin 本次发送归属的上传会话。
 * @returns 需要改走 msg_type=7 富媒体发送的图片列表。
 */
const appendMarkdownImages = async (
  ctx: AdapterQQBot,
  lines: string[],
  files: string[],
  origin: UploadOrigin
): Promise<string[]> => {
  const fallback: string[] = []

  for (const file of files) {
    const resolved = await resolvePreferredMediaSource(ctx, 'image', file, undefined, origin, 'markdown')
    if (resolved.via === 'fallback') {
      fallback.push(file)
      continue
    }

    lines.push(await buildMarkdownImageLine(resolved.source, '', resolved.size))
  }

  return fallback
}

/**
 * 处理显式 segment.markdown 中的图片：可转公网 URL 的继续嵌入，无法转的改走富媒体。
 *
 * @param ctx 适配器实例，用于输出降级日志。
 * @param lines markdown 行数组。
 * @param grouping 已归类的消息段。
 * @param origin 本次发送归属的上传会话。
 * @returns 需要改走 msg_type=7 富媒体发送的图片列表。
 */
const appendExplicitMarkdown = async (
  ctx: AdapterQQBot,
  lines: string[],
  grouping: Grouping<'qq'>,
  origin: UploadOrigin
): Promise<string[]> => {
  const fallback: string[] = []

  for (const markdown of grouping.markdowns) {
    for (const part of splitMarkdownImages(markdown.markdown)) {
      if (part.type === 'text') {
        const text = part.value.trim()
        if (text) lines.push(text)
        continue
      }

      const resolved = await resolvePreferredMediaSource(ctx, 'image', part.source, undefined, origin, 'markdown')
      if (resolved.via === 'fallback') {
        fallback.push(part.source)
        continue
      }

      /** 保留开发者写下的 alt 与显式尺寸，只替换图片来源 */
      lines.push(await buildMarkdownImageLine(resolved.source, part.alt, resolved.size))
    }
  }

  return fallback
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
const shouldUseTextForReference = (grouping: Grouping<'qq'>): boolean => {
  return isQQReferenceMessageId(grouping.reply.messageId) &&
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
 * 映射只存在于 SQLite 消息缓存（ID 映射行不受缓存开关影响，始终落库）。
 * 解析结果直接写回 grouping，后续同步路径（降级判断、message_reference
 * 附加）无需再查库。
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
  if (!original || isQQReferenceMessageId(original)) return

  const fromStore = await ctx.messageStore
    .resolveRefIdx(String(ctx.cfg.appId), contact, original)
    .catch(() => null)
  if (fromStore) grouping.reply.messageId = fromStore
}

/**
 * 构造 keyboard 字段（buttons + keyboards 合并）
 */
const buildKeyboard = (grouping: Grouping<'qq' | 'guild'>) => {
  const rows: KeyboardRow[] = []
  grouping.buttons.forEach(b => rows.push(...karinToQQBot(b)))
  grouping.keyboards.forEach(k => rows.push(...karinToQQBot(k)))
  const normalizedRows: KeyboardRow[] = []
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
    if (!referenceHandled) referenceHandled = attachVisibleReferenceQQ(item, grouping)
    const res: SendQQMsgResponse = await sendQQWithEventFallback(ctx, contact, send, item)
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
    if (item.msg_type === 7 && item.keyboard && isInvalidKeyboardError(err)) {
      ctx.logger('warn', '富媒体消息附带 keyboard 被 QQ 拒绝，已去掉按钮重试，本条消息将不显示按钮')
      const retryItem: SendQQMediaMessageRequest = { ...item }
      delete retryItem.keyboard
      return send(contact.peer, retryItem)
    }

    if (!item.event_id || !isInvalidEventIdError(err)) throw err

    ctx.logger('warn', `event_id 被 QQ 拒绝，已改用普通消息重试: ${item.event_id}`)
    const retryItem: SendQQMsg = { ...item }
    delete retryItem.event_id
    delete retryItem.msg_seq
    return send(contact.peer, retryItem)
  }
}

/**
 * 判断发送失败是否来自 QQ 对 `keyboard` 的参数校验。
 *
 * 官方文档未声明 `keyboard` 与 `media` 互斥，但实际平台行为无法完全确认，
 * 因此富媒体带按钮失败时基于键盘相关错误码兜底降级，保证图片本身能发出去。
 *
 * @param err 捕获到的发送异常。
 * @returns 是否可以通过移除 `keyboard` 重试。
 */
const isInvalidKeyboardError = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes('305007') ||
    message.includes('键盘') ||
    message.includes('keyboard')
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
 * API 消息 ID 到 REFIDX 的转换已由 `resolveOutgoingReferenceQQ` 在发送前完成。
 *
 * @param item 即将发送的 QQ 消息体。
 * @param grouping 已归类的消息段。
 * @returns 是否已经消费一次显式引用。
 */
const attachVisibleReferenceQQ = (
  item: SendQQMsg,
  grouping: Grouping<'qq'>
): boolean => {
  const messageId = grouping.reply.messageId
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
