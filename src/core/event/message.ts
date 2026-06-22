import { convertToKarin } from './conver'
import {
  karin, segment,
  createGroupMessage, createFriendMessage,
  createGuildMessage, createDirectMessage,
} from 'node-karin'
import type { AdapterQQBot } from '@/core/adapter/base'
import type {
  C2CMsgEvent, DirectMsgEvent, GroupMsgEvent, GuildMsgEvent,
} from '@/types/event'

interface GroupOptions {
  /** AT_MESSAGE 走 true；GROUP_MESSAGE 由 mentions.is_you 自动决定 */
  forceAtSelf: boolean
}

/**
 * 群消息（@机器人 / 普通消息合并入口）
 */
export const onGroupMsg = (client: AdapterQQBot, ev: GroupMsgEvent, opts: GroupOptions) => {
  const selfId = client.selfId
  const userId = ev.d.author.member_openid || ev.d.author.id
  const username = ev.d.author.username || ''
  if (userId && username) client.nicknameCache.set(userId, username)
  ev.d.mentions?.forEach((m) => {
    if (m.member_openid && m.username) client.nicknameCache.set(m.member_openid, m.username)
  })
  const contact = karin.contactGroup(ev.d.group_openid || ev.d.group_id)
  // `member_role` 是 QQ 官方在群消息事件中下发的真实身份；旧报文不含时保留为未知。
  const sender = karin.groupSender(userId, ev.d.author.member_role || 'unknown', username)

  const e = createGroupMessage({
    bot: client,
    elements: convertToKarin(selfId, ev, client.selfSubId('id'), { forceAtSelf: opts.forceAtSelf }),
    eventId: ev.id,
    messageId: ev.d.id,
    messageSeq: 0,
    rawEvent: ev,
    time: Number(new Date(ev.d.timestamp).getTime() || ev.d.timestamp),
    contact,
    sender,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(ev.d.id)]),
  })

  return e
}

/**
 * 单聊消息
 */
export const onFriendMsg = (client: AdapterQQBot, ev: C2CMsgEvent) => {
  const selfId = client.selfId
  const userId = ev.d.author.user_openid || ev.d.author.id
  const username = ev.d.author.username || ''
  if (userId && username) client.nicknameCache.set(userId, username)
  const contact = karin.contactFriend(userId)
  const sender = karin.friendSender(userId, username)

  const e = createFriendMessage({
    bot: client,
    elements: convertToKarin(selfId, ev, client.selfSubId('id')),
    eventId: ev.id,
    messageId: ev.d.id,
    messageSeq: 0,
    rawEvent: ev,
    time: Number(new Date(ev.d.timestamp).getTime() || ev.d.timestamp),
    contact,
    sender,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(ev.d.id)]),
  })

  return e
}

/**
 * 频道消息
 */
export const onChannelMsg = (client: AdapterQQBot, ev: GuildMsgEvent) => {
  const selfId = client.selfId
  const userId = ev.d.author.id
  const contact = karin.contact('guild', ev.d.guild_id, ev.d.channel_id)
  const sender = karin.groupSender(userId, 'unknown', ev.d.author.username || '')

  const e = createGuildMessage({
    bot: client,
    elements: convertToKarin(selfId, ev, client.selfSubId('id')),
    eventId: ev.id,
    messageId: ev.d.id,
    messageSeq: 0,
    rawEvent: ev,
    time: Number(new Date(ev.d.timestamp).getTime() || ev.d.timestamp),
    contact,
    sender,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(ev.d.id)]),
  })

  return e
}

/**
 * 频道私信
 */
export const onDirectMsg = (client: AdapterQQBot, ev: DirectMsgEvent) => {
  const selfId = client.selfId
  const userId = ev.d.author.id
  const contact = karin.contact('direct', ev.d.guild_id, ev.d.channel_id)
  const sender = karin.friendSender(userId, ev.d.author.username || '')

  const e = createDirectMessage({
    bot: client,
    elements: convertToKarin(selfId, ev, client.selfSubId('id')),
    eventId: ev.id,
    messageId: ev.d.id,
    messageSeq: 0,
    rawEvent: ev,
    time: Number(new Date(ev.d.timestamp).getTime() || ev.d.timestamp),
    contact,
    sender,
    srcGuildId: ev.d.src_guild_id,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(ev.d.id)]),
  })

  return e
}
