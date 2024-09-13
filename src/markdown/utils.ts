import qrcode from 'qrcode'
import { common } from '@/utils'
import { FileType, MessageReference, PathType, SendChannelMessageOptions } from '@/types'
import { ButtonElement, ButtonType, Contact, handler, KarinElement, KeyBoardElement, ReplyReturn, Scene, segment, TplMarkdownElement } from 'node-karin'
import { AdapterQQBot } from '@/core'

/** 转换方式枚举 */
export const enum ParseType {
  /** link */
  Link = 'link',
  /** 二维码 */
  QR = 'qr',
  /** 按钮 */
  Button = 'button',
}

export class ParseMessage {
  /**
   * 处理文本
   * 1. 提取url转按钮
   * 2. 去除AT全体
   * 3. c2c下去除at
   * 4. 替换换行符\n为\r
   * @param text - 文本
   * @param isPrivate - 是否是C2C
   */
  async parseText (text: string, isPrivate = false) {
    const { text: cotent, button } = common.textToButton(text)
    text = common.formatText(cotent, isPrivate)
    return { text, button }
  }

  /**
   * 处理AT
   * 好友、频道私信下不支持at
   * @param user_id - 用户ID
   * @param isPrivate - 消息类型
   */
  async parseAt (user_id: string, isPrivate: boolean = false) {
    if (isPrivate) return ''
    return `<qqbot-at-user id="${user_id}" />`
  }

  /**
   * 图片转url
   */
  async parseImage (file: string | Buffer) {
    const { url, width, height } = await handler.call('qqbot.files', { file, type: 'image', name: '0.png' })
    return { url, width, height } as { url: string, width: number, height: number }
  }

  /**
   * 语音转silk、url
   */
  async parseRecord (file: string, type: ParseType = ParseType.Link) {
    if (ParseType.Link === type) {
      const { url } = await handler.call('qqbot.files', { file, type: 'record', name: '0.mp3' })
      return { type: ParseType.Link, data: url }
    }

    const silk = await common.voiceToSilk(file)
    const { url } = await handler.call('qqbot.files', { file: silk, type: 'record', name: '0.silk' })
    /** 转按钮 */
    if (type === ParseType.Button) {
      return { type: ParseType.Button, data: segment.button({ text: '点击在线播放语音', link: url }) }
    } else {
      const data = await qrcode.toBuffer(url)
      const { url: qrUrl } = await this.parseImage(data)
      return { type: ParseType.QR, data: qrUrl }
    }
  }

  /**
   * 视频转url
   * @param file - 视频路径
   * @param 是否强制转换HTTP
   */
  async parseVideo (file: string, isForceHttp: boolean, type: ParseType = ParseType.Link) {
    /** http链接 */
    if (file.startsWith('http') && !isForceHttp && type === ParseType.Link) return { type: 'video', url: file }
    const { url } = await handler.call('qqbot.files', { file, type: 'video', name: '0.mp4' })
    /** 转按钮 */
    if (type === ParseType.Button) {
      return { type: ParseType.Button, data: segment.button({ text: '点击在线观看视频', link: url }) }
    } else if (type === ParseType.QR) {
      const data = await qrcode.toBuffer(url)
      const { url: qrUrl } = await this.parseImage(data)
      return { type: ParseType.QR, data: qrUrl }
    } else {
      return { type: ParseType.Link, data: url }
    }
  }

  /**
   * 文件转url
   * @param file - 文件路径
   * @param type - 转换方式
   */
  async parseFile (file: string, type: ParseType = ParseType.Link) {
    const { url } = await handler.call('qqbot.files', { file, type: 'file', name: '0.file' })
    if (ParseType.Link === type) {
      return { type: ParseType.Link, data: url }
    } else if (ParseType.Button === type) {
      return { type: ParseType.Button, data: segment.button({ text: '点击下载文件', link: url }) }
    } else {
      const data = await qrcode.toBuffer(url)
      const { url: qrUrl } = await this.parseImage(data)
      return { type: ParseType.QR, data: qrUrl }
    }
  }

  /**
   * 发送多媒体消息
   */
  async sendMedia (bot: AdapterQQBot, url: string, type: PathType, openid: string, FileType: FileType, message_id?: string, seq?: number) {
    const { file_info } = await bot.super.uploadMedia(openid, type, url, FileType)
    const opt = bot.super.buildMedia(file_info, message_id, seq)
    const result = type === PathType.Channels ? await bot.super.sendChannelText(openid, opt as SendChannelMessageOptions) : await bot.super.sendMessage(openid, type, opt)
    return result
  }

