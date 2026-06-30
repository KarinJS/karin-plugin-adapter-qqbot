import type { MediaType, Scene, UploadMediaResponse } from './types'

/** 单进程内最多缓存的 file_info 数量，避免长期运行时内存无限增长。 */
const MAX_CACHE_SIZE = 500

/** 比 QQ 返回的 ttl 提前失效，避免临界点使用到刚过期的 file_info。 */
const TTL_SAFETY_MARGIN_SECONDS = 60

/** QQ 返回极短 ttl 时仍保留一个最小可用窗口。 */
const MIN_EFFECTIVE_TTL_SECONDS = 10

interface UploadCacheEntry {
  /** 可直接复用的上传响应。 */
  response: UploadMediaResponse
  /** 失效时间戳；ttl 为 0 时视为长期有效，只受最大条目数淘汰。 */
  expiresAt: number
  /** 写入时间，用于缓存满时淘汰最旧条目。 */
  createdAt: number
}

const cache = new Map<string, UploadCacheEntry>()

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
 * 惰性清理过期缓存。
 * @param now 当前时间戳。
 */
const cleanupExpired = (now = Date.now()): void => {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key)
  }
}

/**
 * 缓存满时淘汰最旧的一批条目。
 */
const evictOldest = (): void => {
  if (cache.size < MAX_CACHE_SIZE) return
  cleanupExpired()
  if (cache.size < MAX_CACHE_SIZE) return

  const entries = [...cache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)
  const removeCount = Math.max(1, Math.ceil(MAX_CACHE_SIZE / 2))
  for (const [key] of entries.slice(0, removeCount)) {
    cache.delete(key)
  }
}

/**
 * 读取可复用的上传结果。
 *
 * @param scene 上传场景。
 * @param peer openid 或 group_openid。
 * @param type 富媒体类型。
 * @param contentHash 文件内容 hash。
 * @returns 未命中或过期时返回 null。
 */
export const getCachedUpload = (
  scene: Scene,
  peer: string,
  type: MediaType,
  contentHash: string
): UploadMediaResponse | null => {
  const key = cacheKey(scene, peer, type, contentHash)
  const entry = cache.get(key)
  if (!entry) return null

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }

  return { ...entry.response }
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
export const setCachedUpload = (
  scene: Scene,
  peer: string,
  type: MediaType,
  contentHash: string,
  response: UploadMediaResponse
): void => {
  if (!response.file_info) return
  evictOldest()

  const now = Date.now()
  const ttl = Number(response.ttl)
  const effectiveTtl = ttl > 0
    ? Math.max(ttl - TTL_SAFETY_MARGIN_SECONDS, MIN_EFFECTIVE_TTL_SECONDS) * 1000
    : Number.POSITIVE_INFINITY

  cache.set(cacheKey(scene, peer, type, contentHash), {
    response: { ...response },
    expiresAt: ttl > 0 ? now + effectiveTtl : Number.POSITIVE_INFINITY,
    createdAt: now,
  })
}

/**
 * 获取当前 file_info 缓存状态，便于调试。
 * @returns 缓存条目数与上限。
 */
export const getUploadCacheStats = (): { size: number; maxSize: number } => ({
  size: cache.size,
  maxSize: MAX_CACHE_SIZE,
})
