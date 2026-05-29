import { URL } from 'url'
import { logger, registerBot, unregisterBot } from 'node-karin'
import { QQBotApi } from '@/core/api'
import { config, pkg, bindHandlers } from '@/utils/config'
import { createAxiosInstance, getAccessToken, stopTokenRefresh } from '@/core/internal/axios'
import { AdapterQQBot } from '@/core/adapter/base'
import { dispatch as dispatchEvent } from '@/core/event/dispatcher'
import { bus, offAll } from '@/connection/transport'
import * as ws from '@/connection/ws/manager'
import type { QQBotConfig } from '@/types/config'
import type { Event } from '@/types/event'

/**
 * 初始化所有 Bot
 */
export const initQQBotAdapter = async () => {
  const cfg = config()
  logger.debug(`[QQ Official Bot] 开始初始化 ${cfg.length} 个 Bot...`)
  for (const bot of cfg) {
    try {
      await createBot(bot)
    } catch (err) {
      logger.debug(`[QQ Official Bot] 初始化 Bot 失败 ${bot.appId || '(无 appId)'}:`, err)
    }
  }
}

/**
 * 初始化状态（防止并发触发重复连接）
 */
const initState = new Map<string, { hash: string; promise: Promise<void> }>()

const hashConfig = (bot: QQBotConfig): string => JSON.stringify({
  appId: bot.appId,
  secret: bot.secret,
  tokenApi: bot.tokenApi,
  prodApi: bot.prodApi,
  sandboxApi: bot.sandboxApi,
  sandbox: bot.sandbox,
  event: bot.event,
  keyboard: bot.keyboard,
})

/**
 * 创建单个 Bot 实例
 */
export const createBot = async (bot: QQBotConfig): Promise<void> => {
  const appId = String(bot.appId)
  if (!appId) {
    logger.warn('[QQ Official Bot] 配置缺少 appId，跳过')
    return
  }
  if (bot.event.type === 0) {
    logger.info(`[QQ Official Bot][${appId}] 事件接收方式为"关闭"，跳过`)
    return
  }

  const hash = hashConfig(bot)
  const existing = initState.get(appId)
  if (existing) {
    if (existing.hash === hash) return existing.promise
    await existing.promise.catch(() => {})
  }

  const promise = (async () => {
    // 清理旧资源
    unregisterBot('selfId', appId)
    ws.stop(appId)
    offAll(appId)
    stopTokenRefresh(appId)

    logger.info(`[QQ Official Bot][${appId}] 获取 access_token...`)
    await getAccessToken(bot.tokenApi, appId, bot.secret)

    const baseUrl = bot.sandbox ? bot.sandboxApi : bot.prodApi
    const axios = createAxiosInstance(baseUrl, appId)
    const api = new QQBotApi(axios)

    const me = await api.meta.getMe()
    const client = new AdapterQQBot(bot, api)
    client.account.name = me.username
    client.account.avatar = me.avatar
    client.account.selfId = appId

    const qq = new URL(me.share_url).searchParams.get('robot_uin')!
    client.account.subId.id = me.id
    client.account.subId.qq = qq
    client.account.subId.appid = appId
    client.account.subId.union_openid = me.union_openid

    bus.on(appId, (ev: Event) => dispatchEvent(client, ev))

    client.adapter.address = baseUrl
    client.adapter.secret = bot.secret
    client.adapter.version = pkg().version

    if (bot.event.type === 2) {
      client.adapter.index = registerBot('webSocketClient', client)
      logger.debug(`[QQ Official Bot][${appId}] 已注册为 webSocketClient`)
      await ws.start(bot)
    } else if (bot.event.type === 1) {
      client.adapter.index = registerBot('http', client)
      logger.debug(`[QQ Official Bot][${appId}] 已注册为 http`)
    }
  })()

  initState.set(appId, { hash, promise })
  promise.finally(() => {
    if (initState.get(appId)?.hash === hash) initState.delete(appId)
  })
  return promise
}

/**
 * 销毁 bot：注销 + 关 WS + 取消监听 + 停止 token 刷新
 */
export const destroyBot = (appId: string): void => {
  unregisterBot('selfId', appId)
  ws.stop(appId)
  offAll(appId)
  stopTokenRefresh(appId)
}

// 把 createBot / destroyBot 注入到 config watch 回调
bindHandlers(createBot, destroyBot)
