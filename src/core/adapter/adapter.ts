import FormData from 'form-data'
import { QQBotApi } from '@/core/api'
import { random } from '@/utils/common'
import { SendGuildMsg, SendQQMsg } from '@/core/api/types'
import { AdapterBase, logger, karinToQQBot } from 'node-karin'
import type {
  LoggerLevel,
  ButtonElementType,
  KeyboardElementType,
  MarkdownElementType,
  MarkdownTplElementType,
  SendMsgResults,
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
}
