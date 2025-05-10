import FormData from 'form-data'
import { handleUrl, qrs, textToButton } from '@/utils/common'
import { common, fileToUrl, buttonHandle } from 'node-karin'
import { AdapterQQBot } from '@/core/adapter/adapter'
import { SendGuildMsg, SendQQMsg } from '@/core/api/types'
import type { QQBotApi } from '@/core/api'
import type { Contact, ElementTypes, Message, SendMsgResults } from 'node-karin'
import type { RawMarkdown } from '@/core/adapter/handler'
import type { QQBotConfig } from '@/types/config'

/** markdown */
export class AdapterQQBotMarkdown extends AdapterQQBot {
  _config: QQBotConfig
  markdown: RawMarkdown
  constructor (QQBot: QQBotApi, markdown: RawMarkdown, config: QQBotConfig) {
    super(QQBot)
    this.markdown = markdown
    this._config = config
  }

  async srcReply (e: Message, elements: ElementTypes[]) {
    const list = await buttonHandle(e.msg, { e })
    return this.sendMsg(e.contact, [...elements, ...list])
  }

  async sendMsg (contact: Contact, elements: Array<ElementTypes>, retryCount?: number): Promise<SendMsgResults> {
    if (contact.scene === 'direct' || contact.scene === 'guild') {
      return this.sendGuildMsg(contact, elements, retryCount)
    } else if (contact.scene === 'group' || contact.scene === 'friend') {
      return this.sendQQMsg(contact, elements, retryCount)
    }

    throw new Error('不支持的消息类型')
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
        const { text, buttons } = textToButton(v.text, contact.scene === 'friend')
        list.content.push(text)
        if (buttons) list.button.push(...buttons)
        continue
      }

      if (v.type === 'at') {
        if (contact.scene === 'friend') continue
        list.content.push(v.targetId === 'all' ? '<qqbot-at-everyone />' : `<qqbot-at-user id="${v.targetId}" />`)
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

    return this.markdown('qq', this, list, contact, pasmsg, send)
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
        const { text, buttons } = textToButton(v.text, contact.scene === 'direct')
        list.content.push(text)
        if (buttons) list.button.push(...buttons)
        continue
      }

      if (v.type === 'image') {
        list.image.push(v.file)
        continue
      }

      if (v.type === 'at') {
        if (contact.scene === 'guild') {
          list.content.push(v.targetId === 'all' ? '<qqbot-at-everyone />' : `<qqbot-at-user id="${v.targetId}" />`)
        }
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

    /** 发送消息 */
    const send = (() => {
      if (contact.scene === 'guild') {
        return (
          peer: string,
          subPeer: string,
          item: SendGuildMsg | FormData
        ) => this.super.sendChannelMsg(subPeer, item)
      }

      return (
        peer: string,
        subPeer: string,
        item: SendGuildMsg | FormData
      ) => this.super.sendDmsMsg(peer, item)
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

    return this.markdown('guild', this, list, contact, pasmsg, send)
  }
}
