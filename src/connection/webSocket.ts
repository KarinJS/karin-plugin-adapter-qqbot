import axios from 'node-karin/axios'
import { log } from '@/utils'
import os from 'node:os'
import { WebSocket } from 'node-karin/ws'
import { event } from '@/utils/common'
import { getBotAccessToken } from '@/core/internal/axios'
import type { QQBotConfig } from '@/types'

/**
 * 缓存连接
 */
const cache = new Map<string, { socket: WebSocket; close: (isClose?: boolean) => void }>()

/**
 * 记录每个 appid 的 intents 探测历史
 * 用于鉴权失败回退时汇总打印，避免重复输出
 */
const intentProbeHistory = new Map<string, number[]>()

/**
 * 打印 intents 探测汇总日志
 * 整个探测过程只打印一次，包含初始值、最终值和被移除的意图
 */
const logIntentProbeSummary = (appid: string, finalIntents: number, success: boolean) => {
  const history = intentProbeHistory.get(appid)
  if (!history || history.length <= 1) {
    intentProbeHistory.delete(appid)
    return
  }

  const initial = history[0]
  const removed: string[] = []
  for (let i = 1; i < history.length; i++) {
    const diff = history[i - 1] ^ history[i]
    for (const [bit, name] of Object.entries(intentBitMap)) {
      if (diff & Number(bit)) removed.push(name.trim())
    }
  }

  const status = success ? '探测完成 | Probe Done' : '探测失败 | Probe Failed'
  log('debug', [
    `${appid}: intents ${status}`,
    `  ├─ 初始 / Initial: ${initial}`,
    `  ├─ 最终 / Final  : ${finalIntents}`,
    formatIntentNames(finalIntents, '  │   '),
    `  └─ 被移除 / Removed: ${removed.join(', ') || '无'}`,
  ].join('\n'))

  intentProbeHistory.delete(appid)
}

/** intent 名称映射表（中英对照） */
const intentBitMap: Record<number, string> = {
  [1 << 0]: 'GUILDS           (频道生命周期)',
  [1 << 1]: 'GUILD_MEMBERS    (频道成员变更)',
  [1 << 9]: 'GUILD_MESSAGES   (频道消息-私域)',
  [1 << 12]: 'DIRECT_MESSAGE   (频道私信)',
  [1 << 25]: 'GROUP_AND_C2C_EVENT (群聊/单聊消息)',
  [1 << 30]: 'PUBLIC_GUILD_MESSAGES (频道消息-公域)',
}

/**
 * 将 intents 数值解析为可读名称列表
 * @param intents intents 数值
 * @param prefix 每行前缀，用于树形线条延续
 * @returns 人类可读字符串，每行一个意图
 */
const formatIntentNames = (intents: number, prefix = ''): string => {
  const names: string[] = []
  for (const [bit, name] of Object.entries(intentBitMap)) {
    if (intents & Number(bit)) names.push(prefix + name)
  }
  return names.join('\n')
}

/** 所有可能相关的 intents 按优先级排序（从高到低） */
const allPossibleIntents = [
  1 << 1,  // GUILD_MEMBERS
  1 << 9,  // GUILD_MESSAGES (私域)
  1 << 30, // PUBLIC_GUILD_MESSAGES (公域)
  1 << 12, // DIRECT_MESSAGE
  1 << 25, // GROUP_AND_C2C_EVENT
  1 << 0,  // GUILDS
]

/**
 * 计算最大 intents（尝试所有可能）
 * 不依赖配置，由代码自动探测实际可用权限
 */
const computeIntents = (): number =>
  allPossibleIntents.reduce((acc, bit) => acc | bit, 0)

/**
 * 计算下一级回退 intents
 * @param current 当前失败的 intents
 * @returns 去掉最低优先级后的 intents，为 0 时表示无可用 intent
 */
const computeFallbackIntents = (current: number): number => {
  for (let i = 0; i < allPossibleIntents.length; i++) {
    if (current & allPossibleIntents[i]) {
      // 找到当前包含的最高优先级 intent，去掉它
      return current & ~allPossibleIntents[i]
    }
  }
  return 0
}

/**
 * 创建 WebSocket 连接，直连 QQ 官方网关
 * @param config 机器人配置
 * @param currentIntents 当前尝试的 intents（鉴权失败回退时传入）
 */
