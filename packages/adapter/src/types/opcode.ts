/**
 * WebSocket Opcode
 *
 * Receive 客户端接收到服务端 push 的消息
 * Send 客户端发送消息
 * Reply 客户端接收到服务端发送的消息之后的回包（HTTP 回调模式）
 */
export const enum Opcode {
  /** [Receive] 服务端进行消息推送 */
  Dispatch = 0,
  /** [Send/Receive] 客户端或服务端发送心跳 */
  Heartbeat = 1,
  /** [Send] 客户端发送鉴权 */
  Identify = 2,
  /** [Send] 客户端恢复连接 */
  Resume = 6,
  /** [Receive] 服务端通知客户端重新连接 */
  Reconnect = 7,
  /** [Receive] identify / resume 时参数有误 */
  InvalidSession = 9,
  /** [Receive] 网关下发的第一条消息 */
  Hello = 10,
  /** [Receive/Reply] 心跳确认 */
  HeartbeatACK = 11,
  /** [Reply] HTTP 回调模式回包 */
  HTTPCallbackACK = 12,
  /** [Receive] Webhook URL 校验回调 */
  WebhookValidation = 13,
}

/** Identify 鉴权 */
export interface IdentifyPayload {
  op: Opcode.Identify
  d: {
    token: string
    intents: number
    shard: [number, number]
    properties: { $os: string; $browser: string; $device: string }
  }
}

/** Resume 恢复连接 */
export interface ResumePayload {
  op: Opcode.Resume
  d: {
    token: string
    session_id: string
    seq: number
  }
}

/** Heartbeat 心跳 */
export interface HeartbeatPayload {
  op: Opcode.Heartbeat
  d: number | null
}

/** Hello 服务端首条消息 */
export interface HelloPayload {
  op: Opcode.Hello
  d: { heartbeat_interval: number }
}

/** HeartbeatACK */
export interface HeartbeatACKPayload {
  op: Opcode.HeartbeatACK
}

/** Webhook 鉴权回调 */
export interface WebhookValidationPayload {
  op: Opcode.WebhookValidation
  d: {
    plain_token: string
    event_ts: string
  }
}
