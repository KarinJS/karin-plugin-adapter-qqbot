import type { AxiosInstance } from './http'
import { MessagesApi } from './messages'
import { MediaApi } from './media'
import { InteractionApi } from './interaction'
import { MetaApi } from './meta'
import { buildQQMsg, buildGuildMsg } from './builders'

/**
 * QQBot 官方 API 门面
 *
 * 子模块按职能拆分：
 * - messages：发送 / 撤回
 * - media：富媒体上传
 * - interaction：按钮回调 ack
 * - meta：@me / dms / gateway
 *
 * 请求体构造器 {@link buildQQMsg} / {@link buildGuildMsg} 独立导出，避免与 HTTP 调用耦合
 */
export class QQBotApi {
  public readonly messages: MessagesApi
  public readonly media: MediaApi
  public readonly interaction: InteractionApi
  public readonly meta: MetaApi

  /** 请求体构造器（静态便利） */
  public readonly qq = buildQQMsg
  public readonly guild = buildGuildMsg

  constructor (public readonly axios: AxiosInstance) {
    this.messages = new MessagesApi(axios)
    this.media = new MediaApi(axios)
    this.interaction = new InteractionApi(axios)
    this.meta = new MetaApi(axios)
  }
}

export { buildQQMsg, buildGuildMsg } from './builders'
export type { AckCode } from './interaction'
