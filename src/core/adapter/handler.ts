import { escapeMarkdown, getImageSize } from '@/utils/common'
import { common, fileToUrl, segment } from 'node-karin'
import type {
  Contact,
  SendMsgResults,
} from 'node-karin'
import type {
  QQSend,
  Grouping,
  Options,
  GuildSend,
} from '@/core/adapter/adapter'
import { AdapterQQBotMarkdown } from '@/core/adapter/markdown'

export interface RawMarkdown {
  /**
   * 频道场景原生Markdown
   * @param type 场景类型
   * @param ctx 适配器实例
   * @param list 分类列表
   * @param contact 发送目标
   * @param pasmsg 将消息转为被动消息 主动事件无法使用
   * @param send 发送消息函数
   */
  (
    type: 'guild',
    ctx: AdapterQQBotMarkdown,
    list: Grouping<'guild'>,
    contact: Contact<'guild' | 'direct'>,
    pasmsg: (item: Options<'guild'>) => void,
    send: GuildSend
  ): Promise<SendMsgResults>

  /**
   * QQ场景原生Markdown
   * @param type 场景类型
   * @param ctx 适配器实例
   * @param list 分类列表
   * @param contact 发送目标
   * @param pasmsg 将消息转为被动消息 主动事件无法使用
   * @param send 发送消息函数
   */
  (
    type: 'qq',
    ctx: AdapterQQBotMarkdown,
    list: Grouping<'qq'>,
    contact: Contact<'friend' | 'group'>,
    pasmsg: (item: Options<'qq'>) => void,
    send: QQSend
  ): Promise<SendMsgResults>
}

/**
 * 原生Markdown
 * @param ctx 适配器实例
 * @param list 分类列表
 * @param contact 发送目标
 * @param pasmsg 将消息转为被动消息 主动事件无法使用
 * @param send 发送函数
 */
export const rawMarkdown: RawMarkdown = async <T extends 'qq' | 'guild'> (
  type: T,
  ctx: AdapterQQBotMarkdown,
  list: Grouping<T>,
  contact: T extends 'qq' ? Contact<'friend' | 'group'> : Contact<'guild' | 'direct'>,
  pasmsg: (item: any) => void,
  send: T extends 'qq' ? QQSend : T extends 'guild' ? GuildSend : never
): Promise<SendMsgResults> => {
  await Promise.all(list.image.map(async (file) => {
    if (file.startsWith('http')) {
      const { width, height } = await getImageSize(file)
      list.content.push(`![karin #${width}px #${height}px](${file})`)
      return
    }
    const { url, width, height } = await fileToUrl('image', file, 'image.jpg')
    list.content.push(`![karin #${width}px #${height}px](${url})`)
  }))

  /** 将文本转为markdown */
  list.markdown.push(segment.markdown(list.content.join('')))

  /** 处理Markdown、按钮 */
  list.markdownToButton(type, list)
  /** 返回值 */
  const rawData = ctx.initSendMsgResults()

  if (type === 'qq') {
    if (!list.list.length) {
      const options = ctx.super.QQdMsgOptions('text', '不支持发送的消息类型') as Options<T>
      list.list.push(options)
    }

    for (const item of list.list) {
      pasmsg(item)
      const res = await (send as QQSend)(contact.peer, item as Options<'qq'>)
      rawData.rawData.push(res)
    }

    return ctx.handleResponse(rawData)
  }

  if (!list.list.length) {
    const options = ctx.super.GuildMsgOptions('text', '不支持发送的消息类型') as Options<T>
    list.list.push(options)
  }

  for (const item of list.list) {
    pasmsg(item)
    const res = await (send as GuildSend)(contact.peer, contact.subPeer!, item as Options<'guild'>)
    rawData.rawData.push(res)
  }

  return ctx.handleResponse(rawData)
}

// 模板 Markdown 模式（3/4/5）已废弃，2026/04/23 后 Markdown 全量开放无需模板
