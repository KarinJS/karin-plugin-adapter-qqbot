import { Http } from './http'
import type {
  GetJoinApprovalStrategyListParams, GetJoinApprovalStrategyListResponse,
  CreateJoinApprovalStrategyRequest, CreateJoinApprovalStrategyResponse,
  UpdateJoinApprovalStrategyRequest, UpdateJoinApprovalStrategyResponse,
  UpdateWhitelistUsersRequest, UpdateWhitelistUsersResponse,
} from './types'

/**
 * 入群自动审批策略接口
 *
 * 策略把「关联群 + 白名单 QQ 号码」绑在一起，命中白名单的入群申请会自动审批通过。
 * 规则仅在机器人拥有群管理员身份时才会实际运行；一个机器人最多 20 个策略。
 */
export class JoinApprovalApi extends Http {
  /**
   * 查询入群自动审批策略列表
   *
   * 按创建时间倒序，支持分页。
   * @param params 分页参数，`limit` 默认 20、最大 100
   */
  getStrategyList (
    params: GetJoinApprovalStrategyListParams = {}
  ): Promise<GetJoinApprovalStrategyListResponse> {
    const query = new URLSearchParams()
    if (params.cursor) query.set('cursor', params.cursor)
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    const search = query.toString()
    return this.get(`/v2/groups/join_approval_strategy${search ? `?${search}` : ''}`)
  }

  /**
   * 创建入群自动审批策略
   *
   * `group_openids` 与 `group_ids` 二选一必填，同时传入或均未传入都会报错。
   * @param body 策略配置
   */
  createStrategy (
    body: CreateJoinApprovalStrategyRequest
  ): Promise<CreateJoinApprovalStrategyResponse> {
    return this.post('/v2/groups/join_approval_strategy', body)
  }

  /**
   * 修改入群自动审批策略
   *
   * 可修改生效状态、失效时间、备注，或增删关联群；
   * 增删关联群时的群标识形式必须与创建时一致。
   * @param strategyId 策略 ID
   * @param body 待修改的字段
   */
  updateStrategy (
    strategyId: string,
    body: UpdateJoinApprovalStrategyRequest
  ): Promise<UpdateJoinApprovalStrategyResponse> {
    return this.patch(`/v2/groups/join_approval_strategy/${strategyId}`, body)
  }

  /**
   * 删除入群自动审批策略
   * @param strategyId 策略 ID
   */
  deleteStrategy (strategyId: string): Promise<{}> {
    return this.delete(`/v2/groups/join_approval_strategy/${strategyId}`)
  }

  /**
   * 执行入群自动审批策略
   *
   * 对策略关联的全部群发起全量扫描，命中白名单号码的入群申请自动审批通过。
   * 异步执行，约 10 分钟完成。
   * @param strategyId 策略 ID
   */
  executeStrategy (strategyId: string): Promise<{}> {
    return this.post(`/v2/groups/join_approval_strategy/${strategyId}/execute`)
  }

  /**
   * 修改入群自动审批策略的白名单号码
   *
   * 单次最多 10000 个，策略号码上限 10W。
   * @param strategyId 策略 ID
   * @param body 操作类型与号码列表
   */
  updateWhitelistUsers (
    strategyId: string,
    body: UpdateWhitelistUsersRequest
  ): Promise<UpdateWhitelistUsersResponse> {
    return this.post(`/v2/groups/join_approval_strategy/${strategyId}/whitelist_users`, body)
  }
}
