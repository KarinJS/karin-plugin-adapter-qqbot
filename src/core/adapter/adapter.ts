import FormData from 'form-data'
import { QQBotApi } from '@/core/api'
import { random } from '@/utils/common'
import { AdapterBase, logger, karinToQQBot } from 'node-karin'
import type {
  SendGuildMsg,
  SendGuildResponse,
  SendQQMsg,
  SendQQMsgResponse,
} from '@/core/api/types'
import type {
  LogMethodNames,
  ButtonElement,
  KeyboardElement,
  MarkdownElement,
  MarkdownTplElement,
  SendMsgResults,
  Contact,
} from 'node-karin'

/** 发送函数所需参数 */
export type Options<T extends 'qq' | 'guild'> = T extends 'qq' ? SendQQMsg : SendGuildMsg | FormData

/** QQ发送消息函数类型 */
export type QQSend = (
  peer: string,
  item: SendQQMsg
) => Promise<SendQQMsgResponse>

/** 频道发送消息函数类型 */
export type GuildSend = (peer: string,
  subPeer: string,
  item: SendGuildMsg | FormData
) => Promise<SendGuildResponse>

export type Pasmsg<T extends 'qq' | 'guild'> = {
  type: 'msg' | 'event',
  msg_id: string,
  msg_seq: T extends 'qq' ? number : never
}
export interface Grouping<T extends 'qq' | 'guild'> {
  /** 文本 */
  content: string[]
  /** 图片 QQ专属 */
  image: string[]
  /** 单行按钮 */
  button: ButtonElement[]
  /** 多行按钮 */
  keyboard: KeyboardElement[]
  /** markdown */
  markdown: MarkdownElement[]
  /** markdown模板 */
  markdownTpl: MarkdownTplElement[]
  /** 频道专属 图片url */
  imageUrls: string[]
  /** 频道专属 图片file */
  imageFiles: string[]
  /** 引用回复 频道专属 */
  reply: { message_id: string }
  /** pasmsg */
  pasmsg: Pasmsg<T>
  /** 代发送列表 */
  list: Array<Options<T>>
  /**
   * 处理按钮、markdown
   * 统一格式后推入待发送消息列表
   * @param type 构建类型
   * @param list 分类列表
   * @returns
   */
  markdownToButton: (type: T, list: Grouping<T>) => void
}

/**
 * @adaoter QQBot
 * @version 1.8.0
 */
export abstract class AdapterQQBot extends AdapterBase {
  public super: QQBotApi
  constructor (QQBot: QQBotApi) {
    super()
    this.super = QQBot
    this.adapter.name = '@karinjs/qqbot'
    this.adapter.protocol = 'qqbot'
    this.adapter.platform = 'qq'
    this.adapter.standard = 'other'
  }

  logger (level: LogMethodNames, ...args: any[]) {
    logger.bot(level, this.selfId, ...args)
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
   * 撤回消息
   * @param contact 联系人
   * @param messageId 消息id
   */
  async recallMsg (contact: Contact, messageId: string): Promise<void> {
    try {
      if (contact.scene === 'friend') {
        await this.super.recallMsg('user', contact.peer, messageId)
        return
      }

      if (contact.scene === 'group') {
        await this.super.recallMsg('group', contact.peer, messageId)
        return
      }

      if (contact.scene === 'direct') {
        await this.super.recallMsg('dms', contact.peer, messageId)
        return
      }

      if (contact.scene === 'guild') {
        await this.super.recallMsg('channels', contact.peer, messageId)
        return
      }
    } catch (error) {
      logger.error('撤回消息失败:', error)
    }
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
      list: [],
      markdownToButton: (
        type: T,
        list: Grouping<T>
      ) => this.markdownToButton(type, list),
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
      time: 0,
      messageTime: 0,
      rawData: [],
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
   * - 处理按钮、markdown
   * - 统一格式后推入待发送消息列表
   * @param type 消息类型
   * @param button 按钮
   * @param keyboard 键盘
   * @param markdown markdown
   * @param markdownTpl markdown模板
   * @returns 消息列表
   */
  markdownToButton<T extends 'qq' | 'guild'> (
    type: T,
    list: Grouping<T>
  ) {
    /** 统一按钮 */
    const rows: ReturnType<typeof karinToQQBot> = []
    if (list.button.length) {
      list.button.forEach((v) => {
        rows.push(...karinToQQBot(v))
      })
    }

    if (list.keyboard.length) {
      list.keyboard.forEach((v) => {
        rows.push(...karinToQQBot(v))
      })
    }

    list.markdown.forEach((v) => {
      const item = type === 'guild' ? this.super.GuildMsgOptions('markdown', { content: v.markdown }) : this.super.QQdMsgOptions('markdown', { content: v.markdown })
      if (rows.length) item.keyboard = { content: { rows } }
      list.list.push(item as T extends 'qq' ? SendQQMsg : FormData | SendGuildMsg)
    })

    list.markdownTpl.forEach((v) => {
      const item = type === 'guild'
        ? this.super.GuildMsgOptions('markdown', {
          custom_template_id: v.templateId,
          params: v.params,
        })
        : this.super.QQdMsgOptions('markdown', {
          custom_template_id: v.templateId,
          params: v.params,
        })
      if (rows.length) item.keyboard = { content: { rows } }
      list.list.push(item as T extends 'qq' ? SendQQMsg : FormData | SendGuildMsg)
    })
  }
}
