import { Opcode } from './opcode'

/**
 * 富媒体内容类型
 * file 类型仅在私聊出现
 */
export type ContentType = 'image/gif' | 'image/jpeg' | 'image/png' | 'file' | 'video/mp4' | 'voice'

/**
 * 富媒体附件
 */
export interface Attachment {
  /** 类型 */
  content_type: ContentType
  content?: string
  filename: string
  height?: number
  width?: number
  size: number
  url: string
  /** 语音 wav 格式链接 */
  voice_wav_url?: string
  /** 语音 ASR 参考结果 */
  asr_refer_text?: string
}

/**
 * 子事件类型
 */
export const enum EventEnum {
  READY = 'READY',
  RESUMED = 'RESUMED',
  /** 频道消息（所有消息，需要私域权限） */
  MESSAGE_CREATE = 'MESSAGE_CREATE',
  /** @机器人的频道消息（公域可收） */
  AT_MESSAGE_CREATE = 'AT_MESSAGE_CREATE',
  /** 频道私信 */
  DIRECT_MESSAGE_CREATE = 'DIRECT_MESSAGE_CREATE',
  /** 用户单聊机器人 */
  C2C_MESSAGE_CREATE = 'C2C_MESSAGE_CREATE',
  /** 群聊 @机器人 */
  GROUP_AT_MESSAGE_CREATE = 'GROUP_AT_MESSAGE_CREATE',
  /** 群聊普通消息（需开通对应 intents） */
  GROUP_MESSAGE_CREATE = 'GROUP_MESSAGE_CREATE',
  /** 群成员加入 */
  GROUP_MEMBER_ADD = 'GROUP_MEMBER_ADD',
  /** 群成员退出 */
  GROUP_MEMBER_REMOVE = 'GROUP_MEMBER_REMOVE',
  /** 用户添加机器人 */
  FRIEND_ADD = 'FRIEND_ADD',
  /** 用户删除机器人 */
  FRIEND_DEL = 'FRIEND_DEL',
  /** 单聊关闭主动消息 */
  C2C_MSG_REJECT = 'C2C_MSG_REJECT',
  /** 单聊开启主动消息 */
  C2C_MSG_RECEIVE = 'C2C_MSG_RECEIVE',
  /** 机器人入群 */
  GROUP_ADD_ROBOT = 'GROUP_ADD_ROBOT',
  /** 机器人退群 */
  GROUP_DEL_ROBOT = 'GROUP_DEL_ROBOT',
  /** 群关闭主动消息 */
  GROUP_MSG_REJECT = 'GROUP_MSG_REJECT',
  /** 群开启主动消息 */
  GROUP_MSG_RECEIVE = 'GROUP_MSG_RECEIVE',
  /** 互动事件（按钮回调等） */
  INTERACTION_CREATE = 'INTERACTION_CREATE',
  /** 消息审核通过 */
  MESSAGE_AUDIT_PASS = 'MESSAGE_AUDIT_PASS',
  /** 消息审核不通过 */
  MESSAGE_AUDIT_REJECT = 'MESSAGE_AUDIT_REJECT',
}

/**
 * QQ 消息发送者
 * 群聊使用 member_openid；单聊使用 user_openid
 */
export interface QQAuthor {
  /** 与 user_openid / member_openid 一致 */
  id: string
  /** 单聊场景 */
  user_openid?: string
  /** 群聊场景 */
  member_openid?: string
  /**
   * 消息发送者在群内的身份。
   * 仅群聊消息事件提供，取值由 QQ 官方定义。
   */
  member_role?: 'owner' | 'admin' | 'member'
  /** 互联应用 openid，未开通为空字符串 */
  union_openid?: string
  /** 群/QQ 昵称 */
  username?: string
  /** 是否机器人 */
  bot?: boolean
}

/**
 * QQ 群消息 mentions 元素
 */
export interface QQMention {
  bot: boolean
  id: string
  member_openid: string
  /** 是否 @ 当前机器人 */
  is_you: boolean
  /** 'single' | 'everyone' | 其他 */
  scope: string
  username: string
}

/**
 * 消息场景
 */
