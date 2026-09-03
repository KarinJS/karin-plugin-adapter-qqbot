import { Http } from './http'
import { MAX_GROUP_CURSOR_LIMIT } from '@/core/constants'
import type {
  QQGroupInfoResponse, GroupBotStateResponse, QQGroupMemberResponse,
  GetGroupMuteSettingResponse, GetJoinRequestListParams, GetJoinRequestListResponse,
  ApprovalJoinRequestBody, SetMemberMuteState,
  GetGroupMemberListParams, GetGroupMemberListResponse,
  BatchRemoveGroupMembersBody, BatchRemoveGroupMembersResponse,
  GetGroupMemberBlacklistParams, GetGroupMemberBlacklistResponse,
  SetGroupMemberBlacklistBody, SetGroupMemberBlacklistResponse,
} from './types'

/**
 * QQ 群信息与群成员管理接口
 *
 * 注意：以下接口均为白名单接口，未开通权限时平台返回错误码 11253，
 * 需要向平台运营申请后可用。接口文档 v1.28.0（2026-09-03）新增的群成员管理
 * 接口（成员列表 / 批量移除 / 黑名单）官方标注为「正在内邀接入中」，
 * 开放范围可能比其它白名单接口更窄。
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
   * 获取群成员列表
   *
   * 每次最多返回 30 条，只支持 cursor 翻页：首次不传 `cursor`，之后回传上一次
   * 响应的 `next_cursor`，`next_cursor` 为空串表示已到末页。
   *
   * @param groupOpenid 群 openid
   * @param params 分页参数
   */
  getGroupMemberList (
    groupOpenid: string,
    params: GetGroupMemberListParams = {}
  ): Promise<GetGroupMemberListResponse> {
    const query = new URLSearchParams()
    if (params.cursor) query.set('cursor', params.cursor)
    const search = query.toString()
    return this.get(`/v2/groups/${groupOpenid}/members${search ? `?${search}` : ''}`)
  }

  /**
   * 获取群成员详情
   *
   * 昵称字段为 `username`；`nick` 是该接口转为公开文档之前的字段名，仅作兼容。
   *
   * @param groupOpenid 群 openid
   * @param memberOpenid 群成员 openid
   */
  getGroupMember (groupOpenid: string, memberOpenid: string): Promise<QQGroupMemberResponse> {
    return this.get(`/v2/groups/${groupOpenid}/members/${memberOpenid}`)
  }

  /**
   * 群成员批量移除
   *
   * 单次最多 20 个成员，可通过 `add_to_member_blacklist` 在移除的同时拉黑。
   * 机器人需拥有群管理员身份。
   *
   * @param groupOpenid 群 openid
   * @param body 待移除的成员列表与是否同时拉黑
   */
  batchRemoveGroupMembers (
    groupOpenid: string,
    body: BatchRemoveGroupMembersBody
  ): Promise<BatchRemoveGroupMembersResponse> {
    return this.post(`/v2/groups/${groupOpenid}/batch_remove_members`, body)
  }

  /**
   * 查询群黑名单
   *
   * @param groupOpenid 群 openid
   * @param params 分页参数，`limit` 默认 20、最大 100
   */
  getGroupMemberBlacklist (
    groupOpenid: string,
    params: GetGroupMemberBlacklistParams = {}
  ): Promise<GetGroupMemberBlacklistResponse> {
    const query = new URLSearchParams()
    if (params.cursor) query.set('cursor', params.cursor)
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    const search = query.toString()
    return this.get(`/v2/groups/${groupOpenid}/member_blacklist${search ? `?${search}` : ''}`)
  }

  /**
   * 群黑名单操作
   *
   * 只有目标用户不在群中时才能加入黑名单，需要先移除再拉黑；单次最多 20 个。
   * 返回的 `fail_openids` 在 `op=add` / `op=del` 下同义，都是操作失败的 openid。
   *
   * @param groupOpenid 群 openid
   * @param body 操作类型与目标成员列表
   */
  setGroupMemberBlacklist (
    groupOpenid: string,
    body: SetGroupMemberBlacklistBody
  ): Promise<SetGroupMemberBlacklistResponse> {
    return this.post(`/v2/groups/${groupOpenid}/member_blacklist`, body)
  }

  /**
   * 设置群成员禁言
   *
   * 机器人需拥有群管理员身份，平台限制最大禁言时长为 30 天；
   * 只能操作普通成员，不能操作群主、管理员与机器人。
   * 需要一次设置多个成员时用 {@link GroupsApi.setGroupMuteBatch}。
   *
   * @param groupOpenid 群 openid
   * @param memberOpenid 群成员 openid
   * @param op 操作: add 增加禁言，update 更新禁言到期时间，del 解除禁言
   * @param duration 禁言时间使用RFC3339 格式
   */
  setGroupMute (groupOpenid: string, memberOpenid: string, op: 'add' | 'update' | 'del', duration: string): Promise<{}> {
    return this.setGroupMuteBatch(groupOpenid, [{ op, member_openid: memberOpenid, mute_expire_at: duration }])
  }

  /**
   * 批量设置群成员禁言
   *
   * 每项通过自身的 `op` 控制增 / 改 / 删，可以在一次请求里混用。
   * 平台限制单次最多 20 个成员（接口文档 v1.28.0 由 10 提升至 20），
   * 超出时平台会直接拒绝整个请求。
   *
   * @param groupOpenid 群 openid
   * @param members 成员禁言设置列表
   */
  setGroupMuteBatch (groupOpenid: string, members: SetMemberMuteState[]): Promise<{}> {
    return this.post(`/v2/groups/${groupOpenid}/restrict_chat_setting`, { members })
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
   * @param params 分页参数，`limit` 默认 20、最大 50（接口文档 v1.28.0 由 100 下调），
   * 传入更大的值会被收敛到 50，避免平台直接拒绝
   */
  getJoinRequestList (
    groupOpenid: string,
    params: GetJoinRequestListParams = {}
  ): Promise<GetJoinRequestListResponse> {
    const query = new URLSearchParams()
    if (params.cursor) query.set('cursor', params.cursor)
    if (params.limit !== undefined) {
      query.set('limit', String(Math.min(params.limit, MAX_GROUP_CURSOR_LIMIT)))
    }
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
