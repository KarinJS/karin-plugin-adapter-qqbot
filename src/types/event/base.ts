/**
 * opcode
 * 客户端操作含义如下：
 * Receive 客户端接收到服务端 push 的消息
 * Send 客户端发送消息
 * Reply 客户端接收到服务端发送的消息之后的回包（HTTP 回调模式）
 */
export const enum Opcode {
  /** Dispatch [Receive] 服务端进行消息推送 */
  Dispatch = 0,
  /** Heartbeat [Send/Receive] 客户端或服务端发送心跳 */
  Heartbeat = 1,
  /** Identify [Send] 客户端发送鉴权 */
  Identify = 2,
  /** Resume [Send] 客户端恢复连接 */
  Resume = 6,
  /** Reconnect [Receive] 服务端通知客户端重新连接 */
  Reconnect = 7,
  /** Invalid Session [Receive] 当identify或resume的时候，如果参数有错，服务端会返回该消息 */
  InvalidSession = 9,
  /** Hello [Receive] 当客户端与网关建立ws连接之后，网关下发的第一条消息 */
  Hello = 10,
  /** Heartbeat ACK [Receive/Reply] 当发送心跳成功之后，就会收到该消息 */
  HeartbeatACK = 11,
  /** HTTP Callback ACK [Reply] 仅用于 http 回调模式的回包，代表机器人收到了平台推送的数据 */
  HTTPCallbackACK = 12,
}

/**
 * 子事件类型
 */
export const enum EventEnum {
  /** 在鉴权成功后下发 代表建立连接成功 */
  READY = 'READY',
  /** 恢复登录状态后 补发遗漏事件完毕下发 */
  RESUMED = 'RESUMED',
  /** 当机器人加入新的guild时 */
  GUILD_CREATE = 'GUILD_CREATE',
  /** 当guild资料发生变更时 */
  GUILD_UPDATE = 'GUILD_UPDATE',
  /** 当机器人退出guild时 */
  GUILD_DELETE = 'GUILD_DELETE',
  /** 当channel被创建时 */
  CHANNEL_CREATE = 'CHANNEL_CREATE',
  /** 当channel被更新时 */
  CHANNEL_UPDATE = 'CHANNEL_UPDATE',
  /** 当channel被删除时 */
  CHANNEL_DELETE = 'CHANNEL_DELETE',
  /** 当成员加入时 */
  GUILD_MEMBER_ADD = 'GUILD_MEMBER_ADD',
  /** 当成员资料变更时 */
  GUILD_MEMBER_UPDATE = 'GUILD_MEMBER_UPDATE',
  /** 当成员被移除时 */
  GUILD_MEMBER_REMOVE = 'GUILD_MEMBER_REMOVE',
  /** 发送消息事件，代表频道内的全部消息，而不只是 at 机器人的消息。内容与 AT_MESSAGE_CREATE 相同 */
  MESSAGE_CREATE = 'MESSAGE_CREATE',
  /** 删除（撤回）消息事件 */
  MESSAGE_DELETE = 'MESSAGE_DELETE',
  /** 为消息添加表情表态 */
  MESSAGE_REACTION_ADD = 'MESSAGE_REACTION_ADD',
  /** 为消息删除表情表态 */
  MESSAGE_REACTION_REMOVE = 'MESSAGE_REACTION_REMOVE',
  /** 当收到用户发给机器人的频道私信消息时 */
  DIRECT_MESSAGE_CREATE = 'DIRECT_MESSAGE_CREATE',
  /** 删除（撤回）消息事件 */
  DIRECT_MESSAGE_DELETE = 'DIRECT_MESSAGE_DELETE',
  /** 用户单聊发消息给机器人时候 */
  C2C_MESSAGE_CREATE = 'C2C_MESSAGE_CREATE',
  /** 用户添加使用机器人 */
  FRIEND_ADD = 'FRIEND_ADD',
  /** 用户删除机器人 */
  FRIEND_DEL = 'FRIEND_DEL',
  /** 用户在机器人资料卡手动关闭"主动消息"推送 */
  C2C_MSG_REJECT = 'C2C_MSG_REJECT',
  /** 用户在机器人资料卡手动开启"主动消息"推送开关 */
  C2C_MSG_RECEIVE = 'C2C_MSG_RECEIVE',
  /** 用户在群里@机器人时收到的消息 */
  GROUP_AT_MESSAGE_CREATE = 'GROUP_AT_MESSAGE_CREATE',
  /** 机器人被添加到群聊 */
  GROUP_ADD_ROBOT = 'GROUP_ADD_ROBOT',
  /** 机器人被移出群聊 */
  GROUP_DEL_ROBOT = 'GROUP_DEL_ROBOT',
  /** 群管理员主动在机器人资料页操作关闭通知 */
  GROUP_MSG_REJECT = 'GROUP_MSG_REJECT',
  /** 群管理员主动在机器人资料页操作开启通知 */
  GROUP_MSG_RECEIVE = 'GROUP_MSG_RECEIVE',
  /** 互动事件创建时 */
  INTERACTION_CREATE = 'INTERACTION_CREATE',
  /** 消息审核通过 */
  MESSAGE_AUDIT_PASS = 'MESSAGE_AUDIT_PASS',
  /** 消息审核不通过 */
  MESSAGE_AUDIT_REJECT = 'MESSAGE_AUDIT_REJECT',
  /** 当用户创建主题时 */
  FORUM_THREAD_CREATE = 'FORUM_THREAD_CREATE',
  /** 当用户更新主题时 */
  FORUM_THREAD_UPDATE = 'FORUM_THREAD_UPDATE',
  /** 当用户删除主题时 */
  FORUM_THREAD_DELETE = 'FORUM_THREAD_DELETE',
  /** 当用户创建帖子时 */
  FORUM_POST_CREATE = 'FORUM_POST_CREATE',
  /** 当用户删除帖子时 */
  FORUM_POST_DELETE = 'FORUM_POST_DELETE',
  /** 当用户回复评论时 */
  FORUM_REPLY_CREATE = 'FORUM_REPLY_CREATE',
  /** 当用户回复评论时 */
  FORUM_REPLY_DELETE = 'FORUM_REPLY_DELETE',
  /** 当用户发表审核通过时 */
  FORUM_PUBLISH_AUDIT_RESULT = 'FORUM_PUBLISH_AUDIT_RESULT',
  /** 音频开始播放时 */
  AUDIO_START = 'AUDIO_START',
  /** 音频播放结束时 */
  AUDIO_FINISH = 'AUDIO_FINISH',
  /** 上麦时 */
  AUDIO_ON_MIC = 'AUDIO_ON_MIC',
  /** 下麦时 */
  AUDIO_OFF_MIC = 'AUDIO_OFF_MIC',
  /** 当收到@机器人的消息时 */
  AT_MESSAGE_CREATE = 'AT_MESSAGE_CREATE',
  /** 当频道的消息被删除时 */
  PUBLIC_MESSAGE_DELETE = 'PUBLIC_MESSAGE_DELETE',
}

/**
 * 子事件基类
 */
export interface Event {
  /** opcode */
  op: Opcode.Dispatch,
  /** 序列号 */
  s: number,
  /** 事件类型 */
  t: EventEnum
}
