import { URL } from 'url'
import { logger, registerBot } from 'node-karin'
import { QQBotApi } from '@/core/api'
import { event } from '@/utils/common'
import { config, pkg } from '@/utils/config'
import { EventEnum } from '@/core/event/types'
import { createC2CWebhook } from '@/core/webhook/c2c'
import { createHttpWebhook } from '@/core/webhook/http'
import { createWebSocketWebhook } from '@/core/webhook/ws'
import { AdapterQQBotNormal } from '@/core/adapter/normal'
import { createChannelMsg, createDirectMsg, createFriendMsg, createGroupMsg } from '@/core/event/message'
import { createAxiosInstance, getAccessToken } from '@/core/internal/axios'

import type { Event } from '@/core/event/types'

const cfg = config()

for (const [key, value] of Object.entries(cfg)) {
  if (!key || key === 'default') continue

  const bot = Object.assign(cfg.default, value)
  const appId = String(bot.appId)
  await getAccessToken(bot.tokenApi, appId, bot.secret)

  const url = bot.sandbox ? bot.sandboxApi : bot.prodApi
  const axios = createAxiosInstance(url, appId)

  const api = new QQBotApi(axios)
  const data = await api.getMe()
  const { id, username, avatar } = data
  const client = new AdapterQQBotNormal(api)
  client.account.name = username
  client.account.avatar = avatar
  client.account.selfId = appId

  const qq = new URL(data.share_url).searchParams.get('robot_uin')!
  client.account.subId.id = id
  client.account.subId.qq = qq
  client.account.subId.appid = appId
  client.account.subId.union_openid = data.union_openid

  event.on(appId, (event: Event) => createEvent(client, event))

  createC2CWebhook()
  createHttpWebhook()
  createWebSocketWebhook()

  // 注册Bot
  client.adapter.address = url
  client.adapter.secret = bot.secret
  client.adapter.version = pkg().version
  client.adapter.index = registerBot('http', client)
}

/**
 * 创建事件
 * @param client 机器人实例
 * @param event 事件
 */
export const createEvent = (
  client: AdapterQQBotNormal,
  event: Event
) => {
  if (event.t === EventEnum.GROUP_AT_MESSAGE_CREATE) {
    return createGroupMsg(client, event)
  }

  if (event.t === EventEnum.C2C_MESSAGE_CREATE) {
    return createFriendMsg(client, event)
  }

  if (event.t === EventEnum.MESSAGE_CREATE || event.t === EventEnum.AT_MESSAGE_CREATE) {
    return createChannelMsg(client, event)
  }

  if (event.t === EventEnum.DIRECT_MESSAGE_CREATE) {
    return createDirectMsg(client, event)
  }

  logger.error(`未知事件类型: ${JSON.stringify(event)}`)
}
