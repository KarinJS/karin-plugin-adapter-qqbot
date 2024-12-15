import { QQBotApi } from '@/core/api'
import FormData from 'form-data'
import { SendGuildMsg, SendQQMsg } from '@/core/api/types'
import { handleUrl, qrs, random } from '@/utils/common'
import type {
  ButtonElementType,
  Contact,
  ElementTypes,
  KeyboardElementType,
  LoggerLevel,
  MarkdownElementType,
  MarkdownTplElementType,
  SendMsgResults,
} from 'node-karin'

import {
  karinToQQBot,
  AdapterBase,
  common,
  logger,
  fileToUrl,
} from 'node-karin'

export type Pasmsg<T extends 'qq' | 'guild'> = { type: 'msg' | 'event', msg_id: string, msg_seq: T extends 'qq' ? number : never }
export interface Grouping<T extends 'qq' | 'guild'> {
  /** 文本 */
  content: string[]
  /** 图片 QQ专属 */
  image: string[]
  /** 单行按钮 */
  button: ButtonElementType[]
  /** 多行按钮 */
  keyboard: KeyboardElementType[]
  /** markdown */
  markdown: MarkdownElementType[]
  /** markdown模板 */
  markdownTpl: MarkdownTplElementType[]
  /** 频道专属 图片url */
  imageUrls: string[]
  /** 频道专属 图片file */
  imageFiles: string[]
  /** 引用回复 频道专属 */
  reply: { message_id: string }
  /** pasmsg */
  pasmsg: Pasmsg<T>
  /** 代发送列表 */
  list: Array<T extends 'qq' ? SendQQMsg : SendGuildMsg | FormData>
}

export abstract class AdapterQQBot extends AdapterBase {
  public super: QQBotApi
  constructor (QQBot: QQBotApi) {
    super()
    this.super = QQBot
    this.adapter.name = '@karinjs/qqbot'
    this.adapter.protocol = 'qqbot'
    this.adapter.platform = 'qq'
    this.adapter.standard = 'unknown'
  }

  logger (level: LoggerLevel, ...args: any[]) {
    logger.bot(level, this.selfId, ...args)
  }
}

/** 非markdown */
export class AdapterQQBotText extends AdapterQQBot {
  async sendMsg (contact: Contact, elements: Array<ElementTypes>, retryCount?: number): Promise<SendMsgResults> {
    if (contact.scene === 'direct' || contact.scene === 'guild') {
      return this.sendGuildMsg(contact, elements, retryCount)
    } else if (contact.scene === 'group' || contact.scene === 'friend') {
      return this.sendQQMsg(contact, elements, retryCount)
    }

    throw new Error('不支持的消息类型')
  }

  /**
   * 被动消息结构
   * @param type 消息类型
   */
  pasmsg<T extends 'qq' | 'guild'> (type: T): Pasmsg<T> {
    if (type === 'qq') {
      return { type: 'msg', msg_id: '', msg_seq: random(1, 9999999) } as Pasmsg<T>
    }

    return { type: 'msg', msg_id: '' } as Pasmsg<T>
  }

  /**
   * 初始化消息分类对象
   */
  initList<T extends 'qq' | 'guild'> (type: T) {
    const list: Grouping<T> = {
      content: [],
      image: [],
      button: [],
      keyboard: [],
      markdown: [],
      markdownTpl: [],
      imageUrls: [],
      imageFiles: [],
      reply: { message_id: '' },
      pasmsg: this.pasmsg(type),
      list: []
    }
    return list
  }

  /**
   * 初始化发送消息返回值
   */
  initSendMsgResults (): SendMsgResults {
    return {
      messageId: '',
      message_id: '',
      messageTime: 0,
      rawData: []
    }
  }

  /**
   * 处理返回值
   * @param data 返回值
   */
  handleResponse (data: SendMsgResults): SendMsgResults {
    const { id, timestamp } = data.rawData[0]
    data.messageId = id
    data.message_id = id
    data.messageTime = timestamp
    data.messageTime = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
    return data
  }

