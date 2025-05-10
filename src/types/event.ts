/**
 * 需要注意 目前只有私聊可以收到file类型的消息
 */
export type Content_type = 'image/gif' | 'image/jpeg' | 'image/png' | 'file'

/**
 * 富媒体基类
 */
export interface Attachment {
  /** 类型 */
  content_type: Content_type
  /** 未知作用 */
  content?: string
  /** 文件名 */
  filename: string
  /** 图片高度 */
  height?: number
  /** 图片宽度 */
  width?: number
  /** 文件大小 */
  size: number
  /** 文件url */
  url: string
}

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
 * 心跳生命周期事件
 */
export interface HeartbeatEvent {
  /** opcode */
  op: Opcode.Hello,
  /** 事件内容 */
  d: {
    /** 心跳声明周期 */
    heartbeat_interval: number
  }
}

/**
 * 心跳回包事件
 */
export interface HeartbeatACKEvent {
  /** opcode */
  op: Opcode.HeartbeatACK
}

/**
 * 子事件类型
 */
export const enum EventEnum {
  /** 在鉴权成功后下发 代表建立连接成功 */
  READY = 'READY',
  /** 恢复登录状态后 不发遗漏事件完毕下发 */
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
  /** 当收到用户发给机器人的私信消息时 */
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
export interface BaseEvent {
  /** opcode */
  op: Opcode.Dispatch,
  /** 序列号 */
  s: number,
  /** 事件类型 */
  t: EventEnum
}

/**
 * READY子事件
 */
export interface ReadyEvent extends BaseEvent {
  /** 事件类型 */
  t: EventEnum.READY,
  /** 事件内容 */
  d: {
    version: number,
    session_id: string,
    user: {
      /** 机器人的user_id */
      id: string,
      /** 机器人的nickname */
      username: string,
      bot: boolean,
      status: number
    },
    shard: Number[]
  }
}

/**
 * C2C_MESSAGE_CREATE子事件
 */
export interface C2CMsgEvent extends BaseEvent {
  /** 事件类型 */
  t: EventEnum.C2C_MESSAGE_CREATE,
  /** 平台方事件ID 格式: C2C_MESSAGE_CREATE:abc... */
  id: string,
  d: {
    /** 富媒体消息 */
    attachments?: Array<Attachment>,
    /** 发送者信息 */
    author: {
      /** 发送者的id 目前版本和user_openid一致 */
      id: string,
      /** 发送者的user_openid */
      user_openid: string
    }
    /** 消息内容 */
    content: string,
    /** 消息ID message_id */
    id: string,
    /** 消息发送时间 */
    timestamp: string
  }
}

/**
 * GROUP_AT_MESSAGE_CREATE子事件
 */
export interface GroupMsgEvent extends BaseEvent {
  /** 事件类型 */
  t: EventEnum.GROUP_AT_MESSAGE_CREATE,
  /** 平台方事件ID 格式: GROUP_AT_MESSAGE_CREATE:abc... */
  id: string,
  d: {
    /** 富媒体消息 */
    attachments?: Array<Attachment>,
    /** 发送者信息 */
    author: {
      /** 发送者的id 目前版本和user_openid一致 */
      id: string,
      /** 发送者的user_openid */
      member_openid: string
    }
    /** 消息内容 */
    content: string,
    /** 群ID group_id 目前版本和group_openid一致 */
    group_id: string,
    /** 消息ID group_openid */
    group_openid: string,
    /** 消息ID message_id */
    id: string,
    /** 消息发送时间 */
    timestamp: string
  }
}

/**
 * 频道的user信息
 */
export interface GuildUser {
  /** 发送者的头像url */
  avatar: string,
  /** 发送者是否为bot */
  bot: boolean,
  /** 发送者的id */
  id: string,
  /** 发送者的nickname */
  username: string
}

/** 基础消息事件 */
export interface BaseMessageEvent {
  /** 消息ID message_id */
  id: string
  /** 消息内容 */
  content: string
  /** 富媒体消息 */
  attachments?: Array<Attachment>
  /** 消息发送时间 */
  timestamp: string
}

/** Guild 消息的通用结构 */
export interface GuildMemberInfo {
  /** 用户加入频道的时间 ISO8601 timestamp */
  joined_at: string
  /** 用户在频道内的昵称 */
  nick: string
  /** 用户在频道内的身份组ID */
  roles: string[]
}

/** Guild 事件的公共部分 */
export interface GuildBaseEvent extends BaseMessageEvent {
  /** 发送者信息 */
  author: GuildUser
  /** 子频道id */
  channel_id: string
  /** 频道id */
  guild_id: string
  /** 用于消息间的排序 */
  seq: number
  /** 子频道消息 seq */
  seq_in_channel: number
  /** 消息创建者的member信息 */
  member: GuildMemberInfo
  /** 引用消息对象 */
  message_reference?: {
    /** 引用回复的消息 id */
    message_id: string
    /** 是否忽略获取引用消息详情错误，默认否 */
    ignore_get_message_error: boolean
  }
  /** 附件 */
  attachments?: Attachment[]
}

/**
 * 频道文字子频道消息
 */
export interface GuildMsgEvent extends BaseEvent {
  /** 事件类型 */
  t: EventEnum.MESSAGE_CREATE | EventEnum.AT_MESSAGE_CREATE
  /** 平台方事件ID */
  id: string
  /** 事件内容 */
  d: GuildBaseEvent & {
    /** 消息中at的人 */
    mentions: [GuildUser]
    /** 是否at all */
    mention_everyone?: boolean
  }
}

/**
 * 频道私信消息
 */
export interface DirectMsgEvent extends BaseEvent {
  /** 事件类型 */
  t: EventEnum.DIRECT_MESSAGE_CREATE
  /** 平台方事件ID */
  id: string
  /** 事件内容 */
  d: GuildBaseEvent & {
    /** 是否为私信 */
    direct_message: boolean
    /** 消息来源的频道id */
    src_guild_id: string
    /** 未知字段 */
    seq_in_channel: string
  }
}

/**
 * 机器人加入群聊事件
 */
export interface GroupAddRobotEvent extends BaseEvent {
  t: EventEnum.GROUP_ADD_ROBOT
  op: 0,
  /** 平台方消息ID */
  id: string,
  d: {
    /** 加入的时间戳 */
    timestamp: number,
    /** 加入群的群openid */
    group_openid: string,
    /** 操作添加机器人进群的群成员openid */
    op_member_openid: '0337369D1F67F72EA9EEB6287B600488'
  },
}

/**
 * 机器人被移出群聊事件
 */
export interface GroupDelRobotEvent extends BaseEvent {
  t: EventEnum.GROUP_DEL_ROBOT
  op: 0,
  /** 平台方消息ID */
  id: string,
  d: {
    /** 移出的时间戳 */
    timestamp: number,
    /** 移出群的群openid */
    group_openid: string,
    /** 操作移出机器人的群成员openid */
    op_member_openid: '0337369D1F67F72EA9EEB6287B600488'
  },
}

/**
 * 群聊拒绝机器人主动消息
 */
export interface GroupMsgRejectEvent extends BaseEvent {
  t: EventEnum.GROUP_MSG_REJECT
  op: 0,
  /** 平台方消息ID */
  id: string,
  d: {
    /** 操作时间戳 */
    timestamp: number,
    /** 操作群的群openid */
    group_openid: string,
    /** 操作拒绝机器人主动消息的群成员openid */
    op_member_openid: '0337369D1F67F72EA9EEB6287B600488'
  },
}

/**
 * 群聊接受机器人主动消息
 */
export interface GroupMsgReceiveEvent extends BaseEvent {
  t: EventEnum.GROUP_MSG_RECEIVE
  op: 0,
  /** 平台方消息ID */
  id: string,
  d: {
    /** 操作时间戳 */
    timestamp: number,
    /** 操作群的群openid */
    group_openid: string,
    /** 操作接受机器人主动消息的群成员openid */
    op_member_openid: '0337369D1F67F72EA9EEB6287B600488'
  },
}

/**
 * 用户添加机器人事件
 */
export interface FriendAddEvent extends BaseEvent {
  t: EventEnum.FRIEND_ADD
  op: 0,
  /** 平台方消息ID */
  id: string,
  d: {
    /** 添加时间戳 */
    timestamp: number,
    /** 添加机器人的用户openid */
    openid: string,
  },
}

/**
 * 用户删除机器人事件
 */
export interface FriendDelEvent extends BaseEvent {
  t: EventEnum.FRIEND_DEL
  op: 0,
  /** 平台方消息ID */
  id: string,
  d: {
    /** 删除时间戳 */
    timestamp: number,
    /** 删除机器人的用户openid */
    openid: string,
  },
}

/**
 * 用户在机器人资料卡手动关闭"主动消息"推送
 */
export interface C2CMsgRejectEvent extends BaseEvent {
  t: EventEnum.C2C_MSG_REJECT
  op: 0,
  /** 平台方消息ID */
  id: string,
  d: {
    /** 操作时间戳 */
    timestamp: number,
    /** 操作关闭主动消息推送的用户openid */
    openid: string,
  },
}

/**
 * 用户在机器人资料卡手动开启"主动消息"推送开关
 */
export interface C2CMsgReceiveEvent extends BaseEvent {
  t: EventEnum.C2C_MSG_RECEIVE
  op: 0,
  /** 平台方消息ID */
  id: string,
  d: {
    /** 操作时间戳 */
    timestamp: number,
    /** 操作开启主动消息推送的用户openid */
    openid: string,
  },
}

/**
 * 所有事件
 */
export type Event = ReadyEvent
  | C2CMsgEvent
  | GroupMsgEvent
  | GuildMsgEvent
  | DirectMsgEvent
  | GroupAddRobotEvent
  | GroupDelRobotEvent
  | GroupMsgRejectEvent
  | GroupMsgReceiveEvent
  | FriendAddEvent
  | FriendDelEvent
  | C2CMsgRejectEvent
  | C2CMsgReceiveEvent
