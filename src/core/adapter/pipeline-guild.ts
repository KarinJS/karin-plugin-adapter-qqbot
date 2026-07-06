import FormData from 'form-data'
import path from 'node:path'
import { karinToQQBot, fileToUrl, common } from 'node-karin'
import {
  collectCommandEnterButtons,
  formatCommandEnterButtonNames,
  hasCommandEnterTextChain,
  normalizeQQBotButton,
} from './button-enter'
import { groupElements } from './grouping'
import { extractUrlButtons, imagesToMarkdown, splitMarkdownImages } from './text-to-md'
import type { Contact, ElementTypes, SendMsgResults } from 'node-karin'
import type { AdapterQQBot } from './base'
import type { Grouping } from './grouping'
import type { SendGuildMsg, SendGuildResponse } from '@/core/api/types'

/** QQ keyboard 限制：最多 5 行，每行最多 5 个按钮。 */
const KEYBOARD_MAX_ROWS = 5
const KEYBOARD_MAX_BUTTONS_PER_ROW = 5
/** 只有按钮没有文本时仍需提供非空 markdown 内容。 */
const BUTTON_ONLY_MARKDOWN = '\u200b'

/**
 * 处理频道场景（子频道 + 私信）的发送
 *
 * 默认把普通文本 / at / 图片通过 markdown 渲染。关闭自动 Markdown 通道后，
 * 普通文本和图片改走经典发送；显式 segment.markdown 仍按调用方指定走 Markdown。
 */
export const sendGuild = async (
  ctx: AdapterQQBot,
  contact: Contact<'guild' | 'direct'>,
  elements: ElementTypes[]
): Promise<SendMsgResults> => {
  const grouping = groupElements<'guild'>(contact.scene, elements)

  if (ctx.cfg.markdown.enable && ctx.cfg.keyboard.enable && grouping.text.length) {
    const joined = grouping.text.join('')
    const { text, buttons } = extractUrlButtons(joined, false)
    grouping.text = [text]
    grouping.buttons.push(...buttons)
  }

  if (ctx.cfg.markdown.enable) return sendGuildMarkdown(ctx, contact, grouping)
  return sendGuildClassic(ctx, contact, grouping)
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
  for (const markdown of grouping.markdowns) {
    for (const part of splitMarkdownImages(markdown.markdown)) {
      if (part.type === 'text') {
        const text = part.value.trim()
        if (text) lines.push(text)
      } else {
        const [mdImage] = await imagesToMarkdown([part.source])
        lines.push(mdImage)
      }
    }
  }

  warnUnsupportedCommandEnterButtons(ctx, contact.scene, collectCommandEnterButtons(grouping.buttons, grouping.keyboards))
  warnUnsupportedCommandEnterMarkdowns(ctx, contact.scene, grouping.markdowns.map(m => m.markdown))

  if (lines.length || grouping.buttons.length || grouping.keyboards.length) {
    const keyboard = buildKeyboard(grouping)
    const content = lines.length ? lines.join('\n') : BUTTON_ONLY_MARKDOWN
    items.push(ctx.super.guild.markdown({ content }, keyboard))
  }

  if (!items.length) {
    items.push(ctx.super.guild.text('不支持发送的消息类型'))
  }

  return flushGuild(ctx, contact, grouping, items)
}

/**
 * 经典通道：文本走 content，图片按文档走 image / file_image 单独发送。
 */
const sendGuildClassic = async (
  ctx: AdapterQQBot,
  contact: Contact<'guild' | 'direct'>,
  grouping: Grouping<'guild'>
): Promise<SendMsgResults> => {
  const items: Array<SendGuildMsg | FormData> = []
  const lines: string[] = []
  const images = [...grouping.guildImageUrls, ...grouping.guildImageFiles]

  if (grouping.text.length) lines.push(grouping.text.join(''))

  if (!grouping.markdowns.length && (grouping.buttons.length || grouping.keyboards.length)) {
    ctx.logger('warn', 'Markdown 通道已关闭，button / keyboard 无法随普通文本发送，已跳过')
  }

  const content = lines.join('\n').trim()
  if (content) items.push(ctx.super.guild.text(content))

  for (const image of images) {
    items.push(await buildGuildImageItem(image))
  }

  await appendExplicitGuildMarkdownItems(ctx, contact, grouping, items)

  if (!items.length) {
    items.push(ctx.super.guild.text('不支持发送的消息类型'))
  }

  return flushGuild(ctx, contact, grouping, items)
}

