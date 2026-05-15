import { AdapterBase, logger, buttonHandle } from 'node-karin'
import { QQBotApi } from '@/core/api'
import { sendQQ } from './pipeline-qq'
import { sendGuild } from './pipeline-guild'
import type {
  LogMethodNames, Contact, ElementTypes, Message, SendMsgResults,
} from 'node-karin'
import type { QQBotConfig } from '@/types/config'

/**
 * QQ Official Bot 适配器（合并 normal + markdown）
 *
 * 由配置 `markdown.enable` / `keyboard.enable` 与元素中是否存在 markdown
 * 决定发送路径（详见 pipeline-qq / pipeline-guild）
 */
export class AdapterQQBot extends AdapterBase {
  /** 与官方 API 交互 */
  public super: QQBotApi
  /** 当前 bot 配置 */
  public cfg: QQBotConfig

  constructor (cfg: QQBotConfig, api: QQBotApi) {
    super()
    this.cfg = cfg
    this.super = api
    this.adapter.name = 'QQ Official Bot'
    this.adapter.protocol = 'qqbot'
    this.adapter.platform = 'qq'
    this.adapter.standard = 'other'
  }

  logger (level: LogMethodNames, ...args: any[]) {
    logger.bot(level, this.selfId, ...args)
  }

  /**
   * 主消息回复入口（karin 调用）
   */
  async srcReply (e: Message, elements: ElementTypes[]): Promise<SendMsgResults> {
    const extra = this.cfg.keyboard.enable
      ? await buttonHandle(e.msg, { e })
      : []
    return this.sendMsg(e.contact, [...elements, ...extra])
  }

  /**
   * 发送消息
   */
  async sendMsg (
    contact: Contact,
    elements: Array<ElementTypes>,
    _retryCount?: number
  ): Promise<SendMsgResults> {
    if (contact.scene === 'direct' || contact.scene === 'guild') {
      return sendGuild(this, contact as Contact<'guild' | 'direct'>, elements)
    }
    if (contact.scene === 'group' || contact.scene === 'friend') {
      return sendQQ(this, contact as Contact<'friend' | 'group'>, elements)
    }
    throw new Error(`不支持的消息场景: ${contact.scene}`)
  }

  /**
   * 撤回消息
   */
  async recallMsg (contact: Contact, messageId: string): Promise<void> {
    try {
      if (contact.scene === 'friend') {
        await this.super.recallMsg('user', contact.peer, messageId)
      } else if (contact.scene === 'group') {
        await this.super.recallMsg('group', contact.peer, messageId)
      } else if (contact.scene === 'direct') {
        await this.super.recallMsg('dms', contact.peer, messageId)
      } else if (contact.scene === 'guild') {
        await this.super.recallMsg('channels', contact.peer, messageId)
      }
    } catch (err) {
      logger.error('撤回消息失败:', err)
    }
  }

  /**
   * 构造空发送结果，pipeline 内填充 rawData
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
   * 将 rawData[0].id / timestamp 同步到顶层字段
   */
  handleResponse (data: SendMsgResults): SendMsgResults {
    const first = data.rawData[0]
    if (!first) return data
    const { id, timestamp } = first as any
    data.messageId = id
    data.message_id = id
    data.time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
    data.messageTime = data.time
    return data
  }
}
