import { log } from '@/utils/logger'
import { EventEnum } from '@/types/event'
import {
  onGroupMsg, onFriendMsg, onChannelMsg, onDirectMsg,
} from './message'
import {
  onGroupAddRobot, onGroupDelRobot, onGroupMemberAdd, onGroupMemberRemove, onGroupMsgReceive, onGroupMsgReject,
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
  [EventEnum.GROUP_MEMBER_ADD]: '群成员加入',
  [EventEnum.GROUP_MEMBER_REMOVE]: '群成员退出',
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
  log('debug', `${client.selfId}: dispatcher routing t=${ev.t} -> ${label}`)

  switch (ev.t) {
    case EventEnum.READY:
      return client.logger('info', `WebSocket 就绪: ${ev.d?.user?.username || ''}`)
    case EventEnum.RESUMED:
      return client.logger('info', 'WebSocket 连接已恢复')

    case EventEnum.GROUP_AT_MESSAGE_CREATE:
      onGroupMsg(client, ev, { forceAtSelf: true })
      return
    case EventEnum.GROUP_MESSAGE_CREATE:
      onGroupMsg(client, ev, { forceAtSelf: false })
      return
    case EventEnum.C2C_MESSAGE_CREATE:
      onFriendMsg(client, ev)
      return
    case EventEnum.MESSAGE_CREATE:
    case EventEnum.AT_MESSAGE_CREATE:
      onChannelMsg(client, ev)
      return
    case EventEnum.DIRECT_MESSAGE_CREATE:
      onDirectMsg(client, ev)
      return

    case EventEnum.GROUP_ADD_ROBOT:
      onGroupAddRobot(client, ev)
      return
    case EventEnum.GROUP_DEL_ROBOT:
      onGroupDelRobot(client, ev)
      return
    case EventEnum.GROUP_MEMBER_ADD:
      onGroupMemberAdd(client, ev)
      return
    case EventEnum.GROUP_MEMBER_REMOVE:
      onGroupMemberRemove(client, ev)
      return
    case EventEnum.GROUP_MSG_RECEIVE:
      onGroupMsgReceive(client, ev)
      return
    case EventEnum.GROUP_MSG_REJECT:
      onGroupMsgReject(client, ev)
      return
    case EventEnum.FRIEND_ADD:
      onFriendAdd(client, ev)
      return
    case EventEnum.FRIEND_DEL:
      onFriendDel(client, ev)
      return
    case EventEnum.C2C_MSG_RECEIVE:
      onC2CMsgReceive(client, ev)
      return
    case EventEnum.C2C_MSG_REJECT:
      onC2CMsgReject(client, ev)
      return

    case EventEnum.INTERACTION_CREATE:
      onInteraction(client, ev)
      return

    case EventEnum.MESSAGE_AUDIT_PASS:
      return client.logger('debug', `消息审核通过: audit_id=${ev.d.audit_id}`)
    case EventEnum.MESSAGE_AUDIT_REJECT:
      return client.logger('debug', `消息审核不通过: audit_id=${ev.d.audit_id}`)

    default:
      client.logger('debug', `[QQ Official Bot] 未处理事件: ${(ev as any).t}`)
  }
}
