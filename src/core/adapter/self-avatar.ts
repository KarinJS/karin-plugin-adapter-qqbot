import type { AdapterQQBot } from './base'

/**
 * 机器人自身头像的在途请求存储。
 *
 * 机器人没有可拼进 qlogo CDN 的自身 openid（selfId 就是 appId），只能走官方
 * `GET /users/@me` 取 avatar。在途请求挂在 WeakMap 而不是实例字段上，保持
 * AdapterQQBot 只包含 AdapterType 约束的成员；bot 重建后旧实例随之释放。
 */
const pending = new WeakMap<AdapterQQBot, Promise<string>>()

/**
 * 获取机器人自身的真实头像，并发调用只请求一次，失败后释放以便下次重试。
 * @param bot 适配器实例。
 * @returns `/users/@me` 的 avatar，拉取失败时退回 qlogo 拼接模式（默认头像）。
 */
export const selfAvatarUrl = (bot: AdapterQQBot): Promise<string> => {
  const existed = pending.get(bot)
  if (existed) return existed

  const fallback = `https://thirdqq.qlogo.cn/qqapp/${bot.cfg.appId}/${bot.selfId}/0`
  const task = bot.super.meta.getMe()
    .then(me => me.avatar || fallback)
    .catch((err) => {
      bot.logger('warn', `[getAvatarUrl] 获取机器人自身头像失败，退回默认拼接: ${err instanceof Error ? err.message : err}`)
      pending.delete(bot)
      return fallback
    })
  pending.set(bot, task)
  return task
}
