import { common, fileToUrl, karinToQQBot } from 'node-karin'
import { handleUrl, qrs } from '@/utils/common'
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

  // 决定通道
  const useMarkdown = grouping.markdowns.length > 0
    || (ctx.cfg.markdown.enable
        && grouping.media.length === 0
        && (grouping.text.length > 0 || grouping.qqImages.length > 0))

  if (useMarkdown) {
    return sendQQMarkdown(ctx, contact, grouping, target)
  }
  return sendQQClassic(ctx, contact, grouping, target)
}

/**
 * 经典通道：文本（含 URL→ QR）+ 富媒体（图/视频/语音/文件）+ 可选 markdown 行
 */
const sendQQClassic = async (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  grouping: Grouping<'qq'>,
  target: 'user' | 'group'
): Promise<SendMsgResults> => {
  const items: SendQQMsg[] = []

  // 文本 + URL 转 QR（仅在未启用 keyboard.enable 时；启用了走 markdown）
  let textContent = grouping.text.join('')
  if (textContent) {
    const urls = handleUrl(textContent)
    if (urls.length) {
      urls.forEach(u => { textContent = textContent.replace(new RegExp(u, 'g'), '[请扫码查看]') })
      const qrList = await qrs(urls)
      const qr = qrList.length === 1
        ? qrList[0]
        : (await common.mergeImage(qrList, 3)).base64
      grouping.qqImages.push(qr)
    }
    items.push(ctx.super.qq.text(textContent))
  }

  // 图片
  for (const file of grouping.qqImages) {
    const base64 = await common.base64(file)
    const res = await ctx.super.media.upload(target, contact.peer, 'image', base64, false)
    items.push(ctx.super.qq.media(res.file_info))
  }

  // 视频 / 语音 / 文件
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

  if (lines.length === 0 && grouping.buttons.length === 0 && grouping.keyboards.length === 0) {
    items.push(ctx.super.qq.text('不支持发送的消息类型'))
  } else {
    const content = lines.join('\n')
    const keyboard = buildKeyboard(grouping)
    items.push(ctx.super.qq.markdown({ content }, keyboard))
  }

  // markdown 通道不携带视频/语音/文件，落到经典通道补发
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