/**
 * 显式 `segment.markdown` 是调用方指定的发送类型，不受 Markdown 自动通道开关影响。
 */
const appendExplicitGuildMarkdownItems = async (
  ctx: AdapterQQBot,
  contact: Contact<'guild' | 'direct'>,
  grouping: Grouping<'guild'>,
  items: Array<SendGuildMsg | FormData>
): Promise<void> => {
  if (!grouping.markdowns.length) return

  const lines: string[] = []
  for (const markdown of grouping.markdowns) {
    for (const part of splitMarkdownImages(markdown.markdown)) {
      if (part.type === 'text') {
        const text = part.value.trim()
        if (text) lines.push(text)
      } else {
        const [mdImage] = await imagesToMarkdown([part.source])
        lines.push(mdImage)
      }
    }
  }

  warnUnsupportedCommandEnterButtons(ctx, contact.scene, collectCommandEnterButtons(grouping.buttons, grouping.keyboards))
  warnUnsupportedCommandEnterMarkdowns(ctx, contact.scene, grouping.markdowns.map(m => m.markdown))

  const keyboard = buildKeyboard(grouping)
  const content = lines.length ? lines.join('\n') : BUTTON_ONLY_MARKDOWN
  items.push(ctx.super.guild.markdown({ content }, keyboard))
}

const buildGuildImageItem = async (source: string): Promise<SendGuildMsg | FormData> => {
  if (/^https?:\/\//i.test(source)) return { type: 'image', image: source }

  const form = new FormData()
  form.append('file_image', await common.buffer(source, { http: false }), {
    filename: resolveImageFilename(source),
  })
  return form
}

const resolveImageFilename = (source: string): string => {
  const file = source.split(/[?#]/)[0] || ''
  const name = path.basename(file)
  return name.includes('.') ? name : 'image.jpg'
}

const buildKeyboard = (grouping: Grouping<'guild'>) => {
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
 * 频道消息不支持 `enter: true` 直发按钮，只输出提示，不拦截 keyboard 发送。
 *
 * @param ctx 适配器实例，用于输出日志。
 * @param scene 频道消息场景。
 * @param buttons 本次消息中的直发指令按钮。
 */
const warnUnsupportedCommandEnterButtons = (
  ctx: AdapterQQBot,
  scene: Contact<'guild' | 'direct'>['scene'],
  buttons: ReturnType<typeof collectCommandEnterButtons>
): void => {
  if (!buttons.length) return
  const names = formatCommandEnterButtonNames(buttons)
  const name = scene === 'guild' ? '频道' : '频道私信'
  ctx.logger('debug', `${name}不支持 enter: true 直接发送，按钮仍会按原样发送: ${names}`)
}

/**
 * 频道消息不支持 `<qqbot-cmd-enter>` 文本链，只输出提示，不拦截 markdown 发送。
 *
 * @param ctx 适配器实例，用于输出日志。
 * @param scene 频道消息场景。
 * @param markdowns 本次消息中的 markdown 内容。
 */
const warnUnsupportedCommandEnterMarkdowns = (
  ctx: AdapterQQBot,
  scene: Contact<'guild' | 'direct'>['scene'],
  markdowns: string[]
): void => {
  if (!markdowns.some(hasCommandEnterTextChain)) return
  const name = scene === 'guild' ? '频道' : '频道私信'
  ctx.logger('debug', `${name}不支持 <qqbot-cmd-enter> 直接发送，markdown 仍会按原样发送`)
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
