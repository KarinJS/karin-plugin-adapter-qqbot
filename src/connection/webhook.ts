import { sign, verifySignature } from '@/core/api/sign'
import { getConfig } from '@/utils/config'
import { fakeEvent } from '@/utils/common'
import { log } from '@/utils/logger'
import { Opcode } from '@/types/opcode'
import { dispatch } from '@/connection/transport'
import type { RequestHandler, Request, Response } from 'node-karin/express'

interface ParsedRequest {
  appid: string
  rawBody: string
  body: Record<string, any>
}

/**
 * 解析请求：读 rawBody + JSON + 字段校验
 * 失败返回 null，并已写入日志
 */
const parseRequest = async (req: Request): Promise<ParsedRequest | null> => {
  const ip = req.socket.remoteAddress
  const rawBody = await new Promise<string>((resolve) => {
    const chunks: string[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(chunks.join('')))
  })

  const appid = req.headers['x-bot-appid'] as string
  if (!appid) {
    fakeEvent(`未找到 x-bot-appid: ${ip} body: ${rawBody}`)
    return null
  }

  if (req.headers['user-agent'] !== 'QQBot-Callback') {
    fakeEvent(`User-Agent 非 QQBot-Callback: ${ip} body: ${rawBody}`)
    return null
  }

  let body: Record<string, any>
  try {
    body = JSON.parse(rawBody) || {}
  } catch {
    fakeEvent(`非法 JSON: ${ip} body: ${rawBody}`)
    return null
  }

  if (typeof body.op !== 'number') {
    fakeEvent(`缺少 op 字段: ${ip} body: ${rawBody}`)
    return null
  }

  return { appid, rawBody, body }
}

/**
 * QQ 官方 webhook 路由
 * POST /qqbot/webhook
 */
export const webhookRouting: RequestHandler = async (req: Request, res: Response) => {
  const parsed = await parseRequest(req)
  if (!parsed) {
    res.status(200).end()
    return
  }

  const cfg = getConfig(parsed.appid)
  if (!cfg) {
    log('error', `[webhook][${parsed.appid}] 配置文件中未找到对应 appId`)
    res.status(200).end()
    return
  }
  if (cfg.event.type !== 1) {
    log('error', `[webhook][${parsed.appid}] webhook 未启用`)
    res.status(200).end()
    return
  }

  // op:13 鉴权回调（不能先返回 200）
  if (parsed.body.op === Opcode.WebhookValidation) {
    const eventTs = parsed.body?.d?.event_ts
    const plainToken = parsed.body?.d?.plain_token
    if (!eventTs || !plainToken) {
      log('error', `[webhook][${parsed.appid}] 缺少 event_ts/plain_token: ${parsed.rawBody}`)
      res.status(200).end()
      return
    }
    const signature = sign(cfg.secret, eventTs, plainToken)
    log('mark', `[webhook][${parsed.appid}] sign=${signature}`)
    res.setHeader('Content-Type', 'application/json')
    res.status(200).end(JSON.stringify({ plain_token: plainToken, signature }))
    return
  }

  // 校验 ed25519
  const ed25519 = req.headers['x-signature-ed25519'] as string
  const timestamp = req.headers['x-signature-timestamp'] as string
  if (!verifySignature(cfg.secret, timestamp, parsed.rawBody, ed25519)) {
    fakeEvent(`签名验证失败 appid=${parsed.appid} headerSig=${ed25519} body=${parsed.rawBody}`)
    res.status(200).end()
    return
  }

  // 必须在 3 秒内返回
  res.status(200).end()
  dispatch(parsed.appid, parsed.body as any)
}
