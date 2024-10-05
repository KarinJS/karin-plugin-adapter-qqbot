import got from 'got'
import WebSocket from 'ws'
import EventEmitter from 'events'
import { Opcode } from '@/types'
import { Intents } from '../core/intents'
import { AccountCfgType } from '@/utils'
import { logger, LoggerLevel } from 'node-karin'
import { parentEventHandling } from './handlers'

/**
 * QQBot客户端 处理wss连接等
 * @extends EventEmitter
 */
export class QQBotClient extends EventEmitter {
  /** 开发者的appId */
  appId: string
  /** 调用凭证 */
  access_token: string
  /** wss地址 */
  wssUrl: string
  /** 开发者的Secret 仅在内部使用 防止泄露 */
  Secret: string
  /** wss连接 */
  wss!: WebSocket
  /** wss连接唯一值 */
  seq: number = 0
  /** 心跳内容 */
  heartbeat: { op: 1, d: null | number, session_id: string }
  /** 心跳生命周期 单位：毫秒 */
  heartbeat_interval: number
  /** 请求头 用于鉴权 */
  headers: { [key: string]: string } = {}
  /** 基本请求接口 */
  host: string
  config: AccountCfgType

  constructor (config: AccountCfgType) {
    super()
    this.config = config
    this.appId = String(this.config.appId)
    this.Secret = this.config.secret
    this.host = this.config.sandBox ? this.config.sandBoxApi : this.config.qqBotApi
    this.access_token = ''
    this.wssUrl = ''
    this.heartbeat = { op: 1, d: null, session_id: '' }
    this.heartbeat_interval = 0

    // todo: 后续处理 重启后重新建立历史会话
  }

  /** 获取请求头 */
  get getHeaders () {
    return this.headers
  }

  /** 获取api地址 */
  get getHost () {
    return this.host
  }

  /** 获取Appid */
  get getAppId () {
    return this.appId
  }

  /**
   * 日志记录
   * @param level 日志等级
   * @param args 日志内容
   */
  logger (level: LoggerLevel, ...args: any[]) {
    logger.bot(level, this.appId, ...args)
  }

  /**
   * 获取调用凭证
   * @param clientSecret 开发者的Secret
   * @param isRefresh 是否是刷新凭证
   */
  async getAccessToken (isRefresh = false) {
    if (isRefresh) this.logger('debug', '凭证即将过期，开始刷新凭证')
    const url = this.config.accessTokenApi

    const data = await got.post(url, {
      json: { appId: this.appId, clientSecret: this.Secret },
      headers: { 'Content-Type': 'application/json' },
    }).json() as {
      /** 凭证有效时间，单位：秒 需要在倒计时50秒内刷新凭证 */
      expires_in: string,
      /** 调用凭证 */
      access_token: string
    }

    const { expires_in: expiresIn, access_token: accessToken } = data
    this.access_token = accessToken
    this.headers = { Authorization: `QQBot ${this.access_token}`, 'X-Union-Appid': `BOT_${this.appId}` }

    this.logger('debug', `凭证获取成功: ${JSON.stringify(data)}`)

    /** 刷新凭证 */
    const time = Number(expiresIn) * 1000 - 50000
    setTimeout(async () => {
      this.getAccessToken(true)
    }, time)
    return data
  }

  /**
   * 获取wss地址
   */
  async getWssUrl () {
    const url = `${this.host}/gateway`
    const data = await got.get(url, { headers: this.headers }).json() as { url: string }
    this.wssUrl = data.url
  }

  /**
   * wss鉴权
   * @param isAuth 是否鉴权
   */
  async wssAuth (isAuth: boolean) {
    if (!isAuth) {
      /** 断连后不需要重新ws鉴权 需要恢复登录态 Session */
      const data = {
        op: Opcode.Resume,
        d: {
          token: `QQBot ${this.access_token}`,
          session_id: this.heartbeat.session_id,
          seq: this.heartbeat.d || 0,
        },
      }
      this.wss.send(JSON.stringify(data))
      return
    }
    const intents = Intents(['GROUP_AT_MESSAGE_CREATE', 'AT_MESSAGE_CREATE', 'DIRECT_MESSAGE_CREATE'])

    if (intents === 0) throw new Error('intents 无效，请检查传入的事件名称是否正确')

    const data = {
      op: Opcode.Identify,
      d: {
        token: `QQBot ${this.access_token}`,
        intents,
        shard: [0, 1],
        properties: {
          $os: 'Linux',
          $browser: '@karinjs/adapter-qqbot',
          $device: 'karin',
        },
      },
    }

    this.wss.send(JSON.stringify(data))
  }

  /**
   * 创建wss连接
   * @param isAuth 是否鉴权
   */
  createWss (isAuth = true) {
    this.wss = new WebSocket(this.wssUrl)
    /** 建立连接成功之后 需要鉴权 */
    this.wss.once('open', () => this.wssAuth(isAuth))
    /** 监听事件 */
    this.wss.on('message', (data: string) => parentEventHandling(this, data))
    /** 监听ws关闭 */
    this.wss.once('close', () => {
      this.emit('close')
      this.logger('error', 'ws连接关闭，正在重连')
      /** 回收监听器 */
      this.wss.removeAllListeners()
      this.createWss(false)
    })
  }
}
