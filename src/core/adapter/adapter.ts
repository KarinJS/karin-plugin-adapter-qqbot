import { QQBotApi } from '@/core/api'
import { handleUrl, qrs, random } from '@/utils/common'
import { AdapterBase, common, Contact, ElementTypes, logger, SendMsgResults } from 'node-karin'

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
}

/** 非markdown */
export class AdapterQQBotText extends AdapterQQBot {
  async sendMsg (contact: Contact, elements: Array<ElementTypes>, retryCount?: number): Promise<SendMsgResults> {
    const pasmsg = { msg_id: '', msg_seq: random(1, 9999999) }
    const list = []
    const content: string[] = []

    /**
     * 上传图片
     * @param base64 图片base64
     */
    const uploadImage = async (base64: string) => {
      const type = `${contact.scene}s` as any
      const res = await this.super.uploadMedia(type, contact.peer, 'image', base64, false)
      list.push(this.super.createQQSendMsgOptions('media', res.file_info))
    }

    /**
     * 处理文本
     * @param text 文本
     */
    const text = async (text: string) => {
      const urls = handleUrl(text)
      if (urls.length) {
        const qr = await qrs(urls)
        if (qr.length === 1) {
          await uploadImage(qr[0])
        } else {
          const result = await common.mergeImage(qr, 3)
          await uploadImage(result.base64)
        }

        urls.forEach((url) => {
          text = text.replace(url, '[请扫码查看]')
        })
      }

      content.push(text)
    }

    for (const element of elements) {
      switch (element.type) {
        case 'at':
          break
        case 'text': {
          await text(element.text)
          break
        }
        case 'image': {
          // TODO: 频道图片
          const base64 = await common.base64(element.file)
          await uploadImage(base64)
          break
        }
        case 'pasmsg': {
          pasmsg.msg_id = element.id
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
    list.unshift(this.super.createQQSendMsgOptions('text', content.join('')))

    await Promise.all(list.map(async (item) => {
      try {
        let res
        if (pasmsg.msg_id) {
          pasmsg.msg_seq++
          item.msg_id = pasmsg.msg_id
          item.msg_seq = pasmsg.msg_seq
        }

        if (contact.scene === 'group') {
          res = await this.super.sendGroupMsg(contact.peer, item)
        } else if (contact.scene === 'friend') {
          res = await this.super.sendPrivateMsg(contact.peer, item)
        }

        rawData.push(res)
      } catch (error) {
        logger.error(error)
      }
    }))

    const { id, timestamp } = rawData[0]
    result.messageId = id
    result.message_id = id
    result.messageTime = timestamp
    result.rawData = rawData
    return result
  }
}