  /**
   * 发送消息
   * @param bot - 机器人实例
   * @param contact - 发送对象
   * @param elements - 消息元素
   */
  async SendMessage (bot: AdapterQQBot, contact: Contact, elements: Array<KarinElement>) {
    let message_id = ''
    let MessageReference: MessageReference | undefined
    let seq = common.random(100, 999999)
    const message: ElementList[] = []
    const markdown: MarkdownList[] = []
    const buttons: Array<ButtonElement | KeyBoardElement> = []

    const isPrivate = contact.scene === Scene.Private
    await Promise.all(elements.map(async (element, index) => {
      switch (element.type) {
        case 'text': {
          const { text, button } = await this.parseText(element.text, isPrivate)
          message.push({ index, type: 'text', data: text })
          if (button) buttons.push(...button)
          break
        }
        case 'at': {
          const at = await this.parseAt(element.uid, isPrivate)
          message.push({ index, type: 'at', data: at })
          break
        }
        case 'video': {
          const { data } = await this.parseVideo(element.file, false)
          message.push({ index, type: 'video', data })
          break
        }
        case 'record': {
          const { data } = await this.parseRecord(element.file)
          message.push({ index, type: 'record', data })
          break
        }
        case 'image': {
          const { url, width, height } = await this.parseImage(element.file)
          message.push({ index, type: 'image', data: `![img #${width}px #${height}px](${url})` })
          break
        }
        case 'markdown': {
          markdown.push({ index, type: 'markdown', data: element.content })
          break
        }
        case 'markdown_tpl': {
          markdown.push({ index, type: 'markdown_tpl', data: element })
          break
        }
        case 'button':
        case 'keyboard': {
          buttons.push(element)
          break
        }
        case 'passive_reply': {
          message_id = element.id
          break
        }
        case 'reply': {
          MessageReference = {
            message_id: element.message_id,
            ignore_get_message_error: false,
          }
          break
        }
      }
    }))

    const rows: { buttons: Array<ButtonType> }[] = []

    /** 先处理按钮 */
    if (buttons.length) {
      buttons.forEach(v => {
        const button = common.buttonToQQBot(v)
        rows.push(...button)
      })
    }

    const keyboard = rows.length ? { content: { rows } } : undefined
    /** 排序message */
    message.sort((a, b) => a.index - b.index)
    const parseScene = this.parseScene(contact.scene)

    /** 请求结果 */
    const result: ReplyReturn = {
      message_id: '',
      message_time: 0,
      raw_data: [],
    }

    const content: string[] = []
    for (const item of message) {
      if (item.type === 'record' || item.type === 'video') {
        const res = await this.sendMedia(bot, item.data, parseScene, contact.peer, item.type === 'record' ? FileType.Record : FileType.Video, message_id, ++seq)
        result.raw_data.push(res)
      } else {
        content.push(item.data)
      }
    }

    if (content.length) {
      const text = content.join('')
      const opt = bot.super.buildRawMarkdown(text, keyboard, MessageReference, message_id, ++seq)
      if (parseScene === PathType.Channels) {
        const res = await bot.super.sendChannelText(contact.peer, opt)
        result.raw_data.push(JSON.parse(res.body))
      } else {
        const res = await bot.super.sendMessage(contact.peer, parseScene, opt)
        result.raw_data.push(res)
      }
    }

    for (const item of markdown) {
      if (item.type === 'markdown_tpl') {
        const opt = bot.super.buildTplMarkdown(item.data.custom_template_id, item.data.params, keyboard, message_id, ++seq)
        if (parseScene === PathType.Channels) {
          const res = await bot.super.sendChannelText(contact.peer, opt)
          result.raw_data.push(JSON.parse(res.body))
        } else {
          const res = await bot.super.sendMessage(contact.peer, parseScene, opt)
          result.raw_data.push(res)
        }
      } else {
        const opt = bot.super.buildRawMarkdown(item.data, keyboard, MessageReference, message_id, ++seq)
        if (parseScene === PathType.Channels) {
          const res = await bot.super.sendChannelText(contact.peer, opt)
          result.raw_data.push(JSON.parse(res.body))
        } else {
          const res = await bot.super.sendMessage(contact.peer, parseScene, opt)
          result.raw_data.push(res)
        }
      }
    }

    result.message_id = result.raw_data[0].id
    result.message_time = result.raw_data[0]?.time || result.raw_data[0]?.timestamp
    return result
  }

  /**
   * karin场景转换为QQBot场景
   * @param scene - 场景
   */
  parseScene (scene: `${Scene}`): PathType {
    switch (scene) {
      case Scene.Group: return PathType.Groups
      case Scene.Private: return PathType.Friends
      case Scene.Guild: return PathType.Channels
      case Scene.GuildPrivate: return PathType.Dms
      default: {
        throw new Error('未知场景')
      }
    }
  }

  /**
   * QQBot场景转换为karin场景
   */
  parseSceneToKarin (scene: PathType): `${Scene}` {
    switch (scene) {
      case PathType.Groups: return Scene.Group
      case PathType.Friends: return Scene.Private
      case PathType.Channels: return Scene.Guild
      case PathType.Dms: return Scene.GuildPrivate
      default: {
        throw new Error('未知场景')
      }
    }
  }
}

export const parseMessage = new ParseMessage()

export interface Text { index: number, type: 'text', data: string }
export interface At { index: number, type: 'at', data: string }
export interface Image { index: number, type: 'image', data: string }
export interface Record { index: number, type: 'record', data: string }
export interface Video { index: number, type: 'video', data: string }
export type ElementList = Text | At | Image | Record | Video

export interface Markdown { index: number, type: 'markdown', data: string }
export interface MarkdownTpl { index: number, type: 'markdown_tpl', data: TplMarkdownElement }
export type MarkdownList = Markdown | MarkdownTpl
