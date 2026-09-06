import type { AxiosInstance } from './http'
import { RequestApi } from './request'
import { MessagesApi } from './messages'
import { MediaApi } from './media'
import { InteractionApi } from './interaction'
import { MetaApi } from './meta'
import { GroupsApi } from './groups'
import { GuildsApi } from './guilds'
import { MenuApi } from './menu'
import { PanelsApi } from './panels'
import { JoinApprovalApi } from './join-approval'
import { buildQQMsg, buildGuildMsg } from './builders'

/**
 * QQBot 官方 API 门面
 *
 * 子模块按职能拆分：
 * - messages：发送 / 撤回
 * - media：富媒体上传
 * - interaction：按钮回调 ack
 * - meta：@me / dms / gateway / 分享链接
 * - groups：群基础信息 / 机器人群内状态 / 群成员列表与详情 / 禁言 / 批量移除 / 群黑名单 / 入群申请（白名单接口）
 * - guilds：频道与子频道的查询和增删改
 * - menu：全局自定义菜单（仅单聊）
 * - panels：指令面板
 * - joinApproval：入群自动审批策略
 * - request：裸请求入口，用于调用尚未封装的官方接口
 *
 * 请求体构造器 {@link buildQQMsg} / {@link buildGuildMsg} 独立导出，避免与 HTTP 调用耦合
 */
export class QQBotApi {
  /**
   * 裸请求入口，直接调用官方 OpenAPI。
   *
   * 官方新接口还没被适配器封装时可用它兜底，会自动带鉴权、解包 `data`、
   * 格式化错误码：
   *
   * ```ts
   * await bot.super.request.get('/v2/menu')
   * await bot.super.request.post('/v2/xxx', { foo: 1 })
   * ```
   *
   * @see {@link RequestApi}
   */
  public readonly request: RequestApi
  public readonly messages: MessagesApi
  public readonly media: MediaApi
  public readonly interaction: InteractionApi
  public readonly meta: MetaApi
  public readonly groups: GroupsApi
  public readonly guilds: GuildsApi
  public readonly menu: MenuApi
  public readonly panels: PanelsApi
  public readonly joinApproval: JoinApprovalApi

  /** 请求体构造器（静态便利） */
  public readonly qq = buildQQMsg
  public readonly guild = buildGuildMsg

  constructor (public readonly axios: AxiosInstance) {
    this.request = new RequestApi(axios)
    this.messages = new MessagesApi(axios)
    this.media = new MediaApi(axios)
    this.interaction = new InteractionApi(axios)
    this.meta = new MetaApi(axios)
    this.groups = new GroupsApi(axios)
    this.guilds = new GuildsApi(axios)
    this.menu = new MenuApi(axios)
    this.panels = new PanelsApi(axios)
    this.joinApproval = new JoinApprovalApi(axios)
  }
}

export { buildQQMsg, buildGuildMsg } from './builders'
export { Http } from './http'
export { RequestApi } from './request'
export { GuildsApi } from './guilds'
export { MenuApi } from './menu'
export { PanelsApi } from './panels'
export { JoinApprovalApi } from './join-approval'
export type { AckCode } from './interaction'
export type { AxiosInstance, RequestOptions } from './http'
