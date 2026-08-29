import { Http } from './http'
import type {
  QQGroupInfoResponse, GroupBotStateResponse, QQGroupMemberResponse,
  GetGroupMuteSettingResponse, GetJoinRequestListParams, GetJoinRequestListResponse,
  ApprovalJoinRequestBody,
} from './types'

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
   * @param groupOpenid 群 openid
   * @param memberOpenid 群成员 openid
   */
  getGroupMember (groupOpenid: string, memberOpenid: string): Promise<QQGroupMemberResponse> {
    return this.get(`/v2/groups/${groupOpenid}/members/${memberOpenid}`)
  }

  /**
   * 设置群成员禁言
   *
   * 机器人需拥有群管理员身份，平台限制最大禁言时长为 30 天。
   *
   * @param groupOpenid 群 openid
   * @param memberOpenid 群成员 openid
   * @param op 操作: add 增加禁言，update 更新禁言到期时间，del 解除禁言
   * @param duration 禁言时间使用RFC3339 格式
   */
  setGroupMute (groupOpenid: string, memberOpenid: string, op: 'add' | 'update' | 'del', duration: string): Promise<{}> {
    return this.post(`/v2/groups/${groupOpenid}/restrict_chat_setting`, { members: [{ op, member_openid: memberOpenid, mute_expire_at: duration }] })
  }

  /**
   * 设置群成员禁言
   * @deprecated 方法名拼写错误，请使用 {@link GroupsApi.setGroupMute}
   */
  setGroupMetu (groupOpenid: string, memberOpenid: string, op: 'add' | 'update' | 'del', duration: string): Promise<{}> {
    return this.setGroupMute(groupOpenid, memberOpenid, op, duration)
  }

  /**
   * 查询群禁言状态
   *
   * 返回全员禁言模式（含定时 / 周期规则）与当前禁言中的成员列表（不含已过期）。
   * 机器人需拥有群管理员身份。
   *
   * @param groupOpenid 群 openid
   */
  getGroupMuteSetting (groupOpenid: string): Promise<GetGroupMuteSettingResponse> {
    return this.get(`/v2/groups/${groupOpenid}/restrict_chat_setting`)
  }

  /**
   * 拉取入群申请列表
   *
   * 机器人需拥有群管理员身份。
   *
   * @param groupOpenid 群 openid
   * @param params 分页参数，`limit` 默认 20、最大 100
   */
  getJoinRequestList (
    groupOpenid: string,
    params: GetJoinRequestListParams = {}
  ): Promise<GetJoinRequestListResponse> {
    const query = new URLSearchParams()
    if (params.cursor) query.set('cursor', params.cursor)
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    const search = query.toString()
    return this.get(`/v2/groups/${groupOpenid}/join_request_list${search ? `?${search}` : ''}`)
  }

  /**
   * 审批入群申请
   *
   * 机器人需拥有群管理员身份。
   *
   * @param groupOpenid 群 openid
   * @param memberOpenid 申请人 openid
   * @param body 审批动作，`op=decline` 时可附带拒绝理由与拉黑标记
   */
  approvalJoinRequest (
    groupOpenid: string,
    memberOpenid: string,
    body: ApprovalJoinRequestBody
  ): Promise<{}> {
    return this.post(`/v2/groups/${groupOpenid}/approval_join_request/${memberOpenid}`, body)
  }
}
