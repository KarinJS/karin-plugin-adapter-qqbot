/**
 * #引用测试 / #getMsg测试
 *
 * 专门测试 QQBot 适配器的 `getMsg(messageId)` 引用消息缓存：
 * 1. 必须回复一条消息触发；
 * 2. 使用 `e.replyId` 读取 Karin/OneBot 标准回复消息 ID；
 * 3. 调用 `bot.getMsg(e.replyId)` 读取数据库缓存；
 * 4. 用对应 Karin 消息段重新发送缓存中的引用消息内容。
 */

import karin, { segment } from 'node-karin'
import { AdapterQQBot } from '@/core/adapter/base'
import type { ElementTypes, MessageResponse } from 'node-karin'

/** 当前 QQBot 接收侧会写入 getMsg 缓存的消息段类型。 */
const CACHE_ELEMENT_TYPES = new Set<ElementTypes['type']>([
  'text',
  'at',
  'reply',
  'face',
  'image',
  'video',
  'record',
  'file',
  'markdown',
])

/** 防止报告里的 Markdown 代码块被反引号截断。 */
const escapeCode = (text: string): string => text.replace(/`/g, '\\`')

/** 长 URL 只在报告里截断；实际回放仍使用完整 file/url。 */
const short = (text = '', max = 120): string => {
  if (text.length <= max) return text
  return `${text.slice(0, max)}...`
}

/** 构造报告中用于人工核对的消息段摘要。 */
const describeElement = (element: ElementTypes, index: number): string => {
  switch (element.type) {
    case 'text':
      return `${index}. text: \`${escapeCode(element.text)}\``
    case 'at':
      return `${index}. at: targetId=\`${element.targetId}\`${element.name ? ` name=\`${escapeCode(element.name)}\`` : ''}`
    case 'reply':
      return `${index}. reply: messageId=\`${escapeCode(element.messageId)}\``
    case 'face':
      return `${index}. face: id=\`${element.id}\``
    case 'image':
      return `${index}. image: file=\`${escapeCode(short(element.file))}\` width=\`${element.width || 0}\` height=\`${element.height || 0}\``
    case 'video':
      return `${index}. video: file=\`${escapeCode(short(element.file))}\``
    case 'record':
      return `${index}. record: file=\`${escapeCode(short(element.file))}\` magic=\`${element.magic}\``
    case 'file':
      return `${index}. file: name=\`${escapeCode(element.name || '')}\` size=\`${element.size || 0}\` file=\`${escapeCode(short(element.file))}\``
    case 'markdown':
      return `${index}. markdown: \`${escapeCode(short(element.markdown))}\``
    default:
      return `${index}. ${element.type}: 当前接收缓存不支持回放`
  }
}

/** 使用标准 segment 工厂重建消息段，验证数据库字段足够还原 Karin 元素。 */
const rebuildElement = (element: ElementTypes): ElementTypes | null => {
  switch (element.type) {
    case 'text':
      return segment.text(element.text)
    case 'at':
      return segment.at(element.targetId, element.name)
    case 'reply':
      return segment.reply(element.messageId)
    case 'face':
      return segment.face(element.id, element.isBig)
    case 'image':
      return segment.image(element.file, {
        fid: element.fid,
        name: element.name,
        summary: element.summary,
        md5: element.md5,
        width: element.width,
        height: element.height,
        subType: element.subType,
        size: element.size,
        fileType: element.fileType,
      })
    case 'video':
      return segment.video(element.file, {
        fid: element.fid,
        name: element.name,
        md5: element.md5,
        width: element.width,
        height: element.height,
      })
    case 'record':
      return segment.record(element.file, element.magic, {
        fid: element.fid,
        md5: element.md5,
        name: element.name,
      })
    case 'file':
      return segment.file(element.file, {
        fid: element.fid,
        name: element.name,
        size: element.size,
        hash: element.hash,
      })
    case 'markdown':
      return segment.markdown(element.markdown, element.config)
    default:
      return null
  }
}

/** 生成 getMsg 测试报告。 */
const buildReport = (replyId: string, msg: MessageResponse): string => {
  const unsupported = msg.elements.filter(item => !CACHE_ELEMENT_TYPES.has(item.type))
  return [
    '#### QQBot getMsg 引用消息测试',
    '',
    `引用 ID: \`${escapeCode(replyId)}\``,
    `命中消息 ID: \`${escapeCode(msg.messageId)}\``,
    `场景: \`${msg.contact.scene}\``,
    `会话: \`${escapeCode(msg.contact.peer)}\``,
    `发送者: \`${escapeCode(msg.sender.userId)}\` / \`${escapeCode(msg.sender.nick || msg.sender.name || '')}\` / \`${msg.sender.role}\``,
    `消息段数量: \`${msg.elements.length}\``,
    '',
    '消息段:',
    ...msg.elements.map((item, index) => `- ${describeElement(item, index)}`),
    ...(unsupported.length
      ? ['', `未回放类型: ${unsupported.map(item => `\`${item.type}\``).join(', ')}`]
      : []),
  ].join('\n')
}

export const qqbotGetMsgTest = karin.command(
  /^(?:#)?(?:gg)$/i,
  async (e) => {
    const bot = e.bot as AdapterQQBot
    if (!bot || bot.adapter.protocol !== 'qqbot') {
      await e.reply('当前机器人不是 QQBot 适配器，无法测试 getMsg')
      return
    }

    if (!e.replyId) {
      await e.reply('请回复一条消息后发送 #引用测试')
      return
    }

    const msg = await bot.getMsg(e.replyId)
    if (!msg || !msg.elements.length) {
      await e.reply(`getMsg 未命中或引用消息没有可缓存消息段: ${e.replyId}`)
      return
    }

    await e.reply(segment.markdown(buildReport(e.replyId, msg)))

    const replay = msg.elements
      .map(rebuildElement)
      .filter((item): item is ElementTypes => !!item)

    if (!replay.length) {
      await e.reply('引用消息命中，但没有可回放的消息段')
      return
    }

    await e.reply([
      segment.text('引用消息内容回放：\n'),
      ...replay,
    ])
  },
  {
    name: 'qqbot:getMsg-test',
    permission: 'all',
  }
)
