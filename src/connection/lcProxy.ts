import { log } from '@/utils'
import { sign } from '@/core/api/sign'
import { WebSocket } from 'node-karin/ws'
import { event, fakeEvent } from '@/utils/common'
import type { QQBotConfig, AllEvent, TransferEvent, TransferSign, TransferSignResponse } from '@/types'

/**
 * 缓存lc webhook-proxy连接
 */
const lcCache = new Map<string, { socket: WebSocket, close: () => void }>()

/**
 * 创建lc webhook-proxy WebSocket连接
 */
export const createLcProxyConnection = (
  config: QQBotConfig
) => {
  if (config.appId === 'default') return
  if (config.event.type !== 3) return

  const { lcProxy } = config.event
  if (!lcProxy?.apiUrl || !lcProxy?.accessToken) {
    log('error', `${config.appId}: lc webhook-proxy 配置不完整，缺少 apiUrl 或 accessToken`)
    return
  }

  const appid = config.appId
  // 构建WebSocket URL: 将 https:// 转换为 wss://，http:// 转换为 ws://
  const wsUrl = lcProxy.apiUrl.replace(/^http(s)?:\/\//, 'ws$1://') + `/qqbot/${lcProxy.accessToken}/ws`
  const socket = new WebSocket(wsUrl)

  /**
   * 关闭连接
   * @param isClose 是否主动关闭
   */
  const close = (isClose = false) => {
    try {
      socket.removeAllListeners()
      socket?.close()

      if (isClose) {
        log('warn', `${appid}: lc webhook-proxy WebSocket连接已主动关闭: ${wsUrl}`)
        return
      }

      log('error', `${appid}: lc webhook-proxy WebSocket连接已断开，将在5秒后重连: ${wsUrl}`)
      setTimeout(() => createLcProxyConnection(config), 5000)
    } finally {
      const ws = lcCache.get(appid)
      if (ws) {
        lcCache.delete(appid)
      }
    }
  }

  socket.on('close', () => close(false))
  socket.on('error', (error) => {
    log('error', `${appid}: lc webhook-proxy WebSocket错误: ${error}`)
    close()
  })

  socket.on('open', () => {
    lcCache.set(appid, { socket, close })
    log('info', `${appid}: lc webhook-proxy WebSocket连接已打开: ${wsUrl}`)
  })

  socket.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString())
      
      // 处理心跳响应
      if (data.type === 'pong') {
        return
      }

      // 处理QQBot事件
      if (data.event === 'qqbot' && data.payload) {
        return lcEventHandler(config, data.payload, raw.toString())
      }

      log('warn', `${appid}: lc webhook-proxy 收到未知消息类型: ${raw}`)
    } catch (error) {
      log('error', `${appid}: lc webhook-proxy 消息解析失败: ${error}`)
    }
  })

  // 设置心跳保活
  const heartbeat = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'ping' }))
    }
  }, 30000)

  socket.on('close', () => {
    clearInterval(heartbeat)
  })

  return socket
}

/**
 * 停止lc webhook-proxy连接
 * @param appid 机器人appid
 */
export const stopLcProxyConnection = (appid: string) => {
  const result = lcCache.get(appid)
  if (result) {
    result.close()
    return true
  }

  return false
}

/**
 * lc webhook-proxy 事件处理
 * @param config 机器人配置
 * @param payload webhook-proxy转发的payload数据
 * @param raw 原始数据
 */
const lcEventHandler = (config: QQBotConfig, payload: any, raw: string) => {
  const { appId, secret } = config

  // webhook-proxy转发的QQBot事件包含headers和body
  if (!payload?.headers || !payload?.body) {
    fakeEvent(`${appId}: lc webhook-proxy 数据格式错误: ${raw}`)
    return
  }

  const headers = payload.headers
  const body = payload.body

  // 检查op类型，处理鉴权回调 (op=13)
  if (body.op === 13) {
    const eventTs = body?.d?.event_ts
    const plainToken = body?.d?.plain_token

    if (!eventTs || !plainToken) {
      log('error', `${appId}: lc webhook-proxy 鉴权回调数据不完整: ${raw}`)
      return
    }

    const signature = sign(secret, eventTs, plainToken)
    log('mark', `${appId}: [lc webhook-proxy][signature] ${signature}`)
    
    // 注意: lc webhook-proxy需要我们返回签名响应，但WebSocket是单向的
    // webhook-proxy会自动处理鉴权响应，我们只需要验证即可
    return
  }

  // 验证签名
  const ed25519 = headers['x-signature-ed25519']
  const timestamp = headers['x-signature-timestamp']
  
  if (!ed25519 || !timestamp) {
    fakeEvent(`${appId}: lc webhook-proxy 缺少签名字段: ${raw}`)
    return
  }

  // 将body转换为字符串进行签名验证
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
  const signature = sign(secret, timestamp, bodyStr)
  
  if (ed25519 !== signature) {
    log('error', `${appId}: lc webhook-proxy 签名验证失败\n期望: ${signature}\n实际: ${ed25519}\nbody: ${bodyStr}`)
    return
  }

  // 签名验证通过，触发事件
  event.emit(appId, body)
}