export const createWebSocketConnection = async (config: QQBotConfig, currentIntents?: number) => {
  if (config.appId === 'default') return
  if (config.event.type !== 2) return

  const appid = config.appId
  const accessToken = getBotAccessToken(appid)
  if (!accessToken) {
    log('error', `${appid}: 未获取到 access_token，无法建立 WebSocket 连接`)
    return
  }

  // 1. 获取官方网关地址
  const apiUrl = config.sandbox ? config.sandboxApi : config.prodApi
  let gatewayUrl: string
  try {
    const { data } = await axios.get(`${apiUrl}/gateway`, {
      headers: { Authorization: `QQBot ${accessToken}` },
    })
    gatewayUrl = data?.url
    if (!gatewayUrl) throw new Error('网关地址为空')
  } catch (e: any) {
    log('error', `${appid}: 获取 WebSocket 网关地址失败: ${e?.message || e}`)
    setTimeout(() => createWebSocketConnection(config, currentIntents), 5000)
    return
  }

  // 计算 intents：首次尝试全部，回退时按优先级递减
  const intents = currentIntents ?? computeIntents()

  const socket = new WebSocket(gatewayUrl)
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let sessionId = ''
  let seq = 0
  let closed = false

  /**
   * 关闭连接
   * @param isClose 是否主动关闭
   * @param noRetry 是否禁止自动重连
   */
  const close = (isClose = false, noRetry = false) => {
    closed = true
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
    try {
      socket.removeAllListeners()
      socket?.close()
    } catch {
      /* ignore */
    }

    const ws = cache.get(appid)
    if (ws) cache.delete(appid)

    if (isClose) {
      log('debug', `${appid}: WebSocket 连接已主动关闭`)
      return
    }

    if (noRetry) {
      log('debug', `${appid}: WebSocket 连接已断开，不重连`)
      return
    }

    log('error', `${appid}: WebSocket 连接已断开，5秒后重连...`)
    setTimeout(() => createWebSocketConnection(config, currentIntents), 5000)
  }

  socket.on('close', () => close(false))
  socket.on('error', (error) => {
    log('error', `${appid}: WebSocket 错误:`, error)
    close()
  })

  socket.on('open', () => {
    log('debug', `${appid}: WebSocket 连接已打开: ${gatewayUrl}`)
  })

  socket.on('message', (raw) => {
    let msg: any
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      log('error', `${appid}: 收到非 JSON 消息: ${raw}`)
      return
    }

    switch (msg.op) {
      // Hello：连接成功后第一条消息，包含心跳间隔
      case 10: {
        const interval = msg.d?.heartbeat_interval || 45000
        heartbeatTimer = setInterval(() => {
          if (closed) return
          socket.send(JSON.stringify({ op: 1, d: seq || null }))
        }, interval)

        // 发送 Identify 鉴权
        socket.send(JSON.stringify({
          op: 2,
          d: {
            token: `QQBot ${accessToken}`,
            intents,
            shard: [0, 1],
            properties: {
              $os: os.type(),
              $browser: '@karinjs/adapter-qqbot',
              $device: '@karinjs/adapter-qqbot',
            },
          },
        }))
        log('debug', `${appid}: Identify 已发送，intents=${intents}`)
        break
      }

      // Heartbeat ACK：心跳确认，无需处理
      case 11:
        break

      // Dispatch：服务端推送事件
      case 0: {
        if (typeof msg.s === 'number') seq = msg.s

        if (msg.t === 'READY') {
          sessionId = msg.d?.session_id || ''
          cache.set(appid, { socket, close })
          logIntentProbeSummary(appid, intents, true)
        } else if (msg.t === 'RESUMED') {
          log('info', `${appid}: WebSocket 连接已恢复`)
        }

        // 转发事件到业务层
        event.emit(appid, msg)
        break
      }

      // Reconnect：服务端通知客户端重新连接
      case 7: {
        log('debug', `${appid}: 服务端通知重新连接`)
        close()
        break
      }

      // Invalid Session：鉴权参数错误
      case 9: {
        const fallback = computeFallbackIntents(intents)
        if (fallback !== intents) {
          // 记录探测历史，中间过程不打印详细日志
          const history = intentProbeHistory.get(appid) ?? []
          if (history.length === 0) history.push(intents)
          history.push(fallback)
          intentProbeHistory.set(appid, history)

          close(false, true)
          setTimeout(() => createWebSocketConnection(config, fallback), 1000)
          return
        }
        // 所有 intents 都不可用，打印汇总后报错
        logIntentProbeSummary(appid, 0, false)
        log('error', `${appid}: 鉴权参数错误，所有 intents 均不可用，请检查机器人是否已上线`)
        close()
        break
      }

      default:
        log('debug', `${appid}: 未处理的 OpCode: ${msg.op}`)
    }
  })
}

/**
 * 停止已有连接
 * @param appid 机器人 appid
 */
export const stopWebSocketConnection = (appid: string) => {
  const result = cache.get(appid)
  if (result) {
    result.close(true)
    return true
  }
  return false
}
