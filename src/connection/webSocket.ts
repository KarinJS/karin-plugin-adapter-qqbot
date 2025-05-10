import { log } from '@/utils'
import { sign } from '@/core/api/sign'
import { WebSocket } from 'node-karin/ws'
import { event, fakeEvent } from '@/utils/common'
import type { QQBotConfig, AllEvent, TransferEvent, TransferSign, TransferSignResponse } from '@/types'

/**
 * 缓存连接
 */
const cache = new Map<string, { socket: WebSocket, close: () => void }>()

/**
 * 创建websocket连接 连接中转服务
 */
export const createWebSocketConnection = (
  config: QQBotConfig
) => {
  if (config.appId === 'default') return
  if (config.event.type !== 2) return

  const appid = config.appId
  const url = config.event.wsUrl
  const headers = { 'x-bot-appid': appid, authorization: config.event.wsToken }
  const socket = new WebSocket(url, { headers })

  /**
   * 关闭连接
   * @param isClose 是否主动关闭
   */
  const close = (isClose = false) => {
    try {
      socket.removeAllListeners()
      socket?.close()

      if (isClose) {
        log('warn', `${appid}: WebSocket连接已主动关闭: ${url}`)
        return
      }

      log('error', `${appid}: WebSocket连接已断开，将在5秒后重连: ${url}`)
      setTimeout(() => createWebSocketConnection(config), 5000)
    } finally {
      const ws = cache.get(appid)
      if (ws) {
        cache.delete(appid)
      }
    }
  }

  socket.on('close', () => close(false))
  socket.on('error', (error) => {
    log('error', error)
    close()
  })

  socket.on('open', () => {
    cache.set(appid, { socket, close })
    log('info', `${appid}: WebSocket连接已打开: ${url}`)
  })

  socket.on('message', (event) => {
    const raw = event.toString()
    const data: AllEvent = JSON.parse(raw)
    if (data?.type === 'event') {
      return eventHandler(config, data, raw)
    }

    if (data?.type === 'sign') {
      signHandler(config, data, raw, socket)
    }

    log('error', `${appid}: 未知的消息类型: ${raw}`)
  })

  return socket
}

/**
 * 停止已有连接
 * @param appid 机器人appid
 */
export const stopWebSocketConnection = (appid: string) => {
  const result = cache.get(appid)
  if (result) {
    result.close()
    return true
  }

  return false
}

/**
 * 事件处理
 * @param appid 机器人id
 * @param secret 机器人密钥
 * @param raw 原始数据
 * @param parse 解析后的数据
 */
const eventHandler = (config: QQBotConfig, data: TransferEvent, raw: string) => {
  const { appId, secret } = config
  if (!data?.data?.headers || !data?.data?.headers['x-signature-ed25519'] || !data?.data?.headers['x-signature-timestamp']) {
    fakeEvent(`未找到签名字段: ${raw}`)
    return
  }

  const signature = sign(secret, data.data.headers['x-signature-timestamp'], data.data.event)
  if (signature !== data.data.headers['x-signature-ed25519']) {
    log('error', `${appId}: 签名验证失败: ${raw}`)
    return
  }

  event.emit(appId, JSON.parse(data.data.event))
}

/**
 * 签名处理
 * @param appid 机器人id
 * @param secret 机器人密钥
 * @param raw 原始数据
 * @param parse 解析后的数据
 * @param socket websocket实例
 */
const signHandler = (config: QQBotConfig, data: TransferSign, raw: string, socket: WebSocket) => {
  const { appId, secret } = config
  if (!data?.data?.eventTs || !data?.data?.plainToken) {
    const text = `未找到 eventTs 或 plainToken: ${raw}`
    log('error', `${appId}: ${text}`)
    /** 响应 */
    const response: TransferSignResponse = { echo: data.echo, type: 'sign', data: { status: 'error', message: text } }
    socket.send(JSON.stringify(response))
    return
  }

  const signature = sign(secret, data.data.eventTs, data.data.plainToken)
  /** 响应 */
  const response: TransferSignResponse = { echo: data.echo, type: 'sign', data: { status: 'success', message: signature } }
  socket.send(JSON.stringify(response))
}
