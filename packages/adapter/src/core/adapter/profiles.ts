import type { AdapterQQBot } from './base'
import type { GroupMemberInfo } from 'node-karin'

const PROFILE_TTL_MS = 5 * 60 * 1000
const PROFILE_CACHE_MAX = 2000

interface UserProfile {
  nick: string
  avatar: string
}
type GroupMemberProfile = Pick<GroupMemberInfo, 'card'>

interface Entry<T> {
  value: T
  expiresAt: number
}

interface ProfileState {
  users: Map<string, Entry<Partial<UserProfile>>>
  members: Map<string, Entry<{ groupId: string; profile: Partial<GroupMemberProfile> }>>
}

/** 只保存事件提供的昵称、头像和群名片，按 bot 隔离。官方查询不写入此处。 */
const states = new WeakMap<AdapterQQBot, ProfileState>()

const stateFor = (bot: AdapterQQBot): ProfileState => {
  let state = states.get(bot)
  if (!state) {
    state = { users: new Map(), members: new Map() }
    states.set(bot, state)
  }
  return state
}

const read = <T>(cache: Map<string, Entry<T>>, key: string, onDelete?: (key: string) => void): T | undefined => {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    onDelete?.(key)
    return undefined
  }
  return entry.value
}

const write = <T>(cache: Map<string, Entry<T>>, key: string, value: T, onDelete?: (key: string) => void): void => {
  cache.delete(key)
  if (cache.size >= PROFILE_CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) {
      cache.delete(oldest)
      onDelete?.(oldest)
    }
  }
  cache.set(key, { value, expiresAt: Date.now() + PROFILE_TTL_MS })
}

/** 缺失字段不覆盖旧资料，显式空字符串是有效更新。 */
const defined = <T extends object>(value: T): Partial<T> => {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>
}

export const getUserProfile = (bot: AdapterQQBot, userId: string): Partial<UserProfile> | undefined => {
  return read(stateFor(bot).users, userId, (key) => bot.nicknameCache.delete(key))
}

/** 只由事件更新。昵称的兼容 Map 随资料一同过期、淘汰。 */
export const cacheUserProfile = (bot: AdapterQQBot, userId: string, profile: Partial<UserProfile>): void => {
  const update = defined(profile)
  if (!userId || !Object.keys(update).length) return
  const cache = stateFor(bot).users
  write(cache, userId, { ...getUserProfile(bot, userId), ...update }, (key) => bot.nicknameCache.delete(key))
  if (profile.nick !== undefined) bot.nicknameCache.set(userId, profile.nick)
  while (bot.nicknameCache.size > PROFILE_CACHE_MAX) {
    const oldest = bot.nicknameCache.keys().next().value!
    bot.nicknameCache.delete(oldest)
    cache.delete(oldest)
  }
}

const memberKey = (groupId: string, userId: string): string => JSON.stringify([groupId, userId])

export const getGroupMemberProfile = (
  bot: AdapterQQBot,
  groupId: string,
  userId: string
): Partial<GroupMemberProfile> | undefined => {
  return read(stateFor(bot).members, memberKey(groupId, userId))?.profile
}

export const cacheGroupMemberProfile = (
  bot: AdapterQQBot,
  groupId: string,
  userId: string,
  profile: Partial<GroupMemberProfile>
): void => {
  if (!groupId || !userId || profile.card === undefined) return
  const cache = stateFor(bot).members
  const key = memberKey(groupId, userId)
  write(cache, key, { groupId, profile: { card: profile.card } })
}

/** 删除好友时清除其事件资料。 */
export const clearUserProfile = (bot: AdapterQQBot, userId: string): void => {
  const state = stateFor(bot)
  state.users.delete(userId)
  bot.nicknameCache.delete(userId)
}

/** 成员离群时删除该成员的群资料；机器人退群时删除整个群的资料。 */
export const clearGroupMemberProfile = (bot: AdapterQQBot, groupId: string, userId?: string): void => {
  const cache = stateFor(bot).members
  if (userId !== undefined) {
    cache.delete(memberKey(groupId, userId))
    return
  }
  for (const [key, entry] of cache) {
    if (entry.value.groupId === groupId) cache.delete(key)
  }
}
