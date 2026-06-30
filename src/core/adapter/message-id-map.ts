import type { Contact } from 'node-karin'
import type { AdapterQQBot } from './base'

/** QQ 消息 ID 与 REFIDX 映射的短期缓存时长，和本地消息缓存窗口保持一致。 */
const MESSAGE_ID_LINK_CACHE_TTL = 24 * 60 * 60 * 1000

/** QQ 消息 ID 映射表清理间隔。 */
const MESSAGE_ID_LINK_CLEANUP_INTERVAL = 60 * 1000

/** REFIDX 到 QQ API 消息 ID 的短期映射。 */
interface ApiMessageIdCacheEntry {
  /** QQ API 路径使用的消息 ID，例如 ROBOT1.0_...。 */
  apiMessageId: string
  /** 过期时间戳，单位毫秒。 */
  expiresAt: number
}

/** QQ API 消息 ID 到 REFIDX 的短期映射。 */
interface ReferenceMessageIdCacheEntry {
  /** QQ 客户端引用使用的消息索引，例如 REFIDX_...。 */
  referenceMessageId: string
  /** 过期时间戳，单位毫秒。 */
  expiresAt: number
}

/** 机器人自己发送的 QQ API 消息 ID。 */
interface OwnMessageIdCacheEntry {
  /** 过期时间戳，单位毫秒。 */
  expiresAt: number
}

/** 单个适配器实例持有的消息 ID 映射状态。 */
interface MessageIdMapState {
  /** QQ 引用索引到 API 消息 ID 的短期映射，用于 recallMsg 等平台接口。 */
  apiMessageIdCache: Map<string, ApiMessageIdCacheEntry>
  /** QQ API 消息 ID 到引用索引的短期映射，用于 segment.reply(e.messageId)。 */
  referenceMessageIdCache: Map<string, ReferenceMessageIdCacheEntry>
  /** 机器人自己发送的 QQ API 消息 ID，用于判断单聊是否允许撤回。 */
  ownMessageIdCache: Map<string, OwnMessageIdCacheEntry>
  /** 上次清理 QQ 消息 ID 映射表的时间戳。 */
  lastCleanup: number
}

/** 按适配器实例隔离的消息 ID 映射状态。 */
const states = new WeakMap<AdapterQQBot, MessageIdMapState>()

/**
 * 获取适配器实例对应的消息 ID 映射状态。
 *
 * @param ctx 当前 QQBot 适配器实例。
 * @returns 该实例的映射状态。
 */
const getState = (ctx: AdapterQQBot): MessageIdMapState => {
  const existing = states.get(ctx)
  if (existing) return existing

  const created: MessageIdMapState = {
    apiMessageIdCache: new Map(),
    referenceMessageIdCache: new Map(),
    ownMessageIdCache: new Map(),
    lastCleanup: 0,
  }
  states.set(ctx, created)
  return created
}

/**
 * 构造 REFIDX/API ID 映射的会话级 key。
 *
 * @param contact 消息所在会话。
 * @param messageId 消息 ID。
 * @returns 可用于 Map 的稳定 key。
 */
const messageIdKey = (contact: Contact, messageId: string): string => {
  return [contact.scene, contact.peer, contact.subPeer || '', messageId].join('\x1f')
}

/**
 * 清理过期的消息 ID 映射。
 *
 * @param ctx 当前 QQBot 适配器实例。
 */
const cleanup = (ctx: AdapterQQBot): void => {
  const state = getState(ctx)
  const now = Date.now()
  if (now - state.lastCleanup < MESSAGE_ID_LINK_CLEANUP_INTERVAL) return
  state.lastCleanup = now

  for (const [key, entry] of state.apiMessageIdCache) {
    if (entry.expiresAt <= now) state.apiMessageIdCache.delete(key)
  }
  for (const [key, entry] of state.referenceMessageIdCache) {
    if (entry.expiresAt <= now) state.referenceMessageIdCache.delete(key)
  }
  for (const [key, entry] of state.ownMessageIdCache) {
    if (entry.expiresAt <= now) state.ownMessageIdCache.delete(key)
  }
}

/**
 * 记住机器人自己发送的 QQ API 消息 ID。
 *
 * 单聊场景只允许撤回机器人自己发送的消息。收到用户消息时的 `e.messageId`
 * 也是 API 消息 ID，但不能用于单聊撤回，因此需要独立标记来源。
 *
 * @param ctx 当前 QQBot 适配器实例。
 * @param contact 消息所在会话。
 * @param apiMessageId QQ API 消息 ID，通常为 ROBOT1.0_...。
 */