  /**
   * 处理按钮、markdown
   * @param type 消息类型
   * @param button 按钮
   * @param keyboard 键盘
   * @param markdown markdown
   * @param markdownTpl markdown模板
   * @returns 消息列表
   */
  markdownToButton<T extends 'qq' | 'guild'> (
    type: T,
    button: ButtonElementType[],
    keyboard: KeyboardElementType[],
    markdown: MarkdownElementType[],
    markdownTpl: MarkdownTplElementType[]
  ): Array<T extends 'qq' ? SendQQMsg : SendGuildMsg> {
    const list: Array<SendGuildMsg | SendQQMsg> = []
    /** 统一按钮 */
    const rows: ReturnType<typeof karinToQQBot> = []
    if (button.length) {
      button.forEach((v) => {
        rows.push(...karinToQQBot(v))
      })
    }

    if (keyboard.length) {
      keyboard.forEach((v) => {
        rows.push(...karinToQQBot(v))
      })
    }

    markdown.forEach((v) => {
      const item = this.super.GuildMsgOptions('markdown', { content: v.markdown })
      if (rows.length) item.keyboard = { content: { rows } }
      list.push(item)
    })

    markdownTpl.forEach((v) => {
      const item = this.super.GuildMsgOptions('markdown', {
        custom_template_id: v.templateId,
        params: v.params
      })
      if (rows.length) item.keyboard = { content: { rows } }
      list.push(item)
    })

    return list as Array<T extends 'qq' ? SendQQMsg : SendGuildMsg>
  }

  /**
   * 处理文本 将文本中的链接转为二维码
   * @param text 文本
   * @returns 处理后的文本和二维码 二维码为不带`base64://`的字符串
   */
  async hendleText (text: string): Promise<{ text: string, qr: string | null }> {
    const urls = handleUrl(text)
    if (!urls.length) return { text, qr: null }

    urls.forEach((url) => {
      text = text.replace(new RegExp(url, 'g'), '[请扫码查看]')
    })

    const list = await qrs(urls)

    if (list.length === 1) return { text, qr: list[0] }
    const result = await common.mergeImage(list, 3)
    return { text, qr: result.base64 }
  }

  /**
   * 发送QQ私聊、群聊消息
   * @param contact 联系人
   * @param elements 消息元素
   * @param retryCount 重试次数
   */
  async sendQQMsg (
    contact: Contact<'friend'> | Contact<'group'>,
    elements: Array<ElementTypes>,
    retryCount?: number
  ): Promise<SendMsgResults> {
    const list = this.initList('qq')

    /** 上传富媒体的目标 */
    const target = contact.scene === 'friend' ? 'user' : 'group'

    for (const v of elements) {
      if (v.type === 'text') {
        const { text, qr } = await this.hendleText(v.text)
        list.content.push(text)
        if (qr) list.image.push(qr)
        continue
      }

      if (v.type === 'image') {
        list.image.push(v.file)
        continue
      }

      if (v.type === 'pasmsg') {
        if (v.source === 'event') list.pasmsg.type = 'event'
        list.pasmsg.msg_id = v.id
        continue
      }

      if (v.type === 'keyboard') {
        list.keyboard.push(v)
        continue
      }

      if (v.type === 'button') {
        list.button.push(v)
        continue
      }

      if (v.type === 'markdown') {
        list.markdown.push(v)
        continue
      }

      if (v.type === 'markdownTpl') {
        list.markdownTpl.push(v)
        continue
      }

      if (v.type === 'video' || v.type === 'record') {
        let url: string
        if (v.file.startsWith('http')) {
          url = v.file
        } else {
          const data = await fileToUrl(v.type, v.file, `${v.type}.${v.type === 'record' ? 'mp3' : 'mp4'}`)
          url = data.url
        }
        const res = await this.super.uploadMedia(target, contact.peer, v.type, url, false)
        list.list.push(this.super.QQdMsgOptions('media', res.file_info))
        continue
      }

      this.logger('debug', `[QQBot][${v.type}] 不支持发送的消息类型`)
    }

    if (list.content.length) {
      list.list.unshift(this.super.QQdMsgOptions('text', list.content.join('')))
    }

    for (const url of list.image) {
      const base64 = await common.base64(url)
      const result = await this.super.uploadMedia(target, contact.peer, 'image', base64, false)
      list.list.push(this.super.QQdMsgOptions('media', result.file_info))
    }

    /** 处理Markdown、按钮 */
    list.list.push(...this.markdownToButton('qq', list.button, list.keyboard, list.markdown, list.markdownTpl))

    /** 返回值 */
    const rawData = this.initSendMsgResults()

    /** 处理被动消息 */
    const pasmsg = (() => {
      if (!list.pasmsg.msg_id) return () => ''

      list.pasmsg.msg_seq++
      if (list.pasmsg.type === 'msg') {
        return (item: SendQQMsg) => {
          item.msg_seq = list.pasmsg.msg_seq
          item.msg_id = list.pasmsg.msg_id
        }
      }

      return (item: SendQQMsg) => {
        item.msg_seq = list.pasmsg.msg_seq
        item.event_id = list.pasmsg.msg_id
      }
    })()

    /** 发送消息 */
    const send = (() => {
      if (contact.scene === 'friend') {
        return (peer: string, item: SendQQMsg) => this.super.sendFriendMsg(peer, item)
      }

      return (peer: string, item: SendQQMsg) => this.super.sendGroupMsg(peer, item)
    })()

    for (const item of list.list) {
      pasmsg(item)
      const res = await send(contact.peer, item)
      rawData.rawData.push(res)
    }

    return this.handleResponse(rawData)
  }

