import { MediaType } from './media'
import { ArkType, KeyboardType, MarkdownType } from 'node-karin'

/**
 * 请求路径类型
 */
export const enum PathType {
  /** 群 */
  Groups = 'groups',
  /** 单聊 */
  Friends = 'users',
  /** 子频道 */
  Channels = 'channels',
  /** 频道私信 */
  Dms = 'dms',
}

/**
 * 消息类型
 */
export const enum MessageType {
  /**
   * 文本消息
   */
  Text = 0,
  /**
   * markdown消息
   */
  Markdown = 2,
  /**
   * ark消息
   */
  Ark = 3,
  /**
   * embed消息
   */
  Embed = 4,
  /**
   * 富媒体消息
   */
  Media = 7,
}

/**
 * v2接口枚举
 */
export const enum V2ApiType {
  /**
   * 发送消息
   */
  Message = 'messages',
  /**
   * 上传富媒体文件
   */
  Files = 'files',
}

/**
 * 被动消息ID类型
 */
export const enum IdType {
  MsgID = 'msg_id',
  EventID = 'event_id',
}

/**
 * 被动消息Seq
 */
export const enum SeqType {
  MsgSeq = 'msg_seq',
}

/**
 * 引用消息对象
 */
export interface MessageReference {
  /** 引用回复的消息 id */
  message_id: string,
  /** 是否忽略获取引用消息详情错误，默认否 */
  ignore_get_message_error: boolean
}

/**
 * 群、单聊发送消息请求参数
 */
export interface SendMessageOptions {
  /** 文本内容 没有传空格 */
  content: string
  /** 消息类型 */
  msg_type: MessageType
  /** markdown消息 */
  markdown?: MarkdownType<boolean>
  /** keyboard按钮消息 */
  keyboard?: KeyboardType<boolean>
  /** ark消息 */
  ark?: ArkType
  /** 富媒体消息 */
  media?: MediaType
  /** 【暂未支持】消息引用 */
  message_reference?: MessageReference
  /** 平台方事件ID，可以用于被动消息发送 */
  [IdType.EventID]?: string
  /** 平台方消息ID，可以用于被动消息发送 */
  [IdType.MsgID]?: string
  /** 回复消息的序号 相同的 msg_id + msg_seq 重复发送会失败 */
  [SeqType.MsgSeq]?: number
}

/**
 * 频道发送消息请求参数
 */
export interface SendChannelMessageOptionsJson {
  /** 文本内容 没有传空格 */
  content?: string
  /** markdown消息 */
  markdown?: MarkdownType<boolean>
  /** keyboard按钮消息 */
  keyboard?: KeyboardType<boolean>
  /** ark消息 */
  ark?: ArkType
  /** 富媒体消息 */
  media?: MediaType
  /** 平台方事件ID，可以用于被动消息发送 */
  [IdType.EventID]?: string
  /** 平台方消息ID，可以用于被动消息发送 */
  [IdType.MsgID]?: string
  /** 图片url地址，平台会转存该图片，用于下发图片消息 */
  image?: string
  /** todo: embed 消息 */
  embed?: any
  /** 消息引用 */
  message_reference?: MessageReference
}

/**
 * 频道发送消息请求参数
 */
export type SendChannelMessageOptions = SendChannelMessageOptionsJson | FormData

/**
 * 发送消息请求参数
 */
export type SendMessageOptionsJson = SendChannelMessageOptions & SendMessageOptions
