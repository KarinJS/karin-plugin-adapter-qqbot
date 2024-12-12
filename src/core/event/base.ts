import { logger } from 'node-karin'
import { QQBotApi } from '@/core/api'
import { event } from '@/utils/common'
import { config } from '@/utils/config'
import { AdapterQQBotText } from '@/core/adapter/adapter'
import { EventType } from '@/core/event/types'
import { createC2CWebhook } from '@/core/webhook/c2c'
import { createHttpWebhook } from '@/core/webhook/http'
import { createWebSocketWebhook } from '@/core/webhook/ws'
import { createAxiosInstance, getAccessToken } from '@/core/internal/axios'
import { createFriendMsg, createGroupMsg } from '@/core/event/message'

import type { Event } from '@/core/event/types'

const cfg = config()

for (const [key, value] of Object.entries(cfg)) {
  if (!key || key === 'default') continue

  const bot = Object.assign(cfg.default, value)
  const appId = String(bot.appId)
  await getAccessToken(bot.tokenApi, appId, bot.secret)
  const axios = createAxiosInstance(bot.prodApi, appId)

  const api = new QQBotApi(axios)
  const { username, avatar } = await api.getMe()
  const client = new AdapterQQBotText(api)
  client.account.name = username
  client.account.avatar = avatar
  client.account.selfId = appId

  event.on(appId, (event: Event) => createEvent(client, event))

  createC2CWebhook()
  createHttpWebhook()
  createWebSocketWebhook()
}

/**
 * 创建事件
 * @param client 机器人实例
 * @param event 事件
 */
export const createEvent = (client: AdapterQQBotText, event: Event) => {
  if (event.t === EventType.GROUP_AT_MESSAGE_CREATE) {
    return createGroupMsg(client, event)
  }

  if (event.t === EventType.C2C_MESSAGE_CREATE) {
    return createFriendMsg(client, event)
  }

  logger.error(`未知事件类型: ${JSON}`)
}
