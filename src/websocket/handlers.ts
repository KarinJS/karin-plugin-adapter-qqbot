import { QQBotClient } from './client'
import { EventEnum, MessageEvent, NoticeEvent, Opcode } from '@/types'

/**
 * 父事件处理
 * @param client QQBotCore
 * @param event 收到的事件信息
 */
export const parentEventHandling = (client: QQBotClient, event: string) => {
  const data = JSON.parse(event)
  client.logger('debug', `收到事件推送: ${JSON.stringify(data, null, 2)}`)
  switch (data.op) {
    case 0:
      childEventHandling(client, data)
      client.logger('debug', '事件推送', JSON.stringify(data, null, 2))
      break
    case Opcode.Heartbeat:
      /** 在指定时间进行回包 */
      client.wss.send(JSON.stringify({ op: 11, d: null }))
      client.logger('debug', '心跳', JSON.stringify(data, null, 2))
      break
    case Opcode.Identify:
      client.logger('info', '鉴权成功', JSON.stringify(data, null, 2))
      break
    case Opcode.Resume:
      client.logger('info', '客户端恢复连接', JSON.stringify(data, null, 2))
      break
    case Opcode.Reconnect:
      client.logger('info', '服务端要求重新连接', JSON.stringify(data, null, 2))
      /** 断开已有ws */
      client.wss.close()
      break
    case Opcode.InvalidSession:
      /** 当 identify 或 resume 的时候，如果参数有错，服务端会返回该消息 */
      client.logger('error', '参数错误', JSON.stringify(data, null, 2))
      break
    case Opcode.Hello:
      /** 更新生命周期 对声明周期减少3秒 防止过时 */
      client.heartbeat_interval = data.d.heartbeat_interval - 3000
      client.logger('debug', '心跳生命周期更新', JSON.stringify(data, null, 2))
      break
    case Opcode.HeartbeatACK:
      client.logger('debug', '心跳回包', JSON.stringify(data, null, 2))
      break
    case Opcode.HTTPCallbackACK:
      /** 仅用于 http 回调模式的回包，代表机器人收到了平台推送的数据 */
      client.logger('debug', '回包', JSON.stringify(data, null, 2))
      break
  }
}

/**
 * 子事件处理
 * @param client QQBotCore
 * @param data 解析后的子事件信息
 */
export const childEventHandling = async (client: QQBotClient, data: MessageEvent | NoticeEvent) => {
  switch (data.t) {
    case EventEnum.READY: {
      /** 发送第一次心跳 */
      client.wss.send(JSON.stringify(client.heartbeat))
      /** 更新心跳唯一值 */
      client.heartbeat.d = data.s
      /** 记录session_id 用于重新连接 */
      client.heartbeat.session_id = data.d.session_id
      /** 心跳 */
      setInterval(() => client.wss.send(JSON.stringify(client.heartbeat)), client.heartbeat_interval)
      client.emit('start', data.d.user)
      break
    }
    case EventEnum.GROUP_AT_MESSAGE_CREATE: {
      client.heartbeat.d = data.s
      client.emit(EventEnum.GROUP_AT_MESSAGE_CREATE, data)
      break
    }
    case EventEnum.C2C_MESSAGE_CREATE: {
      client.heartbeat.d = data.s
      client.emit(EventEnum.C2C_MESSAGE_CREATE, data)
      break
    }
    // case 'GUILD_CREATE':
    // case 'GUILD_UPDATE':
    // case 'GUILD_DELETE':
    // case 'CHANNEL_CREATE':
    // case 'CHANNEL_UPDATE':
    // case 'CHANNEL_DELETE':
    // case 'GUILD_MEMBER_ADD':
    // case 'GUILD_MEMBER_UPDATE':
    // case 'GUILD_MEMBER_REMOVE':
    // case 'MESSAGE_CREATE':
    // case 'MESSAGE_DELETE':
    // case 'MESSAGE_REACTION_ADD':
    // case 'MESSAGE_REACTION_REMOVE':
    // case 'DIRECT_MESSAGE_DELETE':
    // case 'FRIEND_ADD':
    // case 'FRIEND_DEL':
    // case 'C2C_MSG_REJECT':
    // case 'C2C_MSG_RECEIVE':
    // case 'GROUP_ADD_ROBOT':
    // case 'GROUP_DEL_ROBOT':
    // case 'GROUP_MSG_REJECT':
    // case 'GROUP_MSG_RECEIVE':
    // case 'INTERACTION_CREATE':
    // case 'MESSAGE_AUDIT_PASS':
    // case 'MESSAGE_AUDIT_REJECT':
    // case 'FORUM_THREAD_CREATE':
    // case 'FORUM_THREAD_UPDATE':
    // case 'FORUM_THREAD_DELETE':
    // case 'FORUM_POST_CREATE':
    // case 'FORUM_POST_DELETE':
    // case 'FORUM_REPLY_CREATE':
    // case 'FORUM_REPLY_DELETE':
    // case 'FORUM_PUBLISH_AUDIT_RESULT':
    // case 'AUDIO_START':
    // case 'AUDIO_FINISH':
    // case 'AUDIO_ON_MIC':
    // case 'AUDIO_OFF_MIC':
    case EventEnum.DIRECT_MESSAGE_CREATE: {
      client.heartbeat.d = data.s
      client.emit(EventEnum.DIRECT_MESSAGE_CREATE, data)
      break
    }
    case EventEnum.MESSAGE_CREATE:
    case EventEnum.AT_MESSAGE_CREATE: {
      client.heartbeat.d = data.s
      client.emit(data.t, data)
      break
    }
    // case 'PUBLIC_MESSAGE_DELETE':
    // case 'RESUMED:  {"op":0,"s":53,"t":"RESUMED","d":""} 在客户端恢复连接时收到
    case EventEnum.RESUMED: {
      client.logger('mark', '[重连] 客户端恢复连接')
      return
    }
    default:
      console.log(`Unhandled event: ${JSON.stringify(data)}`)
  }
}
