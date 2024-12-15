import FormData from 'form-data'
import { QQBotApi } from '@/core/api'
import { AdapterBase, logger, } from 'node-karin'
import { SendGuildMsg, SendQQMsg } from '@/core/api/types'
import type {
  LoggerLevel,
  ButtonElementType,
  KeyboardElementType,
  MarkdownElementType,
  MarkdownTplElementType,
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
