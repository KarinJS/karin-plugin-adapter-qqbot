import axios from 'node-karin/axios'
import { log } from '@/utils/logger'
import { random } from '@/utils/common'
import { getBotAccessToken } from '@/core/internal/axios'
import { dispatch } from '@/connection/transport'
import { WSClient, type CloseReason } from './client'
import { computeMax, computeFallback, formatIntentNames, intentBitMap } from './intents'
import type { QQBotConfig } from '@/types/config'

interface ManagedConn {
  client: WSClient
  cfg: QQBotConfig
  intents: number
  /** 探测过的 intents 历史，仅在汇总日志时使用 */
  intentHistory: number[]
}

const conns = new Map<string, ManagedConn>()

/** 获取网关地址 */
const fetchGateway = async (cfg: QQBotConfig): Promise<string> => {
  const apiUrl = cfg.sandbox ? cfg.sandboxApi : cfg.prodApi
  const accessToken = getBotAccessToken(cfg.appId)
  if (!accessToken) throw new Error('no access_token')
  const { data } = await axios.get(`${apiUrl}/gateway`, {
    headers: { Authorization: `QQBot ${accessToken}` },
  })
  if (!data?.url) throw new Error('gateway url empty')
  return data.url
}

/** 重连退避（毫秒） */
const backoff = (attempt: number): number =>
  Math.min(30_000, 1500 * 2 ** Math.min(attempt, 5)) + random(0, 1500)

/**
 * 打印 intents 探测汇总
 */
const summarize = (appId: string, finalIntents: number, success: boolean) => {
  const conn = conns.get(appId)
  if (!conn || conn.intentHistory.length <= 1) return
  const initial = conn.intentHistory[0]
  const removed: string[] = []
  for (let i = 1; i < conn.intentHistory.length; i++) {
    const diff = conn.intentHistory[i - 1] ^ conn.intentHistory[i]
    for (const [bit, name] of Object.entries(intentBitMap)) {
      if (diff & Number(bit)) removed.push(name.trim())
    }
  }
  log('debug', [
    `${appId}: intents ${success ? '探测完成 | Probe Done' : '探测失败 | Probe Failed'}`,
    `  ├─ 初始 / Initial: ${initial}`,
    `  ├─ 最终 / Final  : ${finalIntents}`,
    formatIntentNames(finalIntents, '  │   '),
    `  └─ 被移除 / Removed: ${removed.join(', ') || '无'}`,
  ].join('\n'))
  conn.intentHistory = []
}

/**
 * 启动连接
 */
export const start = async (cfg: QQBotConfig): Promise<void> => {
  if (cfg.event.type !== 2) return
  if (!cfg.appId) return

  // 已存在则先停掉
  if (conns.has(cfg.appId)) {
    stop(cfg.appId)
  }

  const intents = computeMax()
  await connect(cfg, intents, 0)
}

/**
 * 内部连接 + 重试
 */
const connect = async (
  cfg: QQBotConfig,
  intents: number,
  attempt: number,
  resume?: { sessionId: string; seq: number }
) => {
  let gatewayUrl: string
  try {
    gatewayUrl = await fetchGateway(cfg)
  } catch (err) {
    log('error', `${cfg.appId}: 获取 WSS 地址失败:`, err)
    const delay = backoff(attempt)
    setTimeout(() => connect(cfg, intents, attempt + 1), delay)
    return
  }

  const client = new WSClient({
    appId: cfg.appId,
    gatewayUrl,
    getAccessToken: () => getBotAccessToken(cfg.appId) || '',
    intents,
    resume,
    onEvent: (ev) => {
      if (ev.t === 'READY') summarize(cfg.appId, intents, true)
      dispatch(cfg.appId, ev)
    },
    onClose: (reason) => onClose(cfg, intents, attempt, reason, client),
  })

  // 初次创建时记录 history
  let prev = conns.get(cfg.appId)
  if (!prev || prev.intentHistory.length === 0) {
    conns.set(cfg.appId, {
      client, cfg, intents,
      intentHistory: prev?.intentHistory.length ? [...prev.intentHistory, intents] : [intents],
    })
  } else {
    prev.client = client
    prev.cfg = cfg
    prev.intents = intents
    prev.intentHistory.push(intents)
  }

  client.start()
}

/**
 * 关闭回调处理
 */
const onClose = (
  cfg: QQBotConfig,
  intents: number,
  attempt: number,
  reason: CloseReason,
  client: WSClient
) => {
  const conn = conns.get(cfg.appId)
  // 上层主动 stop()
  if (reason === 'manual') {
    conns.delete(cfg.appId)
    log('debug', `${cfg.appId}: WebSocket 已主动关闭`)
    return
  }

  // intents 不可用 → 回退
  if (reason === 'auth_fail') {
    const fallback = computeFallback(intents)
    if (fallback && fallback !== intents) {
      setTimeout(() => connect(cfg, fallback, 0), 1000)
      return
    }
    summarize(cfg.appId, 0, false)
    log('error', `${cfg.appId}: 鉴权失败，所有 intents 均不可用，请检查机器人是否已上线`)
    conns.delete(cfg.appId)
    return
  }

  // 服务端要求重连：尝试 Resume
  // session_lost：清空 sessionId 后重新 Identify
  // closed/error：尝试 Resume，失败再 fresh
  const snap = client.snapshot()
  const resume = reason === 'session_lost' ? undefined : (snap.sessionId ? snap : undefined)
  const delay = backoff(attempt)
  log('error', `${cfg.appId}: WebSocket 断开 (${reason})，${delay}ms 后重连...`)
  setTimeout(() => connect(cfg, intents, attempt + 1, resume), delay)
}

/**
 * 停止连接
 */
export const stop = (appId: string): boolean => {
  const conn = conns.get(appId)
  if (!conn) return false
  conn.client.stop()
  return true
}

/**
 * 重启连接（配置变化时调用）
 */
export const reload = async (cfg: QQBotConfig): Promise<void> => {
  stop(cfg.appId)
  await start(cfg)
}
