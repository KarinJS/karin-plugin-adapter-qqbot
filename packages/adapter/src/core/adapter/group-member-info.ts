import { senderGroup } from 'node-karin'
import { getGroupMemberProfile, getUserProfile } from './profiles'
import type { GroupMemberInfo } from 'node-karin'
import type { AdapterQQBot } from './base'
import type { QQGroupMemberResponse } from '@/core/api/types'

/**
 * 按 Karin 接口约定构造群成员信息。
 *
 * sender 用 getter 即时构建，避免序列化时带出多余引用。
 * 昵称和角色取官方查询结果，群名片复用消息事件提供的数据。
 */
export const buildGroupMemberInfo = (
  bot: AdapterQQBot,
  groupId: string,
  userId: string,
  member?: Pick<QQGroupMemberResponse, 'username' | 'nick' | 'member_role' | 'joined_at'>
): GroupMemberInfo => {
  const user = getUserProfile(bot, userId)
  const group = getGroupMemberProfile(bot, groupId, userId)
  const nick = member?.username ?? member?.nick ?? user?.nick ?? bot.nicknameCache.get(userId) ?? ''
  const role = member?.member_role ?? 'unknown'
  const card = group?.card
  const joinedAt = member?.joined_at ? Date.parse(member.joined_at) : NaN
  return {
    userId,
    role,
    nick,
    card,
    joinTime: Number.isFinite(joinedAt) ? joinedAt : undefined,
    get sender() {
      return senderGroup({ userId, nick, name: nick, role, card })
    },
  }
}
