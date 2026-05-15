import axios from 'node-karin/axios'
import { log } from '@/utils/logger'
import { random } from '@/utils/common'
import { getBotAccessToken } from '@/core/internal/axios'
import { dispatch } from '@/connection/transport'
import { WSClient, type CloseReason } from './client'
import { computeMax, computeFallback, formatIntentNames, intentBitMap } from './intents'
import type { QQBotConfig } from '@/types/config'

interface ManagedConn {
  /** 已建立的 client；fetchGateway 阶段为 null */
  client: WSClient | null
  cfg: QQBotConfig
  intents: number
  /** 探测过的 intents 历史 */
  intentHistory: number[]
  /** 待触发的 reconnect / retry 定时器，stop 时需清理 */
  pendingTimer?: NodeJS.Timeout
  /** stop 后置 true，setTimeout 回调启动时检查并提前退出 */
  aborted: boolean
}

const conns = new Map<string, ManagedConn>()

/** /gateway 接口超时（毫秒） */
const GATEWAY_FETCH_TIMEOUT_MS = 5_000

/**
 * 从 prodApi / sandboxApi 推导兜底的 WSS 地址
 * 官方实际长期返回的也是 wss://{host}/websocket/，不依赖 /gateway 也能直连
 */
const buildFallbackWssUrl = (cfg: QQBotConfig): string => {
  const apiUrl = cfg.sandbox ? cfg.sandboxApi : cfg.prodApi
  const wss = apiUrl.replace(/^https?:\/\//i, 'wss://').replace(/\/+$/, '')
  return `${wss}/websocket/`
}

/**
 * 获取网关地址：优先调 /gateway；失败 / 超时 / 限频 → 直接 fallback 到硬编码
 */
const fetchGateway = async (cfg: QQBotConfig): Promise<string> => {
  const apiUrl = cfg.sandbox ? cfg.sandboxApi : cfg.prodApi
  const fallback = buildFallbackWssUrl(cfg)
  const accessToken = getBotAccessToken(cfg.appId)
  if (!accessToken) {
    log('warn', `${cfg.appId}: 无 access_token，使用硬编码 WSS ${fallback}`)
    return fallback
  }
  try {
    const { data } = await axios.get(`${apiUrl}/gateway`, {
      headers: { Authorization: `QQBot ${accessToken}` },
      timeout: GATEWAY_FETCH_TIMEOUT_MS,
    })
    if (data?.url) return data.url
    log('warn', `${cfg.appId}: /gateway 返回为空，使用硬编码 WSS ${fallback}`)
    return fallback
  } catch (err: any) {
    const data = err?.response?.data
    const reason = data?.message || err?.message || 'unknown'
    log('warn', `${cfg.appId}: /gateway 调用失败 (${reason})，使用硬编码 WSS ${fallback}`)
    return fallback
  }
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

  // 已存在则先停掉（同步等待 stop 走完，清掉 pendingTimer）
  if (conns.has(cfg.appId)) stop(cfg.appId)

  const intents = computeMax()
  // 注册占位 conn，pendingTimer 能在 stop 时被取消
  conns.set(cfg.appId, {
    client: null,
    cfg,
    intents,
    intentHistory: [intents],
    aborted: false,
  })
  await connect(cfg, intents, 0)
}

/**
 * 调度一次重试（统一封装，便于 stop 取消）
 */
const schedule = (
  appId: string,
  delay: number,
  fn: () => void
): void => {
  const conn = conns.get(appId)
  if (!conn || conn.aborted) return
  if (conn.pendingTimer) clearTimeout(conn.pendingTimer)
  conn.pendingTimer = setTimeout(() => {
    if (conn.aborted) return
    conn.pendingTimer = undefined
    fn()
  }, delay)
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
  // stop 后取消
  let conn = conns.get(cfg.appId)
  if (!conn || conn.aborted) return

  const gatewayUrl = await fetchGateway(cfg)

  conn = conns.get(cfg.appId)
  if (!conn || conn.aborted) return

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

  conn.client = client
  conn.cfg = cfg
  conn.intents = intents
  if (conn.intentHistory[conn.intentHistory.length - 1] !== intents) {
    conn.intentHistory.push(intents)
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
  // 上层主动 stop()
  if (reason === 'manual') {
    log('debug', `${cfg.appId}: WebSocket 已主动关闭`)
    return
  }

  const conn = conns.get(cfg.appId)
  if (!conn || conn.aborted) return

  // intents 不可用 → 回退
  if (reason === 'auth_fail') {
    const fallback = computeFallback(intents)
    if (fallback && fallback !== intents) {
      schedule(cfg.appId, 1000, () => connect(cfg, fallback, 0))
      return
    }
    summarize(cfg.appId, 0, false)
    log('error', `${cfg.appId}: 鉴权失败，所有 intents 均不可用，请检查机器人是否已上线`)
    conn.aborted = true
    conns.delete(cfg.appId)
    return
  }

  // 服务端要求重连：尝试 Resume
  // session_lost：清空 sessionId 后重新 Identify
  // closed / error：尝试 Resume，失败再 fresh
  const snap = client.snapshot()
  const resume = reason === 'session_lost' ? undefined : (snap.sessionId ? snap : undefined)
  const delay = backoff(attempt)
  log('error', `${cfg.appId}: WebSocket 断开 (${reason})，${delay}ms 后重连...`)
  schedule(cfg.appId, delay, () => connect(cfg, intents, attempt + 1, resume))
}

/**
 * 停止连接（同步：标记 abort + 清 pendingTimer + 关 client）
 */
export const stop = (appId: string): boolean => {
  const conn = conns.get(appId)
  if (!conn) return false
  conn.aborted = true
  if (conn.pendingTimer) {
    clearTimeout(conn.pendingTimer)
    conn.pendingTimer = undefined
  }
  try {
    conn.client?.stop()
  } catch { /* ignore */ }
  conns.delete(appId)
  return true
}

/**
 * 重启连接（配置变化时调用）
 */
export const reload = async (cfg: QQBotConfig): Promise<void> => {
  stop(cfg.appId)
  await start(cfg)
}
