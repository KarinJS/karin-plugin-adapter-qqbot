import WebSocket from 'node-karin/ws'
import { config } from '@/utils/config'
import { logger } from 'node-karin'
import { sign } from '../api/sign'
import { event, fakeEvent } from '@/utils/common'

interface QQBotEventType {
  type: 'event',
  data: {
    headers: {
      host: 'tx.com',
      'x-real-ip': string,
      'x-real-port': string,
      'x-forwarded-for': string,
      'remote-host': string,
      connection: string,
      'content-length': string,
      'x-tps-trace-id': string,
      'content-type': 'application/json',
      'user-agent': 'QQBot-Callback',
      'x-signature-timestamp': string,
      'x-bot-appid': string,
      'x-signature-method': string,
      'x-signature-ed25519': string
    },
    event: string
  }
}

interface QQBotSignEventType {
  echo: string,
  type: 'sign',
  data: {
    appid: string,
    eventTs: string,
    plainToken: string
  }
}

/** 创建ws中转路由 */
export const createWebSocketWebhook = () => {
  const cfg = config()
  for (const appid of Object.keys(cfg)) {
    const api = cfg[appid]
    if (appid === 'default') continue
    if (api?.event?.type !== 3) continue

    const url = api.event.wsUrl
    const headers = { 'x-bot-appid': appid, authorization: api.event.wsToken }
    createWebSocket(api, url, headers)
  }
}

const createWebSocket = (
  cfg: ReturnType<typeof config>[string],
  url: string,
  headers: Record<string, string>
) => {
  const socket = new WebSocket(url, { headers })
  const appid = headers['x-bot-appid']

  const close = (isClose = true) => {
    /** 停止监听 */
    socket.removeAllListeners()
    isClose && socket?.close()
    logger.error(`[QQBot][${appid}] WebSocket连接已断开，将在5秒后重连: ${url}`)
    setTimeout(() => createWebSocket(cfg, url, headers), 5000)
  }

  socket.on('close', () => close(false))
  socket.on('error', (error) => { logger.error(error); close() })
  socket.on('open', () => logger.info(`[QQBot][${appid}] WebSocket连接已打开: ${url}`))

  socket.on('message', (data) => {
    const raw = data.toString()
    const parse = JSON.parse(raw)
    if (parse?.type === 'event') {
      return eventHandler(appid, cfg.secret, raw, parse)
    }

    if (parse?.type === 'sign') {
      signHandler(appid, cfg.secret, raw, parse, socket)
    }

    logger.error(`[QQBot][${appid}] 未知的消息类型: ${raw}`)
  })
}

/**
 * 事件处理
 * @param appid 机器人id
 * @param secret 机器人密钥
 * @param raw 原始数据
 * @param parse 解析后的数据
 */
const eventHandler = (appid: string, secret: string, raw: string, parse: QQBotEventType) => {
  if (!parse?.data?.headers || !parse?.data?.headers['x-signature-ed25519'] || !parse?.data?.headers['x-signature-timestamp']) {
    fakeEvent(`未找到签名字段: ${raw}`)
    return
  }

  const signature = sign(secret, parse.data.headers['x-signature-timestamp'], parse.data.event)
  if (signature !== parse.data.headers['x-signature-ed25519']) {
    logger.error(`[QQBot][${appid}] 签名验证失败: ${raw}`)
    return
  }

  event.emit(appid, JSON.parse(parse.data.event))
}

/**
 * 签名处理
 * @param appid 机器人id
 * @param secret 机器人密钥
 * @param raw 原始数据
 * @param parse 解析后的数据
 * @param socket websocket实例
 */
const signHandler = (appid: string, secret: string, raw: string, parse: QQBotSignEventType, socket: WebSocket) => {
  if (!parse?.data?.eventTs || !parse?.data?.plainToken) {
    logger.error(`[QQBot][${appid}] 未找到 eventTs 或 plainToken: ${raw}`)
    return
  }

  const signature = sign(secret, parse.data.eventTs, parse.data.plainToken)
  socket.send(JSON.stringify({ echo: parse.echo, data: { signature } }))
}
