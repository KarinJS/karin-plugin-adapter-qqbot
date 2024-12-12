import { QQBotApi } from './api'
import { AdapterBase, common, Contact, ElementTypes, logger, SendMsgResults } from 'node-karin'

export class AdapterQQBot extends AdapterBase {
  public super: QQBotApi
  constructor (QQBot: QQBotApi) {
    super()
    this.super = QQBot
    this.adapter.name = '@karinjs/qqbot'
    this.adapter.protocol = 'qqbot'
    this.adapter.platform = 'qq'
    this.adapter.standard = 'unknown'
  }
}

/** 非markdown */
export class AdapterQQBotText extends AdapterQQBot {
  async sendMsg (contact: Contact, elements: Array<ElementTypes>, retryCount?: number): Promise<SendMsgResults> {
    const content: string[] = []
    const list = []

    for (const element of elements) {
      switch (element.type) {
        case 'at':
          content.push(`<qqbot-at-user id="${element.targetId}" />`)
          break
        case 'text':
          // TODO: 需要处理换行符、@everyone等
          content.push(element.text)
          break
        case 'image': {
          // TODO: 频道图片
          const base64 = await common.base64(element.file)
          const type = `${contact.scene}s` as any
          const res = await this.super.uploadMedia(type, contact.peer, 'image', base64, false)
          list.push(this.super.createQQSendMsgOptions('media', res.file_info))
          break
        }
      }
    }

    const result: SendMsgResults = {
      messageId: '',
      message_id: '',
      messageTime: 0,
      rawData: []
    }

    const rawData: any[] = []

    if (contact.scene === 'group') {
      list.unshift(this.super.createQQSendMsgOptions('text', content.join('')))

      await Promise.allSettled(list.map(async (item) => {
        try {
          const res = await this.super.sendGroupMsg(contact.peer, item)
          rawData.push(res)
          result.messageId = res.id
          result.message_id = res.id
          result.messageTime = res.timestamp
        } catch (error) {
          logger.error(error)
        }
      }))
    } else if (contact.scene === 'friend') {
      list.unshift(this.super.createQQSendMsgOptions('text', content.join('')))

      await Promise.allSettled(list.map(async (item) => {
        try {
          const res = await this.super.sendPrivateMsg(contact.peer, item)
          rawData.push(res)
        } catch (error) {
          logger.error(error)
        }
      }))
    }

    const { id, timestamp } = rawData[0]
    result.messageId = id
    result.message_id = id
    result.messageTime = timestamp
    result.rawData = rawData
    return result
  }
}
