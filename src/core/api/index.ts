import type { AxiosInstance } from './http'
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
 * - groups：群基础信息 / 机器人群内状态 / 禁言 / 入群申请（部分为白名单接口）
 * - guilds：频道与子频道的查询和增删改
 * - menu：全局自定义菜单（仅单聊）
 * - panels：指令面板
 * - joinApproval：入群自动审批策略
 *
 * 请求体构造器 {@link buildQQMsg} / {@link buildGuildMsg} 独立导出，避免与 HTTP 调用耦合
 */
export class QQBotApi {
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
export { GuildsApi } from './guilds'
export { MenuApi } from './menu'
export { PanelsApi } from './panels'
export { JoinApprovalApi } from './join-approval'
export type { AckCode } from './interaction'
