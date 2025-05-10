import { AdapterQQBot } from '@/core/adapter/adapter'
import {
  karin,
  SrcReply,
  segment,
  createGroupMemberAddNotice,
  createGroupMemberDelNotice,
  createFriendIncreaseNotice,
  createFriendDecreaseNotice,
} from 'node-karin'
import type {
  GroupAddRobotEvent,
  GroupDelRobotEvent,
  GroupMsgRejectEvent,
  GroupMsgReceiveEvent,
  FriendAddEvent,
  FriendDelEvent,
  C2CMsgRejectEvent,
  C2CMsgReceiveEvent,
} from '../../types/event'

/**
 * 机器人加入群聊事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onGroupAddRobot = (client: AdapterQQBot, event: GroupAddRobotEvent) => {
  const selfId = client.selfId
  const userId = event.d.op_member_openid
  const groupId = event.d.group_openid
  const contact = karin.contactGroup(groupId)
  const sender = karin.groupSender(userId, 'unknown')
  const eventId = event.id
  const srcReply: SrcReply = (elements) => client.sendMsg(contact, [...elements, segment.pasmsg(eventId, 'event')])

  createGroupMemberAddNotice({
    contact,
    eventId,
    sender,
    srcReply,
    bot: client,
    rawEvent: event,
    time: event.d.timestamp,
    content: { operatorId: userId, targetId: selfId, type: 'invite' },
  })
}

/**
 * 机器人退出群聊事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onGroupDelRobot = (client: AdapterQQBot, event: GroupDelRobotEvent) => {
  const selfId = client.selfId
  const userId = event.d.op_member_openid
  const groupId = event.d.group_openid
  const contact = karin.contactGroup(groupId)
  const sender = karin.groupSender(userId, 'unknown')
  const eventId = event.id
  const srcReply: SrcReply = (elements) => client.sendMsg(contact, [...elements, segment.pasmsg(eventId, 'event')])

  createGroupMemberDelNotice({
    contact,
    eventId,
    sender,
    srcReply,
    bot: client,
    rawEvent: event,
    time: event.d.timestamp,
    content: { operatorId: userId, targetId: selfId, type: 'kick' },
  })
}

/**
 * 群聊接受机器人主动消息
 * @param client 机器人实例
 * @param event 事件
 */
export const onGroupMsgReceive = (client: AdapterQQBot, event: GroupMsgReceiveEvent) => {
  const groupId = event.d.group_openid
  const userId = event.d.op_member_openid
  client.logger('mark', `群聊 ${groupId} 已允许机器人主动发送消息 操作人: ${userId}`)
}

/**
 * 群聊拒绝机器人主动消息
 * @param client 机器人实例
 * @param event 事件
 */
export const onGroupMsgReject = (client: AdapterQQBot, event: GroupMsgRejectEvent) => {
  const groupId = event.d.group_openid
  const userId = event.d.op_member_openid
  client.logger('mark', `群聊 ${groupId} 已拒绝机器人主动发送消息 操作人: ${userId}`)
}

/**
 * 好友添加事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onFriendAdd = (client: AdapterQQBot, event: FriendAddEvent) => {
  const selfId = client.selfId
  const userId = event.d.openid
  const contact = karin.contactFriend(userId)
  const sender = karin.friendSender(userId, '')
  const eventId = event.id
  const srcReply: SrcReply = (elements) => client.sendMsg(contact, [...elements, segment.pasmsg(eventId, 'event')])

  createFriendIncreaseNotice({
    contact,
    eventId,
    sender,
    srcReply,
    bot: client,
    rawEvent: event,
    time: event.d.timestamp,
    content: { targetId: selfId },
  })
}

/**
 * 好友删除事件
 * @param client 机器人实例
 * @param event 事件
 */
export const onFriendDel = (client: AdapterQQBot, event: FriendDelEvent) => {
  const selfId = client.selfId
  const userId = event.d.openid
  const contact = karin.contactFriend(userId)
  const sender = karin.friendSender(userId, '')
  const eventId = event.id
  const srcReply: SrcReply = (elements) => client.sendMsg(contact, [...elements, segment.pasmsg(eventId, 'event')])

  createFriendDecreaseNotice({
    contact,
    eventId,
    sender,
    srcReply,
    bot: client,
    rawEvent: event,
    time: event.d.timestamp,
    content: { targetId: selfId },
  })
}

/**
 * 好友接受机器人主动消息
 * @param client 机器人实例
 * @param event 事件
 */
export const onC2CMsgReceive = (client: AdapterQQBot, event: C2CMsgReceiveEvent) => {
  const userId = event.d.openid
  client.logger('mark', `好友 ${userId} 已允许机器人主动发送消息`)
}

/**
 * 好友拒绝机器人主动消息
 * @param client 机器人实例
 * @param event 事件
 */
export const onC2CMsgReject = (client: AdapterQQBot, event: C2CMsgRejectEvent) => {
  const userId = event.d.openid
  client.logger('mark', `好友 ${userId} 已拒绝机器人主动发送消息`)
}