export const rememberOwnMessageId = (
  ctx: AdapterQQBot,
  contact: Contact,
  apiMessageId: string
): void => {
  if (!apiMessageId) return
  cleanup(ctx)
  const state = getState(ctx)
  state.ownMessageIdCache.set(messageIdKey(contact, apiMessageId), {
    expiresAt: Date.now() + MESSAGE_ID_LINK_CACHE_TTL,
  })
}

/**
 * 判断给定 QQ API 消息 ID 是否由机器人自己发送。
 *
 * @param ctx 当前 QQBot 适配器实例。
 * @param contact 消息所在会话。
 * @param apiMessageId QQ API 消息 ID。
 * @returns true 表示这条消息是当前适配器实例发送的。
 */
export const isOwnMessageId = (
  ctx: AdapterQQBot,
  contact: Contact,
  apiMessageId: string
): boolean => {
  cleanup(ctx)
  const state = getState(ctx)
  const key = messageIdKey(contact, apiMessageId)
  const cached = state.ownMessageIdCache.get(key)
  if (!cached) return false
  if (cached.expiresAt > Date.now()) return true
  state.ownMessageIdCache.delete(key)
  return false
}

/**
 * 记住 QQ 引用索引对应的 API 消息 ID。
 *
 * QQ 群聊/单聊的 `message_reference.message_id` 使用 REFIDX，但撤回等 API 路径使用
 * ROBOT1.0 开头的消息 ID。映射按适配器实例和会话隔离，避免不同群里的 REFIDX 冲突。
 *
 * @param ctx 当前 QQBot 适配器实例。
 * @param contact 消息所在会话。
 * @param referenceMessageId QQ 引用索引，通常为 REFIDX_...。
 * @param apiMessageId QQ API 消息 ID，通常为 ROBOT1.0_...。
 */
export const rememberApiMessageId = (
  ctx: AdapterQQBot,
  contact: Contact,
  referenceMessageId: string,
  apiMessageId: string
): void => {
  if (!referenceMessageId || !apiMessageId) return
  if (referenceMessageId === apiMessageId) return

  cleanup(ctx)
  const state = getState(ctx)
  const expiresAt = Date.now() + MESSAGE_ID_LINK_CACHE_TTL
  state.apiMessageIdCache.set(messageIdKey(contact, referenceMessageId), {
    apiMessageId,
    expiresAt,
  })
  state.referenceMessageIdCache.set(messageIdKey(contact, apiMessageId), {
    referenceMessageId,
    expiresAt,
  })
}

/**
 * 将 QQ API 消息 ID 解析为客户端可见引用使用的 REFIDX。
 *
 * @param ctx 当前 QQBot 适配器实例。
 * @param contact 消息所在会话。
 * @param messageId Karin 侧传入的消息 ID，可能是 ROBOT1.0 或 REFIDX。
 * @returns 可用于 `message_reference.message_id` 的 ID；没有映射时返回原值。
 */
export const resolveReferenceMessageId = (
  ctx: AdapterQQBot,
  contact: Contact,
  messageId: string
): string => {
  cleanup(ctx)
  const state = getState(ctx)
  const key = messageIdKey(contact, messageId)
  const cached = state.referenceMessageIdCache.get(key)
  if (!cached) return messageId
  if (cached.expiresAt > Date.now()) return cached.referenceMessageId
  state.referenceMessageIdCache.delete(key)
  return messageId
}

/**
 * 将 Karin 侧传入的消息 ID 解析为 QQ API 可用的消息 ID。
 *
 * @param ctx 当前 QQBot 适配器实例。
 * @param contact 消息所在会话。
 * @param messageId Karin 侧传入的消息 ID，可能是 REFIDX。
 * @returns QQ API 路径可用的消息 ID；没有映射时返回原值。
 */
export const resolveApiMessageId = (
  ctx: AdapterQQBot,
  contact: Contact,
  messageId: string
): string => {
  cleanup(ctx)
  const state = getState(ctx)
  const key = messageIdKey(contact, messageId)
  const cached = state.apiMessageIdCache.get(key)
  if (!cached) return messageId
  if (cached.expiresAt > Date.now()) return cached.apiMessageId
  state.apiMessageIdCache.delete(key)
  return messageId
}
