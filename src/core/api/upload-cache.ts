import { getMessageStore } from '@/core/storage/message'
import type { MediaType, Scene, UploadMediaResponse } from './types'

/** 比 QQ 返回的 ttl 提前失效，避免临界点使用到刚过期的 file_info。 */
const TTL_SAFETY_MARGIN_SECONDS = 60

/** QQ 返回极短 ttl 时仍保留一个最小可用窗口。 */
const MIN_EFFECTIVE_TTL_SECONDS = 10

/**
 * 构建 file_info 缓存键。
 *
 * 虽然 QQ 文档说同一类会话内 file_info 可复用，但这里仍按 peer 隔离，
 * 以避开未文档化的服务端限制。
 *
 * @param scene 上传场景。
 * @param peer openid 或 group_openid。
 * @param type 富媒体类型。
 * @param contentHash 文件内容 hash。
 * @returns 缓存键。
 */
const cacheKey = (scene: Scene, peer: string, type: MediaType, contentHash: string): string =>
  [scene, peer, type, contentHash].join('\x1f')

/**
 * 读取可复用的上传结果。
 *
 * 缓存持久化在 SQLite（file_info ttl 可达数天），进程重启后同一份媒体
 * 不需要重新上传。缓存层异常一律按未命中处理，不影响上传主链路。
 *
 * @param scene 上传场景。
 * @param peer openid 或 group_openid。
 * @param type 富媒体类型。
 * @param contentHash 文件内容 hash。
 * @returns 未命中或过期时返回 null。
 */
export const getCachedUpload = async (
  scene: Scene,
  peer: string,
  type: MediaType,
  contentHash: string
): Promise<UploadMediaResponse | null> => {
  try {
    const raw = await getMessageStore().getUploadCache(cacheKey(scene, peer, type, contentHash))
    if (!raw) return null
    return JSON.parse(raw) as UploadMediaResponse
  } catch {
    return null
  }
}

/**
 * 写入上传结果缓存。
 *
 * @param scene 上传场景。
 * @param peer openid 或 group_openid。
 * @param type 富媒体类型。
 * @param contentHash 文件内容 hash。
 * @param response 上传接口返回。
 */
export const setCachedUpload = async (
  scene: Scene,
  peer: string,
  type: MediaType,
  contentHash: string,
  response: UploadMediaResponse
): Promise<void> => {
  if (!response.file_info) return

  const ttl = Number(response.ttl)
  const expiresAt = ttl > 0
    ? Date.now() + Math.max(ttl - TTL_SAFETY_MARGIN_SECONDS, MIN_EFFECTIVE_TTL_SECONDS) * 1000
    : 0

  try {
    await getMessageStore().setUploadCache(
      cacheKey(scene, peer, type, contentHash),
      JSON.stringify(response),
      expiresAt
    )
  } catch {
    /** 缓存写入失败不影响上传结果的使用。 */
  }
}
