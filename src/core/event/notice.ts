import type { AdapterQQBot } from '@/core/adapter/base'
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
  GroupMemberAddEvent,
  GroupMemberRemoveEvent,
  GroupMsgRejectEvent,
  GroupMsgReceiveEvent,
  FriendAddEvent,
  FriendDelEvent,
  C2CMsgRejectEvent,
  C2CMsgReceiveEvent,
} from '@/types/event'

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
  const sender = karin.groupSender(selfId, 'member')
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
  const sender = karin.groupSender(selfId, 'unknown')
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
 * 群成员加入事件。
 *
 * QQ 官方仅下发加入成员，未提供操作人和加入方式；Karin 的通知模型要求
 * `type`，因此以 `approve` 表示已加入，并将 `operatorId` 留空。
 * 该事件不能作为 QQ 被动消息的 `event_id`，回复会按普通消息发送。
 *
 * @param client 机器人实例
 * @param event 官方群成员加入事件
 */
export const onGroupMemberAdd = (client: AdapterQQBot, event: GroupMemberAddEvent) => {
  const memberId = event.d.member_openid
  const contact = karin.contactGroup(event.d.group_openid)
  const sender = karin.groupSender(memberId, 'member')

  createGroupMemberAddNotice({
    contact,
    eventId: event.id,
    sender,
    srcReply: (elements) => client.sendMsg(contact, elements),
    bot: client,
    rawEvent: event,
    time: event.d.timestamp,
    content: { operatorId: '', targetId: memberId, type: 'approve' },
  })
}

/**
 * 群成员退出事件。
 *
 * QQ 官方仅下发退出成员，未提供操作人和退出原因；Karin 的通知模型要求
 * `type`，因此以 `leave` 表示成员已离开，并将 `operatorId` 留空。
 * 该事件不能作为 QQ 被动消息的 `event_id`，回复会按普通消息发送。
 *
 * @param client 机器人实例
 * @param event 官方群成员退出事件
 */
export const onGroupMemberRemove = (client: AdapterQQBot, event: GroupMemberRemoveEvent) => {
  const memberId = event.d.member_openid
  const contact = karin.contactGroup(event.d.group_openid)
  const sender = karin.groupSender(memberId, 'unknown')

  createGroupMemberDelNotice({
    contact,
    eventId: event.id,
    sender,
    srcReply: (elements) => client.sendMsg(contact, elements),
    bot: client,
    rawEvent: event,
    time: event.d.timestamp,
    content: { operatorId: '', targetId: memberId, type: 'leave' },
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
