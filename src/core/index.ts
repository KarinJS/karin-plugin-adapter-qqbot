import { URL } from 'url'
import { log } from '@/utils'
import { QQBotApi } from '@/core/api'
import { event } from '@/utils/common'
import { config, pkg } from '@/utils/config'
import { EventEnum } from '@/types/event'
import { logger, registerBot, unregisterBot } from 'node-karin'
import { AdapterQQBotNormal } from '@/core/adapter/normal'
import { AdapterQQBotMarkdown } from '@/core/adapter/markdown'
import { createAxiosInstance, getAccessToken } from '@/core/internal/axios'
import { rawMarkdown } from '@/core/adapter/handler'
import { onChannelMsg, onDirectMsg, onFriendMsg, onGroupMsg } from '@/core/event/message'
import {
  onGroupAddRobot, onGroupDelRobot, onGroupMsgReceive, onGroupMsgReject,
  onFriendAdd, onFriendDel, onC2CMsgReceive, onC2CMsgReject
} from '@/core/event/notice'
import { createWebSocketConnection, stopWebSocketConnection } from '@/connection/webSocket'

import type { QQBotConfig } from '@/types/config'
import type { Event } from '@/types/event'

/**
 * 初始化Bot列表
 */
export const initQQBotAdapter = async () => {
  const cfg = config()
  logger.debug(`[QQ Official Bot] 开始初始化 ${cfg.length} 个Bot...`)
  for (const bot of cfg) {
    try {
      await createBot(bot)
    } catch (error) {
      logger.debug(`[QQ Official Bot] 初始化Bot失败 ${bot.appId || '(无appId)'}:`, error)
    }
  }
}

/**
 * 记录每个 appId 的初始化状态，防止并发调用 createBot 导致重复连接
 */
const initState = new Map<string, { hash: string; promise: Promise<void> }>()

/**
 * 计算配置的 hash，用于判断是否需要重新初始化
 */
const hashConfig = (bot: QQBotConfig): string => JSON.stringify({
  appId: bot.appId,
  secret: bot.secret,
  tokenApi: bot.tokenApi,
  prodApi: bot.prodApi,
  sandboxApi: bot.sandboxApi,
  sandbox: bot.sandbox,
  event: bot.event,
  markdown: bot.markdown,
})

/**
 * 创建Bot实例
 * @param bot 机器人配置
 */
export const createBot = async (bot: QQBotConfig) => {
  const appId = String(bot.appId)
  if (!appId) {
    logger.warn('[QQ Official Bot] 配置中缺少 appId，跳过初始化')
    return
  }

  if (bot.event.type === 0) {
    logger.info(`[QQ Official Bot][${appId}] 事件接收方式为"关闭"，跳过初始化。如需启用请修改 event.type 为 1(webhook) 或 2(ws)`)
    return
  }

  const hash = hashConfig(bot)
  const existing = initState.get(appId)
  if (existing) {
    if (existing.hash === hash) {
      logger.debug(`[QQ Official Bot][${appId}] 初始化已在进行中，等待完成...`)
      return existing.promise
    }
    logger.debug(`[QQ Official Bot][${appId}] 配置已变更，等待旧初始化完成...`)
    await existing.promise.catch(() => {})
  }

  const promise = (async () => {
    // 清理旧资源，防止重复注册导致消息重复处理
    unregisterBot('selfId', appId)
    stopWebSocketConnection(appId)
    event.removeAllListeners(appId)

    logger.info(`[QQ Official Bot][${appId}] 开始获取 access_token...`)
    await getAccessToken(bot.tokenApi, appId, bot.secret)

    const url = bot.sandbox ? bot.sandboxApi : bot.prodApi
    const axios = createAxiosInstance(url, appId)

    const api = new QQBotApi(axios)
    logger.debug(`[QQ Official Bot][${appId}] 获取 bot 信息...`)
    const data = await api.getMe()
    const { id, username, avatar } = data
    logger.debug(`[QQ Official Bot][${appId}] bot 名称: ${username}`)

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

    if (bot.event.type === 2) {
      client.adapter.index = registerBot('webSocketClient', client)
      logger.debug('已注册为 webSocketClient')
      await createWebSocketConnection(bot)
    } else if (bot.event.type === 1) {
      client.adapter.index = registerBot('http', client)
      logger.debug('info', '已注册为 http')
    }
  })()

  initState.set(appId, { hash, promise })
  promise.finally(() => {
    if (initState.get(appId)?.hash === hash) {
      initState.delete(appId)
    }
  })
  return promise
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
    return new AdapterQQBotMarkdown(api, rawMarkdown)
  }

  // 默认返回正常模式
  return new AdapterQQBotNormal(api)
}

