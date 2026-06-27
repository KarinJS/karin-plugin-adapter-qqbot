import FormData from 'form-data'
import { karinToQQBot, fileToUrl } from 'node-karin'
import { groupElements } from './grouping'
import { extractUrlButtons, imagesToMarkdown } from './text-to-md'
import type { Contact, ElementTypes, SendMsgResults } from 'node-karin'
import type { AdapterQQBot } from './base'
import type { Grouping } from './grouping'
import type { SendGuildMsg, SendGuildResponse } from '@/core/api/types'

/**
 * 处理频道场景（子频道 + 私信）的发送
 *
 * 永远走 markdown 通道（msg_type=2），文本 / at / 图片均通过 markdown
 * 渲染。Markdown / Keyboard 已全量开放，老的 type=text/image 通道不再使用。
 */
export const sendGuild = async (
  ctx: AdapterQQBot,
  contact: Contact<'guild' | 'direct'>,
  elements: ElementTypes[]
): Promise<SendMsgResults> => {
  const grouping = groupElements<'guild'>(contact.scene, elements)

  if (ctx.cfg.keyboard.enable && grouping.text.length) {
    const joined = grouping.text.join('')
    const { text, buttons } = extractUrlButtons(joined, false)
    grouping.text = [text]
    grouping.buttons.push(...buttons)
  }

  return sendGuildMarkdown(ctx, contact, grouping)
}

/**
 * Markdown 通道
 */
const sendGuildMarkdown = async (
  ctx: AdapterQQBot,
  contact: Contact<'guild' | 'direct'>,
  grouping: Grouping<'guild'>
): Promise<SendMsgResults> => {
  const items: Array<SendGuildMsg | FormData> = []
  const lines: string[] = []

  if (grouping.text.length) lines.push(grouping.text.join(''))

  // guild 场景：把 imageUrls 和 imageFiles 一并塞进 markdown
  const allImages = [...grouping.guildImageUrls]
  for (const file of grouping.guildImageFiles) {
    const { url } = await fileToUrl('image', file, 'image.jpg')
    allImages.push(url)
  }
  if (allImages.length) {
    const mdImages = await imagesToMarkdown(allImages)
    lines.push(...mdImages)
  }
  grouping.markdowns.forEach(m => lines.push(m.markdown))

  if (lines.length || grouping.buttons.length || grouping.keyboards.length) {
    const keyboard = buildKeyboard(grouping)
    items.push(ctx.super.guild.markdown({ content: lines.join('\n') }, keyboard))
  }

  if (!items.length) {
    items.push(ctx.super.guild.text('不支持发送的消息类型'))
  }

  return flushGuild(ctx, contact, grouping, items)
}

const buildKeyboard = (grouping: Grouping<'guild'>) => {
  const rows: ReturnType<typeof karinToQQBot> = []
  grouping.buttons.forEach(b => rows.push(...karinToQQBot(b)))
  grouping.keyboards.forEach(k => rows.push(...karinToQQBot(k)))
  if (!rows.length) return undefined
  return { content: { rows } }
}

const flushGuild = async (
  ctx: AdapterQQBot,
  contact: Contact<'guild' | 'direct'>,
  grouping: Grouping<'guild'>,
  items: Array<SendGuildMsg | FormData>
): Promise<SendMsgResults> => {
  const result = ctx.initSendMsgResults()
  const passive = buildPassiveGuild(grouping)
  const send = contact.scene === 'guild'
    ? (peer: string, subPeer: string, item: SendGuildMsg | FormData) =>
        ctx.super.messages.sendChannelMsg(subPeer, item)
    : (peer: string, _subPeer: string, item: SendGuildMsg | FormData) =>
        ctx.super.messages.sendDmsMsg(peer, item)

  for (const item of items) {
    passive(item)
    const res: SendGuildResponse = await send(contact.peer, contact.subPeer!, item)
    result.rawData.push(res)
  }
  return ctx.handleResponse(result)
}

/**
 * 解析频道/私信场景的被动回复来源。
 *
 * openclaw 的 qqbot 适配器对 channel/dm 也只传 `msg_id`。这里让显式
 * `segment.reply` 优先，其次使用事件入口追加的 pasmsg。
 *
 * @param grouping 已归类的消息段。
 * @returns 被动回复来源；没有可用来源时返回 undefined。
 */
const resolvePassiveGuild = (grouping: Grouping<'guild'>) => {
  if (grouping.reply.messageId) return { type: 'msg' as const, id: grouping.reply.messageId }
  if (grouping.pasmsg.id) return grouping.pasmsg
  return undefined
}

/**
 * 构造频道/私信被动消息附加器。
 *
 * @param grouping 已归类的消息段。
 * @returns 可直接修改发送体或 FormData 的附加函数。
 */
const buildPassiveGuild = (grouping: Grouping<'guild'>) => {
  const source = resolvePassiveGuild(grouping)
  if (!source?.id) return (_item: SendGuildMsg | FormData) => undefined

  if (source.type === 'event') {
    return (item: SendGuildMsg | FormData) => {
      if (item instanceof FormData) item.append('event_id', source.id)
      else item.event_id = source.id
    }
  }

  return (item: SendGuildMsg | FormData) => {
    if (item instanceof FormData) item.append('msg_id', source.id)
    else item.msg_id = source.id
  }
}
