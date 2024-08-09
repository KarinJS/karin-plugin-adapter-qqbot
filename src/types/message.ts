import { ArkType, KeyboardType, MarkdownType } from 'node-karin'
import { MediaType } from './media'

/**
 * 请求路径类型
 */
export const enum PathType {
  Groups = 'groups',
  Friends = 'users'
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
  Media = 7
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
  Files = 'files'
}

/**
 * 被动消息ID类型
 */
export const enum IdType {
  MsgID = 'msg_id',
  EventID = 'event_id'
}

/**
 * 被动消息Seq
 */
export const enum SeqType {
  MsgSeq = 'msg_seq'
}

/**
 * 发送消息请求参数
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
  message_reference?: object
  /** 平台方事件ID，可以用于被动消息发送 */
  [IdType.EventID]?: string
  /** 平台方消息ID，可以用于被动消息发送 */
  [IdType.MsgID]?: string
  /** 回复消息的序号 相同的 msg_id + msg_seq 重复发送会失败 */
  [SeqType.MsgSeq]?: number
}
