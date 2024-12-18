import { QQBotConvertKarin } from './conver'
import { AdapterQQBot } from '@/core/adapter/adapter'
import { karin, createGroupMessage, SrcReply, createFriendMessage, segment, createGuildMessage, createDirectMessage } from 'node-karin'
import type { C2CMsgEvent, DirectMsgEvent, GroupMsgEvent, GuildMsgEvent } from './types'

/**
 * 创建群消息事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onGroupMsg = (client: AdapterQQBot, event: GroupMsgEvent) => {
  const selfId = client.selfId
  const userId = event.d.author.member_openid
  const contact = karin.contactGroup(event.d.group_id)
  const sender = karin.groupSender(userId, '')
  const srcReply: SrcReply = (elements) => client.sendMsg(contact, [...elements, segment.pasmsg(event.d.id)])

  createGroupMessage({
    bot: client,
    elements: QQBotConvertKarin(selfId, event, client.selfSubId('id')),
    eventId: event.id,
    messageId: event.d.id,
    messageSeq: 0,
    rawEvent: event,
    time: Number(event.d.timestamp),
    userId,
    selfId,
    contact,
    sender,
    srcReply
  })
}

/**
 * 创建好友消息事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onFriendMsg = (client: AdapterQQBot, event: C2CMsgEvent) => {
  const selfId = client.selfId
  const userId = event.d.author.user_openid
  const contact = karin.contactFriend(userId)
  const sender = karin.friendSender(userId, '')
  const srcReply: SrcReply = (elements) => client.sendMsg(contact, [...elements, segment.pasmsg(event.d.id)])

  createFriendMessage({
    bot: client,
    elements: QQBotConvertKarin(selfId, event, client.selfSubId('id')),
    eventId: event.id,
    messageId: event.d.id,
    messageSeq: 0,
    rawEvent: event,
    time: Number(event.d.timestamp),
    userId,
    selfId,
    contact,
    sender,
    srcReply
  })
}

/**
 * 创建频道消息事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onChannelMsg = (client: AdapterQQBot, event: GuildMsgEvent) => {
  const selfId = client.selfId
  const userId = event.d.author.id
  const contact = karin.contact('guild', event.d.guild_id, event.d.channel_id)
  const sender = karin.groupSender(userId, event.d.author.username)
  const srcReply: SrcReply = (elements) => client.sendMsg(contact, [...elements, segment.pasmsg(event.d.id)])

  createGuildMessage({
    bot: client,
    elements: QQBotConvertKarin(selfId, event, client.selfSubId('id')),
    eventId: event.id,
    messageId: event.d.id,
    messageSeq: 0,
    rawEvent: event,
    time: Number(event.d.timestamp),
    userId,
    selfId,
    contact,
    sender,
    srcReply
  })
}

/**
 * 创建频道私信事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onDirectMsg = (client: AdapterQQBot, event: DirectMsgEvent) => {
  const selfId = client.selfId
  const userId = event.d.author.id
  const contact = karin.contact('direct', event.d.guild_id, event.d.channel_id)
  const sender = karin.friendSender(userId, event.d.author.username)
  const srcReply: SrcReply = (elements) => client.sendMsg(contact, [...elements, segment.pasmsg(event.d.id)])

  createDirectMessage({
    bot: client,
    elements: QQBotConvertKarin(selfId, event, client.selfSubId('id')),
    eventId: event.id,
    messageId: event.d.id,
    messageSeq: 0,
    rawEvent: event,
    time: Number(event.d.timestamp),
    userId,
    selfId,
    contact,
    sender,
    srcReply,
    srcGuildId: event.d.src_guild_id
  })
}