  /**
   * 发送频道消息
   * @param contact 联系人
   * @param elements 消息元素
   * @param retryCount 重试次数
   */
  async sendGuildMsg (
    contact: Contact<'guild' | 'direct'>,
    elements: Array<ElementTypes>,
    retryCount?: number
  ): Promise<SendMsgResults> {
    const list = this.initList('guild')

    for (const v of elements) {
      if (v.type === 'text') {
        const { text, qr } = await this.hendleText(v.text)
        list.content.push(text)
        if (qr) list.image.push(qr)
        continue
      }

      if (v.type === 'image') {
        list.image.push(v.file)
        continue
      }

      if (v.type === 'at') {
        if (contact.scene === 'guild') list.content.push(v.targetId === 'all' ? '@everyone' : `<@${v.targetId}>`)
        continue
      }

      if (v.type === 'pasmsg') {
        if (v.source === 'event') list.pasmsg.type = 'event'
        list.pasmsg.msg_id = v.id
        continue
      }

      if (v.type === 'reply') {
        list.reply.message_id = v.messageId
        continue
      }

      if (v.type === 'face') {
        list.content.push(`<emoji:${v.id}>`)
        continue
      }

      if (v.type === 'keyboard') {
        list.keyboard.push(v)
        continue
      }

      if (v.type === 'button') {
        list.button.push(v)
        continue
      }

      if (v.type === 'markdown') {
        list.markdown.push(v)
        continue
      }

      if (v.type === 'markdownTpl') {
        list.markdownTpl.push(v)
        continue
      }

      this.logger('debug', `[QQBot][${v.type}] 不支持发送的消息类型`)
    }

    /** 情况较为复杂... */
    if (list.content.length) {
      if (list.imageUrls.length) {
        const url = list.imageUrls.shift()
        list.list.unshift(this.super.GuildMsgOptions('text', list.content.join(''), url))
      } if (list.imageFiles.length) {
        const buffer = await common.buffer(list.imageFiles.shift()!)
        const formData = new FormData()
        formData.append('content', list.content.join(''))
        formData.append('file_image', buffer)
        list.list.unshift(formData)
      } else {
        list.list.unshift(this.super.GuildMsgOptions('text', list.content.join('')))
      }
    }

    for (const url of list.imageUrls) {
      list.list.push(this.super.GuildMsgOptions('image', url))
    }

    for (const file of list.imageFiles) {
      const buffer = await common.buffer(file)
      const formData = new FormData()
      formData.append('file_image', buffer)
      list.list.push(formData)
    }

    /** 处理Markdown、按钮 */
    list.list.push(...this.markdownToButton('guild', list.button, list.keyboard, list.markdown, list.markdownTpl))
    const rawData = this.initSendMsgResults()

    /** 发送消息 */
    const send = (() => {
      if (contact.scene === 'guild') {
        return (peer: string, subPeer: string, item: SendGuildMsg | FormData) => this.super.sendChannelMsg(peer, item)
      }

      return (peer: string, subPeer: string, item: SendGuildMsg | FormData) => this.super.sendDmsMsg(peer, subPeer, item)
    })()

    /** 处理被动消息 */
    const pasmsg = (() => {
      if (!list.pasmsg.msg_id) return () => ''

      if (list.pasmsg.type === 'msg') {
        return (item: SendGuildMsg | FormData) => {
          if (item instanceof FormData) {
            return item.append('msg_id', list.pasmsg.msg_id)
          }

          item.msg_id = list.pasmsg.msg_id
        }
      }

      return (item: SendGuildMsg | FormData) => {
        if (item instanceof FormData) {
          return item.append('event_id', list.pasmsg.msg_id)
        }

        item.event_id = list.pasmsg.msg_id
      }
    })()

    for (const item of list.list) {
      pasmsg(item)
      const res = await send(contact.peer, contact.subPeer, item)
      rawData.rawData.push(res)
    }

    return this.handleResponse(rawData)
  }
}
