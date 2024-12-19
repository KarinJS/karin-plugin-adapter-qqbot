import { URL } from 'url'
import { QQBotApi } from '@/core/api'
import { event } from '@/utils/common'
import { config, pkg } from '@/utils/config'
import { EventEnum } from '@/core/event/types'
import { logger, registerBot } from 'node-karin'
import { createC2CWebhook } from '@/core/webhook/c2c'
import { createHttpWebhook } from '@/core/webhook/http'
import { createWebSocketWebhook } from '@/core/webhook/ws'
import { AdapterQQBotNormal } from '@/core/adapter/normal'
import { AdapterQQBotMarkdown } from '@/core/adapter/markdown'
import { createAxiosInstance, getAccessToken } from '@/core/internal/axios'
import { GraphicTemplateMarkdown, rawMarkdown } from '@/core/adapter/handler'
import { onChannelMsg, onDirectMsg, onFriendMsg, onGroupMsg } from '@/core/event/message'
import { onGroupAddRobot, onGroupDelRobot } from '@/core/event/notice'

import type { Config } from '@/types/config'
import type { Event } from '@/core/event/types'
import type { AdapterQQBot } from '@/core/adapter/adapter'

const main = async () => {
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

    const client = createClient(bot, api)
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
}

/**
 * 创建QQBot客户端
 * @param bot 机器人配置
 * @param api 机器人API
 */
const createClient = (bot: Config[string], api: QQBotApi): AdapterQQBot => {
  if (Number(bot.markdown?.mode) === 0) {
    return new AdapterQQBotNormal(api)
  }

  if (Number(bot.markdown?.mode) === 1) {
    return new AdapterQQBotMarkdown(api, rawMarkdown, bot)
  }

  if (Number(bot.markdown?.mode) === 3) {
    return new AdapterQQBotMarkdown(api, GraphicTemplateMarkdown, bot)
  }

  if (Number(bot.markdown?.mode) === 4) {
    return new AdapterQQBotMarkdown(api, GraphicTemplateMarkdown, bot)
  }

  if (Number(bot.markdown?.mode) === 5) {
    return new AdapterQQBotMarkdown(api, GraphicTemplateMarkdown, bot)
  }

  /** 默认返回0 */
  return new AdapterQQBotNormal(api)
}

/**
 * 创建事件
 * @param client 机器人实例
 * @param event 事件
 */
export const createEvent = (
  client: AdapterQQBot,
  event: Event
) => {
  if (event.t === EventEnum.GROUP_AT_MESSAGE_CREATE) {
    return onGroupMsg(client, event)
  }

  if (event.t === EventEnum.C2C_MESSAGE_CREATE) {
    return onFriendMsg(client, event)
  }

  if (event.t === EventEnum.MESSAGE_CREATE || event.t === EventEnum.AT_MESSAGE_CREATE) {
    return onChannelMsg(client, event)
  }

  if (event.t === EventEnum.DIRECT_MESSAGE_CREATE) {
    return onDirectMsg(client, event)
  }

  if (event.t === EventEnum.GROUP_ADD_ROBOT) {
    return onGroupAddRobot(client, event)
  }

  if (event.t === EventEnum.GROUP_DEL_ROBOT) {
    return onGroupDelRobot(client, event)
  }

  logger.error(`未知事件类型: ${JSON.stringify(event)}`)
}

main()
