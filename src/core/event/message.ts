import { QQBotConvertKarin } from './conver'
import {
  karin,
  createGroupMessage,
  createFriendMessage,
  segment, createGuildMessage, createDirectMessage
} from 'node-karin'

import type { AdapterQQBotNormal } from '../adapter/normal'
import type { AdapterQQBotMarkdown } from '../adapter/markdown'
import type { C2CMsgEvent, DirectMsgEvent, GroupMsgEvent, GuildMsgEvent } from '../../types/event'

/**
 * 创建群消息事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onGroupMsg = (client: AdapterQQBotMarkdown | AdapterQQBotNormal, event: GroupMsgEvent) => {
  const selfId = client.selfId
  const userId = event.d.author.member_openid
  const contact = karin.contactGroup(event.d.group_id)
  const sender = karin.groupSender(userId, 'unknown')

  const e = createGroupMessage({
    bot: client,
    elements: QQBotConvertKarin(selfId, event, client.selfSubId('id')),
    eventId: event.id,
    messageId: event.d.id,
    messageSeq: 0,
    rawEvent: event,
    time: Number(event.d.timestamp),
    contact,
    sender,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(event.d.id)])
  })
}

/**
 * 创建好友消息事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onFriendMsg = (client: AdapterQQBotMarkdown | AdapterQQBotNormal, event: C2CMsgEvent) => {
  const selfId = client.selfId
  const userId = event.d.author.user_openid
  const contact = karin.contactFriend(userId)
  const sender = karin.friendSender(userId, '')

  const e = createFriendMessage({
    bot: client,
    elements: QQBotConvertKarin(selfId, event, client.selfSubId('id')),
    eventId: event.id,
    messageId: event.d.id,
    messageSeq: 0,
    rawEvent: event,
    time: Number(event.d.timestamp),
    contact,
    sender,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(event.d.id)])
  })
}

/**
 * 创建频道消息事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onChannelMsg = (client: AdapterQQBotMarkdown | AdapterQQBotNormal, event: GuildMsgEvent) => {
  const selfId = client.selfId
  const userId = event.d.author.id
  const contact = karin.contact('guild', event.d.guild_id, event.d.channel_id)
  const sender = karin.groupSender(userId, 'unknown', event.d.author.username)

  const e = createGuildMessage({
    bot: client,
    elements: QQBotConvertKarin(selfId, event, client.selfSubId('id')),
    eventId: event.id,
    messageId: event.d.id,
    messageSeq: 0,
    rawEvent: event,
    time: Number(event.d.timestamp),
    contact,
    sender,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(event.d.id)])
  })
}

/**
 * 创建频道私信事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onDirectMsg = (client: AdapterQQBotMarkdown | AdapterQQBotNormal, event: DirectMsgEvent) => {
  const selfId = client.selfId
  const userId = event.d.author.id
  const contact = karin.contact('direct', event.d.guild_id, event.d.channel_id)
  const sender = karin.friendSender(userId, event.d.author.username)

  const e = createDirectMessage({
    bot: client,
    elements: QQBotConvertKarin(selfId, event, client.selfSubId('id')),
    eventId: event.id,
    messageId: event.d.id,
    messageSeq: 0,
    rawEvent: event,
    time: Number(event.d.timestamp),
    contact,
    sender,
    srcGuildId: event.d.src_guild_id,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(event.d.id)]),
  })
}
