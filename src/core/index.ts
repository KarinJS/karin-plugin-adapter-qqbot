import { URL } from 'url'
import { log } from '@/utils'
import { QQBotApi } from '@/core/api'
import { event } from '@/utils/common'
import { config, pkg } from '@/utils/config'
import { EventEnum } from '@/types/event'
import { logger, registerBot } from 'node-karin'
import { AdapterQQBotNormal } from '@/core/adapter/normal'
import { AdapterQQBotMarkdown } from '@/core/adapter/markdown'
import { createAxiosInstance, getAccessToken } from '@/core/internal/axios'
import { GraphicTemplateMarkdown, rawMarkdown } from '@/core/adapter/handler'
import { onChannelMsg, onDirectMsg, onFriendMsg, onGroupMsg } from '@/core/event/message'
import { onGroupAddRobot, onGroupDelRobot } from '@/core/event/notice'
import { createWebSocketConnection } from '@/connection/webSocket'

import type { QQBotConfig } from '@/types/config'
import type { Event } from '@/types/event'

/**
 * 初始化Bot列表
 */
export const initQQBotAdapter = async () => {
  const cfg = config()
  cfg.forEach(bot => createBot(bot))
}

/**
 * 创建Bot实例
 * @param bot 机器人配置
 */
export const createBot = async (bot: QQBotConfig) => {
  if (bot.event.type === 0) {
    log('debug', `${bot.appId}: bot已关闭，跳过初始化`)
    return
  }

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

  // 注册Bot
  client.adapter.address = url
  client.adapter.secret = bot.secret
  client.adapter.version = pkg().version

  if (bot.event.type === 1) {
    client.adapter.index = registerBot('webSocketClient', client)
    createWebSocketConnection(bot)
  } else {
    client.adapter.index = registerBot('http', client)
  }
}

/**
 * 创建QQBot客户端
 * @param cfg 机器人配置
 * @param api 机器人API
 */
const createClient = (cfg: QQBotConfig, api: QQBotApi): AdapterQQBotNormal | AdapterQQBotMarkdown => {
  const mode = Number(cfg.markdown?.mode) || 0

  // 模式 0: 正常模式
  if (mode === 0) {
    return new AdapterQQBotNormal(api)
  }

  // 模式 1: 原生Markdown
  if (mode === 1) {
    return new AdapterQQBotMarkdown(api, rawMarkdown, cfg)
  }

  // 模式 3/4/5: 图文模板Markdown
  if (mode >= 3 && mode <= 5) {
    return new AdapterQQBotMarkdown(api, GraphicTemplateMarkdown, cfg)
  }

  // 默认返回正常模式
  return new AdapterQQBotNormal(api)
}

/**
 * 创建事件
 * @param client 机器人实例
 * @param event 事件
 */
export const createEvent = (
  client: AdapterQQBotNormal | AdapterQQBotMarkdown,
  event: Event
): void => {
  switch (event.t) {
    case EventEnum.GROUP_AT_MESSAGE_CREATE:
      return onGroupMsg(client, event)
    case EventEnum.C2C_MESSAGE_CREATE:
      return onFriendMsg(client, event)
    case EventEnum.MESSAGE_CREATE:
    case EventEnum.AT_MESSAGE_CREATE:
      return onChannelMsg(client, event)
    case EventEnum.DIRECT_MESSAGE_CREATE:
      return onDirectMsg(client, event)
    case EventEnum.GROUP_ADD_ROBOT:
      return onGroupAddRobot(client, event)
    case EventEnum.GROUP_DEL_ROBOT:
      return onGroupDelRobot(client, event)
    default:
      logger.error(`未知事件类型: ${JSON.stringify(event)}`)
  }
}
