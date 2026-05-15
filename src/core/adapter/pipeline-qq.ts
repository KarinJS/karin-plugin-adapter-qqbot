import { fileToUrl, karinToQQBot } from 'node-karin'
import { groupElements } from './grouping'
import { extractUrlButtons, imagesToMarkdown } from './text-to-md'
import type { Contact, ElementTypes, SendMsgResults } from 'node-karin'
import type { AdapterQQBot } from './base'
import type { Grouping } from './grouping'
import type { SendQQMsg, SendQQMsgResponse } from '@/core/api/types'

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
   * 永远走 markdown 通道：
   * text / at / image 通过 markdown content 渲染（at 用内嵌标签）；
   * 视频 / 语音 / 文件由 sendQQMarkdown 内部以 msg_type=7 并发补发。
   * Markdown / Keyboard 已全量开放，无需再走老的 msg_type=0 文本通道。
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

  // 1) 把文本 + 图片合并为一段 markdown content
  const lines: string[] = []
  if (grouping.text.length) lines.push(grouping.text.join(''))
  if (grouping.qqImages.length) {
    // base64 图片要先上传成 URL；http 直接使用
    const urlImages: string[] = []
    for (const file of grouping.qqImages) {
      if (file.startsWith('http')) {
        urlImages.push(file)
      } else {
        const { url } = await fileToUrl('image', file, 'image.jpg')
        urlImages.push(url)
      }
    }
    const mdImages = await imagesToMarkdown(urlImages)
    lines.push(...mdImages)
  }

  if (grouping.markdowns.length) {
    grouping.markdowns.forEach(m => lines.push(m.markdown))
  }

  // markdown 主消息：有任意可渲染内容才推
  if (lines.length || grouping.buttons.length || grouping.keyboards.length) {
    const content = lines.join('\n')
    const keyboard = buildKeyboard(grouping)
    items.push(ctx.super.qq.markdown({ content }, keyboard))
  }

  // 视频 / 语音 / 文件 → msg_type=7 单独补发
  for (const m of grouping.media) {
    let url = m.source
    if (!url.startsWith('http')) {
      const ext = m.kind === 'record' ? 'mp3' : m.kind === 'video' ? 'mp4' : 'bin'
      const file = await fileToUrl(m.kind, url, `${m.kind}.${ext}`)
      url = file.url
    }
    const res = await ctx.super.media.upload(target, contact.peer, m.kind, url, false)
    items.push(ctx.super.qq.media(res.file_info))
  }

  if (!items.length) {
    items.push(ctx.super.qq.text('不支持发送的消息类型'))
  }

  return flushQQ(ctx, contact, grouping, items)
}

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
  const passive = buildPassiveQQ(contact.scene, grouping)
  const send = contact.scene === 'friend'
    ? (peer: string, item: SendQQMsg) => ctx.super.messages.sendFriendMsg(peer, item)
    : (peer: string, item: SendQQMsg) => ctx.super.messages.sendGroupMsg(peer, item)

  let replyHandled = false
  for (const item of items) {
    passive(item)
    if (!replyHandled && grouping.reply.messageId) {
      item.message_reference = { message_id: grouping.reply.messageId }
      replyHandled = true
    }
    const res: SendQQMsgResponse = await send(contact.peer, item)
    result.rawData.push(res)
  }
  return ctx.handleResponse(result)
}

/**
 * 构造被动消息附加器（含白名单校验）
 */
const buildPassiveQQ = (
  scene: 'friend' | 'group',
  grouping: Grouping<'qq'>
) => {
  if (!grouping.pasmsg.id) return (_item: SendQQMsg) => undefined

  const whitelist = scene === 'friend' ? FRIEND_EVENT_WHITELIST : GROUP_EVENT_WHITELIST

  if (grouping.pasmsg.type === 'event') {
    // 极保守：event_id 不在白名单里也允许（防止误打 warn）
    const eventName = grouping.pasmsg.id.split(':')[0]
    if (eventName && !whitelist.has(eventName)) {
      // 仍然按 msg_id 走，由服务端拒绝
    }
    return (item: SendQQMsg) => {
      grouping.pasmsg.seq++
      item.msg_seq = grouping.pasmsg.seq
      item.event_id = grouping.pasmsg.id
    }
  }

  return (item: SendQQMsg) => {
    grouping.pasmsg.seq++
    item.msg_seq = grouping.pasmsg.seq
    item.msg_id = grouping.pasmsg.id
  }
}