export interface MessageScene {
  /** 形如 ['msg_idx=REFIDX_xxx'] */
  ext?: string[]
  /** 'default' | 其他 */
  source?: string
}

/**
 * 子事件基类
 */
export interface BaseEvent {
  op: Opcode.Dispatch
  s: number
  t: EventEnum
}

/**
 * READY 事件
 */
export interface ReadyEvent extends BaseEvent {
  t: EventEnum.READY
  d: {
    version: number
    session_id: string
    user: {
      id: string
      username: string
      bot: boolean
      status: number
    }
    shard: number[]
  }
}

/**
 * RESUMED 事件
 */
export interface ResumedEvent extends BaseEvent {
  t: EventEnum.RESUMED
}

/**
 * C2C_MESSAGE_CREATE 单聊消息
 */
export interface C2CMsgEvent extends BaseEvent {
  t: EventEnum.C2C_MESSAGE_CREATE
  id: string
  d: {
    author: QQAuthor
    content: string
    id: string
    timestamp: string
    attachments?: Attachment[]
    message_scene?: MessageScene
    /** 0 普通消息 */
    message_type?: number
  }
}

/**
 * 群聊消息
 * - GROUP_AT_MESSAGE_CREATE：@机器人
 * - GROUP_MESSAGE_CREATE：群内全部消息，含 mentions
 */
export interface GroupMsgEvent extends BaseEvent {
  t: EventEnum.GROUP_AT_MESSAGE_CREATE | EventEnum.GROUP_MESSAGE_CREATE
  id: string
  d: {
    author: QQAuthor
    content: string
    /** 与 group_openid 一致 */
    group_id: string
    group_openid: string
    /** 消息 ID */
    id: string
    timestamp: string
    attachments?: Attachment[]
    /** GROUP_MESSAGE_CREATE 必带；GROUP_AT_MESSAGE_CREATE 也开始下发 */
    mentions?: QQMention[]
    message_scene?: MessageScene
    /** 0 普通消息 */
    message_type?: number
  }
}

/**
 * 频道用户
 */
export interface GuildUser {
  avatar: string
  bot: boolean
  id: string
  username: string
}

/**
 * 频道成员信息
 */
export interface GuildMember {
  joined_at: string
  nick: string
  roles: string[]
}

/**
 * 频道消息公共字段
 */
export interface GuildBaseEvent {
  id: string
  content: string
  timestamp: string
  author: GuildUser
  channel_id: string
  guild_id: string
  seq: number
  seq_in_channel: number
  member: GuildMember
  message_reference?: {
    message_id: string
    ignore_get_message_error: boolean
  }
  attachments?: Attachment[]
}

/**
 * MESSAGE_CREATE / AT_MESSAGE_CREATE 频道消息
 */
export interface GuildMsgEvent extends BaseEvent {
  t: EventEnum.MESSAGE_CREATE | EventEnum.AT_MESSAGE_CREATE
  id: string
  d: GuildBaseEvent & {
    mentions?: GuildUser[]
    mention_everyone?: boolean
  }
}

/**
 * DIRECT_MESSAGE_CREATE 频道私信
 */
export interface DirectMsgEvent extends BaseEvent {
  t: EventEnum.DIRECT_MESSAGE_CREATE
  id: string
  d: GuildBaseEvent & {
    direct_message: boolean
    src_guild_id: string
  }
}

/**
 * 机器人入群
 */
export interface GroupAddRobotEvent extends BaseEvent {
  t: EventEnum.GROUP_ADD_ROBOT
  id: string
  d: {
    timestamp: number
    group_openid: string
    op_member_openid: string
  }
}

/**
 * 机器人退群
 */
export interface GroupDelRobotEvent extends BaseEvent {
  t: EventEnum.GROUP_DEL_ROBOT
  id: string
  d: {
    timestamp: number
    group_openid: string
    op_member_openid: string
  }
}

/**
 * 群成员加入事件。
 *
 * 官方事件只提供加入成员的 `member_openid`，不提供操作人或加入方式。
 */
export interface GroupMemberAddEvent extends BaseEvent {
  t: EventEnum.GROUP_MEMBER_ADD
  id: string
  d: {
    timestamp: number
    group_openid: string
    member_openid: string
  }
}

