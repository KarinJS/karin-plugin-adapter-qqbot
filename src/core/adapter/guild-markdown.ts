/**
 * 频道 Markdown 能力探测。
 *
 * 官方能力说明（`api-docs/server-inter/message/type/markdown.md`）：2026-04-23 起
 * 单聊 / 群聊的自定义 Markdown 已开放到所有机器人，无需申请；**频道场景仍需内邀
 * 开通**。因此单聊 / 群聊直接走 Markdown，频道场景先乐观尝试，被平台以权限类
 * 错误拒绝后记住该 bot 并改走普通消息，避免之后每条消息都白跑一次请求。
 *
 * 状态只存在于当前进程，也不写配置：拿到内邀后重启（或改一次配置触发 bot 重建）
 * 即可重新尝试，用户不需要手动去点任何开关。
 */

/** 已确认没有频道 Markdown 权限的 appId。 */
const forbidden = new Set<string>()

/**
 * 平台拒绝 Markdown 的权限类错误码。
 *
 * - 50056 不允许发送 markdown content；
 * - 304036 没有 markdown 模板的权限。
 */
const FORBIDDEN_CODES = [50056, 304036]

/**
 * 该 bot 当前是否还可以尝试频道 Markdown。
 *
 * @param selfId 机器人 appId。
 * @returns 未被标记为无权限时返回 true。
 */
export const canSendGuildMarkdown = (selfId: string): boolean => !forbidden.has(selfId)

/**
 * 标记该 bot 没有频道 Markdown 权限。
 *
 * @param selfId 机器人 appId。
 * @returns 本次是否是首次标记，供调用方只告警一次。
 */
export const disableGuildMarkdown = (selfId: string): boolean => {
  if (forbidden.has(selfId)) return false
  forbidden.add(selfId)
  return true
}

/**
 * 清除该 bot 的降级标记，让下一条频道消息重新尝试 Markdown。
 *
 * bot 重建（配置变更 / 重新登录）时调用，避免内邀开通后还要重启整个 Karin。
 *
 * @param selfId 机器人 appId。
 */
export const resetGuildMarkdown = (selfId: string): void => {
  forbidden.delete(selfId)
}

/**
 * 判断发送失败是否来自平台对 Markdown 权限的校验。
 *
 * Http 层把平台错误格式化成普通 Error（`[Code 50056] ...`），这里按错误码优先、
 * 中文文案兜底识别，和 pipeline 里其它降级判断保持一致的做法。
 *
 * @param err 捕获到的发送异常。
 * @returns 是否应降级为普通消息。
 */
export const isGuildMarkdownForbiddenError = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : String(err)
  if (FORBIDDEN_CODES.some(code => message.includes(`[Code ${code}]`))) return true
  return message.includes('不允许发送 markdown') || message.includes('没有 markdown 模板的权限')
}
