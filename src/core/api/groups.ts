import { Http } from './http'
import type { QQGroupInfoResponse, GroupBotStateResponse, QQGroupMemberResponse } from './types'

/**
 * QQ 群信息接口
 *
 * 注意：以下接口均为白名单接口，未开通权限时平台返回错误码 11253，
 * 需要向平台运营申请后可用。
 */
export class GroupsApi extends Http {
  /**
   * 获取群基础信息
   * @param groupOpenid 群 openid
   */
  getGroupInfo (groupOpenid: string): Promise<QQGroupInfoResponse> {
    return this.get(`/v2/groups/${groupOpenid}/info`)
  }

  /**
   * 获取机器人在群内的状态（角色、入群时间、主动消息开关等）
   * @param groupOpenid 群 openid
   */
  getBotState (groupOpenid: string): Promise<GroupBotStateResponse> {
    return this.get(`/v2/groups/${groupOpenid}/bot_state`)
  }

  /**
   * 获取群成员详情
   *
   * 未公开文档，来自腾讯官方 openclaw 插件（v2.0.0）的接口速查。
   * @param groupOpenid 群 openid
   * @param memberOpenid 群成员 openid
   */
  getGroupMember (groupOpenid: string, memberOpenid: string): Promise<QQGroupMemberResponse> {
    return this.get(`/v2/groups/${groupOpenid}/members/${memberOpenid}`)
  }
}
