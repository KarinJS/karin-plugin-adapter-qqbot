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
      return this.#sendGuildMsg(contact, elements, retryCount)
    } else if (contact.scene === 'group' || contact.scene === 'friend') {
      return this.#sendQQMsg(contact, elements, retryCount)
    }

    // const pasmsg: {
    //   type: 'msg' | 'event',
    //   id: string,
    //   msg_seq: number
    // } = { type: 'msg', id: '', msg_seq: random(1, 9999999) }

    // const list = []
    // const content: string[] = []

    // /**
    //  * 上传图片
    //  * @param base64 图片base64
    //  */
    // const uploadImage = async (base64: string) => {
    //   const type = `${contact.scene}` as Scene
    //   const res = await this.super.uploadMedia(type, contact.peer, 'image', base64, false)
    //   list.push(this.super.QQdMsgOptions('media', res.file_info))
    // }

    // /**
    //  * 处理文本
    //  * @param text 文本
    //  */
    // const text = async (text: string) => {
    //   const urls = handleUrl(text)
    //   if (urls.length) {
    //     const qr = await qrs(urls)
    //     if (qr.length === 1) {
    //       await uploadImage(qr[0])
    //     } else {
    //       const result = await common.mergeImage(qr, 3)
    //       await uploadImage(result.base64)
    //     }

    //     urls.forEach((url) => {
    //       text = text.replace(url, '[请扫码查看]')
    //     })
    //   }

    //   content.push(text)
    // }

    // for (const v of elements) {
    //   switch (v.type) {
    //     case 'text': {
    //       await text(v.text)
    //       break
    //     }
    //     case 'image': {
    //       // TODO: 频道图片
    //       const base64 = await common.base64(v.file)
    //       await uploadImage(base64)
    //       break
    //     }
    //     case 'at': {
    //       // if (contact.scene !== 'guild') break
    //       content.push(v.targetId === 'all' ? '@everyone' : `<@${v.targetId}>`)
    //       break
    //     }
    //     case 'face': {
    //       // if (contact.scene !== 'guild') break
    //       content.push(`<emoji:${v.id}>`)
    //       break
    //     }
    //     case 'pasmsg': {
    //       pasmsg.id = v.id
    //       break
    //     }
    //     case 'video':
    //     case 'record':
    //     case 'keyboard':
    //     case 'button':
    //     case 'markdown':
    //     case 'markdownTpl':
    //       break
    //   }
    // }

    const result: SendMsgResults = {
      messageId: '',
      message_id: '',
      messageTime: 0,
      rawData: []
    }

    const rawData: any[] = []
    // list.unshift(this.super.QQdMsgOptions('text', content.join('')))

    // for (const item of list) {
    //   let res
    //   if (pasmsg.id) {
    //     pasmsg.msg_seq++
    //     item.msg_seq = pasmsg.msg_seq
    //     pasmsg.type === 'msg' ? item.msg_id = pasmsg.id : item.event_id = pasmsg.id
    //   }

    //   if (contact.scene === 'group') {
    //     res = await this.super.sendGroupMsg(contact.peer, item)
    //   } else if (contact.scene === 'friend') {
    //     res = await this.super.sendPrivateMsg(contact.peer, item)
    //   }

    //   rawData.push(res)
    // }

    const { id, timestamp } = rawData[0]
    result.messageId = id
    result.message_id = id
    result.messageTime = timestamp
    result.rawData = rawData
    return result
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
  async #sendQQMsg (
    contact: Contact<'friend'> | Contact<'group'>,
    elements: Array<ElementTypes>,
    retryCount?: number
  ): Promise<SendMsgResults> {
    const pasmsg: {
      type: 'msg' | 'event',
      id: string,
      msg_seq: number
    } = { type: 'msg', id: '', msg_seq: random(1, 9999999) }

    /** 文本消息 */
    const content: string[] = []
    /** 图片消息 */
    const image: string[] = []
    /** 多行按钮 */
    const keyboard: KeyboardElementType[] = []
    /** 单行按钮 */
    const button: ButtonElementType[] = []
    /** markdown消息 */
    const markdown: MarkdownElementType[] = []
    /** markdown模板消息 */
    const markdownTpl: MarkdownTplElementType[] = []

    /** 待发送列表 */
    const list: SendQQMsg[] = []
    /** 上传富媒体的目标 */
    const target = contact.scene === 'friend' ? 'user' : 'group'

    for (const v of elements) {
      switch (v.type) {
        case 'text': {
          const { text, qr } = await this.hendleText(v.text)
          content.push(text)
          if (qr) image.push(qr)
          break
        }
        case 'image': {
          image.push(v.file)
          break
        }
        case 'pasmsg': {
          pasmsg.id = v.id
          break
        }
        case 'keyboard': {
          keyboard.push(v)
          break
        }
        case 'button': {
          button.push(v)
          break
        }
        case 'markdown':
          markdown.push(v)
          break
        case 'markdownTpl':
          markdownTpl.push(v)
          break
        case 'video':
        case 'record': {
          let url: string
          if (v.file.startsWith('http')) {
            url = v.file
          } else {
            const data = await fileToUrl(v.type, v.file, `${v.type}.${v.type === 'record' ? 'mp3' : 'mp4'}`)
            url = data.url
          }
          const res = await this.super.uploadMedia(target, contact.peer, v.type, url, false)
          list.push(this.super.QQdMsgOptions('media', res.file_info))
          break
        }
        default: {
          this.logger('debug', `[QQBot][${v.type}] 不支持发送的消息类型`)
          break
        }
      }
    }

    if (content.length) {
      list.unshift(this.super.QQdMsgOptions('text', content.join('')))
    }

    for (const url of image) {
      const base64 = await common.base64(url)
      const result = await this.super.uploadMedia(target, contact.peer, 'image', base64, false)
      list.push(this.super.QQdMsgOptions('media', result.file_info))
    }

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
      const item = this.super.QQdMsgOptions('markdown', { content: v.markdown })
      if (rows.length) item.keyboard = { content: { rows } }
      list.push(item)
    })

    markdownTpl.forEach((v) => {
      const item = this.super.QQdMsgOptions('markdown', {
        custom_template_id: v.templateId,
        params: v.params
      })
      if (rows.length) item.keyboard = { content: { rows } }
      list.push(item)
    })

    const rawData: SendMsgResults = {
      messageId: '',
      message_id: '',
      messageTime: 0,
      rawData: []
    }

    for (const item of list) {
      if (pasmsg.id) {
        pasmsg.msg_seq++
        item.msg_seq = pasmsg.msg_seq
        pasmsg.type === 'msg' ? item.msg_id = pasmsg.id : item.event_id = pasmsg.id
      }

      if (contact.scene === 'group') {
        const res = await this.super.sendGroupMsg(contact.peer, item)
        rawData.rawData.push(res)
      } else if (contact.scene === 'friend') {
        const res = await this.super.sendPrivateMsg(contact.peer, item)
        rawData.rawData.push(res)
      }
    }

    const { id, timestamp } = rawData.rawData[0]
    rawData.messageId = id
    rawData.message_id = id
    rawData.messageTime = timestamp
    rawData.messageTime = new Date(timestamp).getTime()
    return rawData
  }

  /**
   * 发送频道消息
   * @param contact 联系人
   * @param elements 消息元素
   * @param retryCount 重试次数
   */
  async #sendGuildMsg (
    contact: Contact<'guild' | 'direct'>,
    elements: Array<ElementTypes>,
    retryCount?: number
  ): Promise<SendMsgResults> {
    /** 用于将消息转为被动消息 */
    const pasmsg: { type: 'msg' | 'event', id: string, } = { type: 'msg', id: '' }
    /** 引用回复 */
    const reply = { message_id: '' }
    /** 网络图片 */
    const imageUrl: string[] = []
    /** 文件图片 */
    const imageFile: string[] = []
    /** 文本消息 */
    const content: string[] = []
    /** 多行按钮 */
    const keyboard: KeyboardElementType[] = []
    /** 单行按钮 */
    const button: ButtonElementType[] = []
    /** markdown消息 */
    const markdown: MarkdownElementType[] = []
    /** markdown模板消息 */
    const markdownTpl: MarkdownTplElementType[] = []

    /** 待发送列表 */
    const list: Array<SendGuildMsg | FormData> = []

    for (const v of elements) {
      switch (v.type) {
        case 'text': {
          const { text, qr } = await this.hendleText(v.text)
          content.push(text)
          if (qr) imageFile.push(qr)
          break
        }
        case 'image': {
          v.file.startsWith('http') ? imageUrl.push(v.file) : imageFile.push(v.file)
          break
        }
        case 'at': {
          if (contact.scene === 'guild') content.push(v.targetId === 'all' ? '@everyone' : `<@${v.targetId}>`)
          break
        }
        case 'pasmsg': {
          pasmsg.id = v.id
          break
        }
        case 'reply': {
          reply.message_id = v.messageId
          break
        }
        case 'face': {
          content.push(`<emoji:${v.id}>`)
          break
        }
        case 'keyboard': {
          keyboard.push(v)
          break
        }
        case 'button': {
          button.push(v)
          break
        }
        case 'markdown':
          markdown.push(v)
          break
        case 'markdownTpl':
          markdownTpl.push(v)
          break
        default: {
          this.logger('debug', `[QQBot][${v.type}] 不支持发送的消息类型`)
          break
        }
      }
    }

    /** 情况较为复杂... */
    if (content.length) {
      if (imageUrl.length) {
        const url = imageUrl.shift()
        list.unshift(this.super.GuildMsgOptions('text', content.join(''), url))
      } if (imageFile.length) {
        const buffer = await common.buffer(imageFile.shift()!)
        const formData = new FormData()
        formData.append('content', content.join(''))
        formData.append('file_image', buffer)
        list.unshift(formData)
      } else {
        list.unshift(this.super.GuildMsgOptions('text', content.join('')))
      }
    }

    for (const url of imageUrl) {
      list.push(this.super.GuildMsgOptions('image', url))
    }

    for (const file of imageFile) {
      const buffer = await common.buffer(file)
      const formData = new FormData()
      formData.append('file_image', buffer)
      list.push(formData)
    }

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

    const rawData: SendMsgResults = {
      messageId: '',
      message_id: '',
      messageTime: 0,
      rawData: []
    }

    for (const item of list) {
      if (pasmsg.id) {
        if (item instanceof FormData) {
          pasmsg.type === 'msg' ? item.append('msg_id', pasmsg.id) : item.append('event_id', pasmsg.id)
        } else {
          pasmsg.type === 'msg' ? item.msg_id = pasmsg.id : item.event_id = pasmsg.id
        }
      }

      if (contact.scene === 'guild') {
        const res = await this.super.sendChannelMsg(contact.peer, item)
        rawData.rawData.push(res)
      } else if (contact.scene === 'direct') {
        const res = await this.super.sendDmsMsg(contact.peer, contact.subPeer, item)
        rawData.rawData.push(res)
      }
    }

    // ISO8601 timestamp
    const { id, timestamp } = rawData.rawData[0]
    rawData.messageId = id
    rawData.message_id = id
    rawData.messageTime = timestamp
    rawData.messageTime = new Date(timestamp).getTime()
    return rawData
  }
}
