import { Attachment } from '../media'
import { Event, EventEnum } from '../event/'

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

/** 公共发送者信息 */
export interface BaseAuthor {
  /** 发送者的id */
  id: string
}

/** C2C 消息的发送者信息 */
export interface C2CAuthor extends BaseAuthor {
  /** 发送者的user_openid */
  user_openid: string
}

/** Group 消息的发送者信息 */
export interface GroupAuthor extends BaseAuthor {
  /** 发送者的member_openid */
  member_openid: string
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
  attachments?: [Attachment]
}

/**
 * C2C_MESSAGE_CREATE子事件
 */
export interface C2CMessageEvent extends Event {
  /** 事件类型 */
  t: EventEnum.C2C_MESSAGE_CREATE
  /** 平台方消息ID 格式: C2C_MESSAGE_CREATE:abc... */
  id: string
  /** 事件内容 */
  d: BaseMessageEvent & {
    /** 发送者信息 */
    author: C2CAuthor
  }
}

/**
 * GROUP_AT_MESSAGE_CREATE子事件
 */
export interface GroupAtMessageEvent extends Event {
  /** 事件类型 */
  t: EventEnum.GROUP_AT_MESSAGE_CREATE
  /** 平台方消息ID 格式: GROUP_AT_MESSAGE_CREATE:abc... */
  id: string
  /** 事件内容 */
  d: BaseMessageEvent & {
    /** 发送者信息 */
    author: GroupAuthor
    /** 群ID group_id 目前版本和group_openid一致 */
    group_id: string
    /** 消息ID group_openid */
    group_openid: string
  }
}

/**
 * 频道文字子频道消息
 */
export interface GuildMessageEvent extends Event {
  /** 事件类型 */
  t: EventEnum.MESSAGE_CREATE | EventEnum.AT_MESSAGE_CREATE
  /** 平台方消息ID */
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
export interface GuildMessageDirectEvent extends Event {
  /** 事件类型 */
  t: EventEnum.DIRECT_MESSAGE_CREATE
  /** 平台方消息ID */
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

/** 全部消息事件 */
export type MessageEvent = C2CMessageEvent | GroupAtMessageEvent | GuildMessageEvent | GuildMessageDirectEvent
