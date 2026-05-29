import os from 'node:os'
import { WebSocket } from 'node-karin/ws'
import { log } from '@/utils/logger'
import { Opcode } from '@/types/opcode'
import { formatWSClose } from './error'
import type { Event } from '@/types/event'

/** 关闭原因 */
export type CloseReason =
  | 'manual'         // 上层主动关闭
  | 'auth_fail'      // op:9 鉴权失败
  | 'reconnect'      // op:7 服务端要求重连
  | 'session_lost'   // Resume 失败
  | 'error'          // 网络异常
  | 'closed'         // 服务端主动 close

export interface WSClientOptions {
  appId: string
  gatewayUrl: string
  /** 每次 Identify / Resume 都通过此函数获取最新 token */
  getAccessToken: () => string
  intents: number
  /** 收到 Dispatch 事件后回调（s 已自动更新到 client 内部，但回调里也会再传一遍） */
  onEvent: (ev: Event) => void
  /** 关闭时回调，由上层决定要不要重连 */
  onClose: (reason: CloseReason) => void
  /** 上次连接的 session_id 与 seq，传入则尝试 Resume */
  resume?: { sessionId: string; seq: number }
}

/**
 * 单连接生命周期
 */
export class WSClient {
  private readonly opts: WSClientOptions
  private socket?: WebSocket
  private heartbeatTimer?: NodeJS.Timeout
  private heartbeatInterval = 45000
  private sessionId = ''
  private seq = 0
  private closed = false
  private closedReason: CloseReason = 'manual'

  constructor (opts: WSClientOptions) {
    this.opts = opts
    if (opts.resume) {
      this.sessionId = opts.resume.sessionId
      this.seq = opts.resume.seq
    }
  }

  /** 连接的快照，用于上层 Resume */
  snapshot () {
    return { sessionId: this.sessionId, seq: this.seq }
  }

  start () {
    const ws = new WebSocket(this.opts.gatewayUrl)
    this.socket = ws

    ws.on('open', () => {
      log('debug', `${this.opts.appId}: WebSocket opened (${this.opts.gatewayUrl})`)
    })

    ws.on('close', (code, reason) => {
      const reasonStr = reason?.toString() || '(empty)'
      const closeInfo = formatWSClose(code, reasonStr)
      log('error', `${this.opts.appId}: WebSocket 关闭 | ${closeInfo}`)
      if (this.closed) return
      this.close('closed')
    })

    ws.on('error', (err) => {
      log('error', `${this.opts.appId}: WebSocket error:`, err)
      if (this.closed) return
      this.close('error')
    })

    ws.on('unexpected-response', (_req, res) => {
      log('error', `${this.opts.appId}: WebSocket unexpected-response status=${res.statusCode} ${res.statusMessage}`)
    })

    ws.on('message', (raw) => this.onMessage(raw))
  }

  /**
   * 主动关闭
   */
  stop () {
    this.close('manual')
  }

  private close (reason: CloseReason) {
    if (this.closed) return
    this.closed = true
    this.closedReason = reason
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
    try {
      this.socket?.removeAllListeners()
      this.socket?.close()
    } catch { /* ignore */ }
    this.opts.onClose(reason)
  }

  private send (payload: object) {
    try {
      this.socket?.send(JSON.stringify(payload))
    } catch (err) {
      log('error', `${this.opts.appId}: send failed`, err)
    }
  }

  private startHeartbeat () {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = setInterval(() => {
      if (this.closed) return
      this.send({ op: Opcode.Heartbeat, d: this.seq || null })
    }, this.heartbeatInterval)
  }

  private identify () {
    this.send({
      op: Opcode.Identify,
      d: {
        token: `QQBot ${this.opts.getAccessToken()}`,
        intents: this.opts.intents,
        shard: [0, 1],
        properties: {
          $os: os.type(),
          $browser: '@karinjs/adapter-qqbot',
          $device: '@karinjs/adapter-qqbot',
        },
      },
    })
    log('debug', `${this.opts.appId}: Identify sent, intents=${this.opts.intents}`)
  }

  private resume () {
    this.send({
      op: Opcode.Resume,
      d: {
        token: `QQBot ${this.opts.getAccessToken()}`,
        session_id: this.sessionId,
        seq: this.seq,
      },
    })
    log('debug', `${this.opts.appId}: Resume sent, session=${this.sessionId}, seq=${this.seq}`)
  }

  private onMessage (raw: WebSocket.RawData) {
    const text = raw.toString()
    let msg: any
    try {
      msg = JSON.parse(text)
    } catch {
      log('error', `${this.opts.appId}: non-JSON message: ${text}`)
      return
    }

    // 全量入站日志（debug）：op + t + s + 截断 payload
    log(
      'debug',
      `${this.opts.appId}: << op=${msg.op} t=${msg.t ?? '-'} s=${msg.s ?? '-'} ` +
      `body=${text.length > 500 ? text.slice(0, 500) + '...' : text}`
    )

    switch (msg.op) {
      case Opcode.Hello: {
        this.heartbeatInterval = msg.d?.heartbeat_interval || 45000
        log('debug', `${this.opts.appId}: Hello received, heartbeat_interval=${this.heartbeatInterval}ms, session=${this.sessionId || '(none)'} seq=${this.seq}`)
        this.startHeartbeat()
        if (this.sessionId && this.seq) this.resume()
        else this.identify()
        break
      }
      case Opcode.HeartbeatACK:
        log('debug', `${this.opts.appId}: HeartbeatACK`)
        break
      case Opcode.Dispatch: {
        if (typeof msg.s === 'number') this.seq = msg.s
        if (msg.t === 'READY') {
          this.sessionId = msg.d?.session_id || ''
          log('debug', `${this.opts.appId}: READY received, session_id=${this.sessionId}`)
        }
        try {
          this.opts.onEvent(msg as Event)
        } catch (err) {
          log('error', `${this.opts.appId}: onEvent handler threw:`, err)
        }
        break
      }
      case Opcode.Reconnect: {
        log('debug', `${this.opts.appId}: server asked reconnect (op:7)`)
        this.close('reconnect')
        break
      }
      case Opcode.InvalidSession: {
        if (this.sessionId) {
          log('debug', `${this.opts.appId}: invalid session, will retry with fresh identify`)
          this.sessionId = ''
          this.seq = 0
          this.close('session_lost')
        } else {
          log('error', `${this.opts.appId}: auth_fail (op:9 with no prior session)`)
          this.close('auth_fail')
        }
        break
      }
      default:
        log('debug', `${this.opts.appId}: unhandled opcode ${msg.op}`)
    }
  }
}
