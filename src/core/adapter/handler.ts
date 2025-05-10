import { escapeMarkdown, getImageSize } from '@/utils/common'
import { common, fileToUrl, segment } from 'node-karin'
import type {
  Contact,
  MarkdownTplElement,
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

/**
 * 图文模板
 * @param ctx 适配器实例
 * @param list 分类列表
 * @param contact 发送目标
 * @param pasmsg 将消息转为被动消息 主动事件无法使用
 * @param send 发送函数
 */
export const GraphicTemplateMarkdown: RawMarkdown = async <T extends 'qq' | 'guild'> (
  type: T,
  ctx: AdapterQQBotMarkdown,
  list: Grouping<T>,
  contact: T extends 'qq' ? Contact<'friend' | 'group'> : Contact<'guild' | 'direct'>,
  pasmsg: (item: any) => void,
  send: T extends 'qq' ? QQSend : T extends 'guild' ? GuildSend : never
): Promise<SendMsgResults> => {
  /**
   * 构建模板键值对
   * @param index 索引
   * @param value 值
   */
  const KV = (index: number, value: string) => {
    return { key: kv[index], values: [value] }
  }

  /** 构建模板 */
  const tpl: {
    /**
     * @param content 文本内容
     */
    (content: string): MarkdownTplElement
    /**
     * @param desc 图片描述
     * @param url 图片链接
     */
    (desc: string, url: string): MarkdownTplElement
    /**
     * @param content 文本内容
     * @param desc 图片描述
     * @param url 图片链接
     */
    (content: string, desc: string, url: string): MarkdownTplElement
  } = (content: string, desc?: string, url?: string) => {
    if (desc && url) {
      return segment.markdownTpl(id, [KV(0, content), KV(1, desc), KV(2, url)])
    }

    if (desc) {
      return segment.markdownTpl(id, [KV(1, content), KV(2, desc)])
    }

    return segment.markdownTpl(id, [KV(0, content)])
  }

  /**
   * 图片转换
   * @param file 图片文件
   * @returns 图片链接 | 图片宽度 | 图片高度
   */
  const imageHandler = async (file: string) => {
    if (file.startsWith('http')) {
      const { width, height } = await getImageSize(file)
      return { url: file, width, height }
    }
    const data = await fileToUrl('image', file, 'image.jpg')
    return data
  }

  const { kv, id } = ctx._config.markdown
  /** 文本内容 */
  const content = escapeMarkdown(list.content.join(''))

  /** 处理第一张图片 一段文本可以跟一个图片 */
  const img = list.image.shift()
  if (img) {
    const { url, width, height } = await imageHandler(img)
    list.markdownTpl.push(tpl(content, `karin #${width}px #${height}px`, url))
  } else {
    list.markdownTpl.push(tpl(content))
  }

  /** 处理剩下的图片 单独发送 */
  await Promise.all(list.image.map(async (file, index) => {
    await common.sleep(index * 100) // 简单的睡眠 防止乱序
    const { url, width, height } = await imageHandler(file)
    list.markdownTpl.push(tpl(`karin #${width}px #${height}px`, url))
  }))

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

/**
 * 纯文模板
 */

/**
 * 自定义处理
 */
