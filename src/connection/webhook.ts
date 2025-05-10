import { sign } from '@/core/api/sign'
import { logger } from 'node-karin'
import { getConfig } from '@/utils/config'
import { event, fakeEvent } from '@/utils/common'
import { RequestHandler } from 'node-karin/express'

import type { Request, Response } from 'express'

/**
 * 端到端webhook路由
 * @param req 请求
 * @param res 响应
 */
export const webhookRouting: RequestHandler = async (req, res) => {
  const data = await checkAppid(req, res)
  if (!data) return

  const cfg = getConfig(data.appid)
  if (!cfg) {
    logger.error(`[配置错误][${data.appid}] 配置文件中未找到对应的appid，请检查配置文件`)
    return
  }

  if (cfg.event.type !== 1) {
    logger.error(`[配置错误][${data.appid}] webhook未启用，请检查配置文件`)
    return
  }

  /** 接口初始化 鉴权回调 */
  if (data.body.op === 13) {
    const eventTs = data.body?.d?.event_ts
    const plainToken = data.body?.d?.plain_token

    if (!eventTs || !plainToken) {
      logger.error(`[请求数据错误][${data.appid}] 未找到 event_ts 或 plain_token: ${data.rawBody}`)
      return
    }

    const signature = sign(cfg.secret, eventTs, plainToken)
    logger.mark(`[signature][${data.appid}] ${signature}`)
    res.setHeader('Content-Type', 'application/json')
    res.status(200).end(JSON.stringify({ plain_token: plainToken, signature }))
    return
  }

  /** 非回调事件 进行鉴权验证 */
  const ed25519 = req.headers['x-signature-ed25519']
  const signature = sign(cfg.secret, req.headers['x-signature-timestamp'] as string, data.rawBody)
  if (ed25519 !== signature) {
    fakeEvent(`签名验证失败:\nappid: ${data.appid}\ned25519: ${ed25519}\n实际签名: ${signature}\nbody: ${data.rawBody}`)
    return
  }

  event.emit(data.appid, data.body)
}

/**
 * 判断请求是否合规并返回appid
 * @param req 请求
 * @param res 响应
 */
export const checkAppid = async (req: Request, res: Response): Promise<{
  appid: string
  rawBody: string
  body: Record<string, any>
} | undefined> => {
  let response = true
  try {
    const ip = req.socket.remoteAddress
    const appid = req.headers['x-bot-appid'] as string
    const rawBody = await new Promise<string>((resolve) => {
      const raw: string[] = []
      req.on('data', (chunk) => raw.push(chunk))
      req.on('end', () => resolve(raw.join('')))
    })

    if (!appid) {
      fakeEvent(`未找到 x-bot-appid: ${ip} body: ${rawBody}`)
      return
    }

    const userAgent = req.headers['user-agent']
    if (userAgent !== 'QQBot-Callback') {
      fakeEvent(`未找到 User-Agent: ${ip} body: ${rawBody}`)
      return
    }

    const body = JSON.parse(rawBody) || {}
    if (typeof body.op !== 'number') {
      fakeEvent(`非法请求体，未找到 op: ${ip} body: ${rawBody}`)
      return
    } else if (body.op === 13) {
      /** op13是计算sign返回  不可以直接返回状态码 */
      response = false
    }

    return { appid, rawBody, body }
  } finally {
    /** 根据文档 返回200或者204都可以 必须在3秒内完成 */
    response && res.status(200).end()
  }
}
