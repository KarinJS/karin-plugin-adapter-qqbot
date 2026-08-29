import type { AdapterQQBot } from './base'

/** 入群申请索引缓存上限，仅用于把 Karin 的 flag 还原成群 / 成员 openid */
const JOIN_REQUEST_CACHE_MAX = 1000

/** 入群申请对应的群与申请人 */
export interface JoinRequestTarget {
  /** 群 openid */
  groupId: string
  /** 申请人 openid */
  memberId: string
}

/**
 * `appId:join_request_id` -> 群 / 申请人 openid。
 *
 * Karin 的 `setGroupApplyResult` / `setInvitedJoinGroupResult` 只透传 flag
 * （即 `join_request_id`），而官方审批接口的路径需要 group_openid 与
 * member_openid，因此在收到入群申请事件时先把对应关系记下来。
 *
 * 按 appId 加前缀，避免多 bot 共用进程时互相覆盖。
 */
const joinRequests = new Map<string, JoinRequestTarget>()

/**
 * 拼接缓存键。
 * @param appId 机器人 appId。
 * @param joinRequestId 申请 ID。
 */
const cacheKey = (appId: string, joinRequestId: string): string => `${appId}:${joinRequestId}`

/**
 * 记录入群申请索引，供后续审批接口还原群 / 申请人 openid。
 *
 * 超出上限时按写入顺序淘汰最旧的一条。
 *
 * @param ctx 当前 QQBot 适配器实例。
 * @param joinRequestId 申请 ID，同时是 Karin 请求事件的 flag。
 * @param target 该申请对应的群与申请人 openid。
 */
export const cacheJoinRequest = (
  ctx: AdapterQQBot,
  joinRequestId: string,
  target: JoinRequestTarget
): void => {
  if (!joinRequestId) return
  if (joinRequests.size >= JOIN_REQUEST_CACHE_MAX) {
    const oldest = joinRequests.keys().next().value
    if (oldest !== undefined) joinRequests.delete(oldest)
  }
  joinRequests.set(cacheKey(String(ctx.cfg.appId), joinRequestId), target)
}

/**
 * 读取入群申请索引。
 *
 * @param ctx 当前 QQBot 适配器实例。
 * @param joinRequestId 申请 ID。
 * @returns 命中的群 / 申请人 openid；未命中返回 undefined。
 */
export const getJoinRequest = (
  ctx: AdapterQQBot,
  joinRequestId: string
): JoinRequestTarget | undefined => {
  return joinRequests.get(cacheKey(String(ctx.cfg.appId), joinRequestId))
}

/**
 * 审批完成后移除索引。
 *
 * @param ctx 当前 QQBot 适配器实例。
 * @param joinRequestId 申请 ID。
 */
export const removeJoinRequest = (ctx: AdapterQQBot, joinRequestId: string): void => {
  joinRequests.delete(cacheKey(String(ctx.cfg.appId), joinRequestId))
}

/**
 * 清理某个 bot 的全部入群申请索引，销毁 bot 时调用。
 *
 * @param appId 机器人 appId。
 */
export const clearJoinRequests = (appId: string): void => {
  const prefix = `${appId}:`
  for (const key of joinRequests.keys()) {
    if (key.startsWith(prefix)) joinRequests.delete(key)
  }
}
