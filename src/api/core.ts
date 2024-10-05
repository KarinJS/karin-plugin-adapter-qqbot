import got from 'got'
import { logger } from 'node-karin'
import { QQBotApi } from './other'
import { QQBotClient } from '@/websocket/client'
import { AccountCfgType, config } from '@/utils'
import { EventEnum } from '@/types'
import { AdapterQQBot } from '@/adapter'
import { groupMessage, friendMessage, guildMessage, guildDirectMessage } from '@/messages'

export type PostType = ((url: string, data: any) => Promise<any>) & {
  get: (url: string) => Promise<any>
}

/**
 * 核心函数
 * @param config 配置
 */
export const core = (config: AccountCfgType) => {
  if (!config) throw new Error('Config is required')
  const client = new QQBotClient(config)
  const host = client.host

  /**
   * post请求
   * @param url 请求地址 不包含host
   * @param data 请求数据
   */
  const post: PostType = async (url: string, data: any) => {
    try {
      url = `${host}${url}`
      const result = await got.post(url, Object.assign({ headers: client.getHeaders }, data))
      return result.body ? JSON.parse(result.body) : result
    } catch (error: any) {
      logger.error(`[got] 请求错误: ${JSON.stringify(error.response.body)}`)
      return error.response.body
    }
  }

  post.get = async (url: string) => {
    try {
      url = `${host}${url}`
      const result = await got.get(url, { headers: client.getHeaders })
      return result.body ? JSON.parse(result.body) : result
    } catch (error: any) {
      logger.error(`[got] 请求错误: ${JSON.stringify(error.response.body)}`)
      return error.response.body
    }
  }

  const api = new QQBotApi(post)
  const selfId = String(config.appId)
  const adapter = new AdapterQQBot(selfId, api, client)

  client.on(EventEnum.GROUP_AT_MESSAGE_CREATE, (data) => groupMessage(adapter, selfId, data))
  client.on(EventEnum.C2C_MESSAGE_CREATE, (data) => friendMessage(adapter, selfId, data))
  client.on(EventEnum.AT_MESSAGE_CREATE, (data) => guildMessage(adapter, selfId, data))
  client.on(EventEnum.DIRECT_MESSAGE_CREATE, (data) => guildDirectMessage(adapter, selfId, data))

  client.getAccessToken()
    .then(async () => {
      await client.getWssUrl()
      client.createWss()
    })

  return {
    api,
    post,
    host,
    client,
    adapter,
  }
}

const list = Object.keys(config.Config.accounts).filter(v => v !== 'default')
for (const v of list) {
  const cfg = config.getBotConfig(v)
  if (!cfg) continue
  core(cfg)
}
