import { logger } from 'node-karin'
import { EventEnum } from '@/types/event'
import {
  onGroupMsg, onFriendMsg, onChannelMsg, onDirectMsg,
} from './message'
import {
  onGroupAddRobot, onGroupDelRobot, onGroupMsgReceive, onGroupMsgReject,
  onFriendAdd, onFriendDel, onC2CMsgReceive, onC2CMsgReject,
} from './notice'
import { onInteraction } from './interaction'
import type { AdapterQQBot } from '@/core/adapter/base'
import type { Event } from '@/types/event'

/** 事件名 → 中文标签 */
const eventLabel: Record<string, string> = {
  [EventEnum.READY]: '就绪',
  [EventEnum.RESUMED]: '连接恢复',
  [EventEnum.GROUP_AT_MESSAGE_CREATE]: '群聊@消息',
  [EventEnum.GROUP_MESSAGE_CREATE]: '群聊消息',
  [EventEnum.C2C_MESSAGE_CREATE]: '好友消息',
  [EventEnum.MESSAGE_CREATE]: '频道消息',
  [EventEnum.AT_MESSAGE_CREATE]: '频道@消息',
  [EventEnum.DIRECT_MESSAGE_CREATE]: '频道私信',
  [EventEnum.GROUP_ADD_ROBOT]: '机器人入群',
  [EventEnum.GROUP_DEL_ROBOT]: '机器人退群',
  [EventEnum.GROUP_MSG_RECEIVE]: '群聊开启通知',
  [EventEnum.GROUP_MSG_REJECT]: '群聊关闭通知',
  [EventEnum.FRIEND_ADD]: '添加好友',
  [EventEnum.FRIEND_DEL]: '删除好友',
  [EventEnum.C2C_MSG_RECEIVE]: '单聊开启通知',
  [EventEnum.C2C_MSG_REJECT]: '单聊关闭通知',
  [EventEnum.INTERACTION_CREATE]: '互动事件',
  [EventEnum.MESSAGE_AUDIT_PASS]: '消息审核通过',
  [EventEnum.MESSAGE_AUDIT_REJECT]: '消息审核不通过',
}

/**
 * 事件分发
 */
export const dispatch = (client: AdapterQQBot, ev: Event): void => {
  const label = eventLabel[ev.t] || ev.t
  client.logger('debug', `[事件][${label}]`)

  switch (ev.t) {
    case EventEnum.READY:
      return client.logger('info', `WebSocket 就绪: ${ev.d?.user?.username || ''}`)
    case EventEnum.RESUMED:
      return client.logger('info', 'WebSocket 连接已恢复')

    case EventEnum.GROUP_AT_MESSAGE_CREATE:
      return onGroupMsg(client, ev, { forceAtSelf: true })
    case EventEnum.GROUP_MESSAGE_CREATE:
      return onGroupMsg(client, ev, { forceAtSelf: false })
    case EventEnum.C2C_MESSAGE_CREATE:
      return onFriendMsg(client, ev)
    case EventEnum.MESSAGE_CREATE:
    case EventEnum.AT_MESSAGE_CREATE:
      return onChannelMsg(client, ev)
    case EventEnum.DIRECT_MESSAGE_CREATE:
      return onDirectMsg(client, ev)

    case EventEnum.GROUP_ADD_ROBOT:
      return onGroupAddRobot(client, ev)
    case EventEnum.GROUP_DEL_ROBOT:
      return onGroupDelRobot(client, ev)
    case EventEnum.GROUP_MSG_RECEIVE:
      return onGroupMsgReceive(client, ev)
    case EventEnum.GROUP_MSG_REJECT:
      return onGroupMsgReject(client, ev)
    case EventEnum.FRIEND_ADD:
      return onFriendAdd(client, ev)
    case EventEnum.FRIEND_DEL:
      return onFriendDel(client, ev)
    case EventEnum.C2C_MSG_RECEIVE:
      return onC2CMsgReceive(client, ev)
    case EventEnum.C2C_MSG_REJECT:
      return onC2CMsgReject(client, ev)

    case EventEnum.INTERACTION_CREATE:
      return onInteraction(client, ev)

    case EventEnum.MESSAGE_AUDIT_PASS:
      return client.logger('debug', `消息审核通过: audit_id=${ev.d.audit_id}`)
    case EventEnum.MESSAGE_AUDIT_REJECT:
      return client.logger('debug', `消息审核不通过: audit_id=${ev.d.audit_id}`)

    default:
      logger.debug(`[QQ Official Bot] 未处理事件: ${(ev as any).t}`)
  }
}
