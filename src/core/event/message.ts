import { AdapterQQBotText } from '../adapter/adapter'
import { C2CMsgEvent, GroupMsgEvent } from './types'
import { karin, createGroupMessage, SrcReply, createFriendMessage, segment } from 'node-karin'
import { QQBotConvertKarin } from './conver'

/**
 * 创建群消息事件
 * @param client 机器人实例
 * @param event 事件
 */
export const createGroupMsg = (client: AdapterQQBotText, event: GroupMsgEvent) => {
  const selfId = client.selfId
  const userId = event.d.author.member_openid
  const contact = karin.contactGroup(event.d.group_id)
  const sender = karin.groupSender(userId, '')
  const srcReply: SrcReply = (elements) => client.sendMsg(contact, [...elements, segment.pasmsg(event.d.id)])

  createGroupMessage({
    bot: client,
    elements: QQBotConvertKarin(selfId, event),
    eventId: event.id,
    messageId: event.d.id,
    messageSeq: 0,
    rawEvent: event,
    subEvent: 'group',
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
export const createFriendMsg = (client: AdapterQQBotText, event: C2CMsgEvent) => {
  const selfId = client.selfId
  const userId = event.d.author.user_openid
  const contact = karin.contactFriend(userId)
  const sender = karin.friendSender(userId, '')
  const srcReply: SrcReply = (elements) => client.sendMsg(contact, [...elements, segment.pasmsg(event.d.id)])

  createFriendMessage({
    bot: client,
    elements: QQBotConvertKarin(selfId, event),
    eventId: event.id,
    messageId: event.d.id,
    messageSeq: 0,
    rawEvent: event,
    subEvent: 'friend',
    time: Number(event.d.timestamp),
    userId,
    selfId,
    contact,
    sender,
    srcReply
  })
}