/**
 * 创建事件
 * @param client 机器人实例
 * @param event 事件
 */
/** 事件中文映射表 */
const eventNameMap: Record<string, string> = {
  [EventEnum.READY]: '就绪',
  [EventEnum.RESUMED]: '连接恢复',
  [EventEnum.GROUP_AT_MESSAGE_CREATE]: '群聊@消息',
  [EventEnum.C2C_MESSAGE_CREATE]: '好友消息',
  [EventEnum.MESSAGE_CREATE]: '频道消息',
  [EventEnum.AT_MESSAGE_CREATE]: '频道@消息',
  [EventEnum.DIRECT_MESSAGE_CREATE]: '频道私信',
  [EventEnum.GROUP_ADD_ROBOT]: '机器人入群',
  [EventEnum.GROUP_DEL_ROBOT]: '机器人退群',
  [EventEnum.GROUP_MSG_RECEIVE]: '群聊开启通知',
  [EventEnum.GROUP_MSG_REJECT]: '群聊关闭通知',
  [EventEnum.FRIEND_ADD]: '添加好友',
  [EventEnum.FRIEND_DEL]: '删除好友',
  [EventEnum.C2C_MSG_RECEIVE]: '单聊开启通知',
  [EventEnum.C2C_MSG_REJECT]: '单聊关闭通知',
  [EventEnum.INTERACTION_CREATE]: '互动事件',
  [EventEnum.MESSAGE_AUDIT_PASS]: '消息审核通过',
  [EventEnum.MESSAGE_AUDIT_REJECT]: '消息审核不通过',
}

export const createEvent = (
  client: AdapterQQBotNormal | AdapterQQBotMarkdown,
  event: Event
): void => {
  const name = eventNameMap[event.t] || event.t
  client.logger('debug', `[事件][${name}]`)

  switch (event.t) {
    // WebSocket 生命周期事件
    case EventEnum.READY:
      return client.logger('info', `WebSocket 就绪: ${event.d?.user?.username || ''}`)
    case EventEnum.RESUMED:
      return client.logger('info', 'WebSocket 连接已恢复')
    // 消息事件
    case EventEnum.GROUP_AT_MESSAGE_CREATE:
      return onGroupMsg(client, event)
    case EventEnum.C2C_MESSAGE_CREATE:
      return onFriendMsg(client, event)
    case EventEnum.MESSAGE_CREATE:
    case EventEnum.AT_MESSAGE_CREATE:
      return onChannelMsg(client, event)
    case EventEnum.DIRECT_MESSAGE_CREATE:
      return onDirectMsg(client, event)
    // 群聊机器人生命周期
    case EventEnum.GROUP_ADD_ROBOT:
      return onGroupAddRobot(client, event)
    case EventEnum.GROUP_DEL_ROBOT:
      return onGroupDelRobot(client, event)
    case EventEnum.GROUP_MSG_RECEIVE:
      return onGroupMsgReceive(client, event)
    case EventEnum.GROUP_MSG_REJECT:
      return onGroupMsgReject(client, event)
    // 好友生命周期
    case EventEnum.FRIEND_ADD:
      return onFriendAdd(client, event)
    case EventEnum.FRIEND_DEL:
      return onFriendDel(client, event)
    case EventEnum.C2C_MSG_RECEIVE:
      return onC2CMsgReceive(client, event)
    case EventEnum.C2C_MSG_REJECT:
      return onC2CMsgReject(client, event)
    // TODO: INTERACTION_CREATE 事件需要调用 PUT /interactions/{interaction_id} 回应，node-karin 框架暂无对应事件类型
    case EventEnum.INTERACTION_CREATE:
      return client.logger('debug', `INTERACTION_CREATE 事件未处理: ${JSON.stringify(event)}`)
    // TODO: MESSAGE_AUDIT_PASS / MESSAGE_AUDIT_REJECT 事件需要框架支持消息审核事件类型
    case EventEnum.MESSAGE_AUDIT_PASS:
      return client.logger('debug', `MESSAGE_AUDIT_PASS 事件未处理: ${JSON.stringify(event)}`)
    case EventEnum.MESSAGE_AUDIT_REJECT:
      return client.logger('debug', `MESSAGE_AUDIT_REJECT 事件未处理: ${JSON.stringify(event)}`)
    default:
      logger.error(`未知事件类型: ${JSON.stringify(event)}`)
  }
}