/**
 * 群成员退出事件。
 *
 * 官方事件只提供退出成员的 `member_openid`，不提供操作人或退出原因。
 */
export interface GroupMemberRemoveEvent extends BaseEvent {
  t: EventEnum.GROUP_MEMBER_REMOVE
  id: string
  d: {
    timestamp: number
    group_openid: string
    member_openid: string
  }
}

/**
 * 群拒绝机器人主动消息
 */
export interface GroupMsgRejectEvent extends BaseEvent {
  t: EventEnum.GROUP_MSG_REJECT
  id: string
  d: {
    timestamp: number
    group_openid: string
    op_member_openid: string
  }
}

/**
 * 群接受机器人主动消息
 */
export interface GroupMsgReceiveEvent extends BaseEvent {
  t: EventEnum.GROUP_MSG_RECEIVE
  id: string
  d: {
    timestamp: number
    group_openid: string
    op_member_openid: string
  }
}

/**
 * 添加好友
 */
export interface FriendAddEvent extends BaseEvent {
  t: EventEnum.FRIEND_ADD
  id: string
  d: {
    timestamp: number
    openid: string
    scene?: number
    scene_param?: string
  }
}

/**
 * 删除好友
 */
export interface FriendDelEvent extends BaseEvent {
  t: EventEnum.FRIEND_DEL
  id: string
  d: {
    timestamp: number
    openid: string
  }
}

/**
 * 单聊关闭主动消息
 */
export interface C2CMsgRejectEvent extends BaseEvent {
  t: EventEnum.C2C_MSG_REJECT
  id: string
  d: {
    timestamp: number
    openid: string
  }
}

/**
 * 单聊开启主动消息
 */
export interface C2CMsgReceiveEvent extends BaseEvent {
  t: EventEnum.C2C_MSG_RECEIVE
  id: string
  d: {
    timestamp: number
    openid: string
  }
}

/**
 * 互动事件（按钮点击 / 单聊快捷菜单）
 */
export interface InteractionEvent extends BaseEvent {
  t: EventEnum.INTERACTION_CREATE
  id: string
  d: {
    /** 11 消息按钮，12 单聊快捷菜单 */
    type: number
    /** c2c / group / guild */
    scene: 'c2c' | 'group' | 'guild' | string
    /** 0 频道，1 群聊，2 单聊 */
    chat_type: 0 | 1 | 2
    timestamp: string
    guild_id?: string
    channel_id?: string
    user_openid?: string
    group_openid?: string
    group_member_openid?: string
    data: {
      resolved: {
        button_data: string
        button_id: string
        user_id?: string
        feature_id?: string
        message_id?: string
      }
    }
    version: number
  }
}

/**
 * 消息审核通过
 */
export interface MessageAuditPassEvent extends BaseEvent {
  t: EventEnum.MESSAGE_AUDIT_PASS
  id: string
  d: {
    audit_id: string
    message_id?: string
    guild_id: string
    channel_id: string
    audit_time: string
    create_time: string
    seq_in_channel?: string
  }
}

/**
 * 消息审核不通过
 */
export interface MessageAuditRejectEvent extends BaseEvent {
  t: EventEnum.MESSAGE_AUDIT_REJECT
  id: string
  d: {
    audit_id: string
    message_id?: string
    guild_id: string
    channel_id: string
    audit_time: string
    create_time: string
    seq_in_channel?: string
  }
}

/**
 * 全部子事件联合
 */
export type Event =
  | ReadyEvent
  | ResumedEvent
  | C2CMsgEvent
  | GroupMsgEvent
  | GuildMsgEvent
  | DirectMsgEvent
  | GroupAddRobotEvent
  | GroupDelRobotEvent
  | GroupMemberAddEvent
  | GroupMemberRemoveEvent
  | GroupMsgRejectEvent
  | GroupMsgReceiveEvent
  | FriendAddEvent
  | FriendDelEvent
  | C2CMsgRejectEvent
  | C2CMsgReceiveEvent
  | InteractionEvent
  | MessageAuditPassEvent
  | MessageAuditRejectEvent
