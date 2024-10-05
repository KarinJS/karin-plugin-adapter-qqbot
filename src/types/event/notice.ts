import { Event, EventEnum, Opcode } from './base'

/**
 * 心跳生命周期主事件
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
 * 心跳回包主事件
 */
export interface HeartbeatACKEvent {
  /** opcode */
  op: Opcode.HeartbeatACK
}

/**
 * 恢复登录状态子事件
 */
export interface ResumedEvent extends Event {
  /** 事件类型 */
  t: EventEnum.RESUMED
  /** 空值 */
  d: string
}

/**
 * READY子事件
 */
export interface ReadyEvent extends Event {
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
      /** 是否为Bot */
      bot: boolean,
      status: number
    },
    shard: Number[]
  }
}

/** 所有通知事件 */
export type NoticeEvent = ResumedEvent | ReadyEvent
