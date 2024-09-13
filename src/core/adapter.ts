import got from 'got'
import WebSocket from 'ws'
import EventEmitter from 'events'
import { Intents } from './intents'
import { AccountCfgType } from '@/utils'
import { common, logger, LoggerLevel } from 'node-karin'
import {
  IdType,
  SeqType,
  FileType,
  PathType,
  V2ApiType,
  EventType,
  MessageType,
  UploadMediaOptions,
  SendMessageOptions,
  UploadMediaResponse,
  SubEvent,
  Opcode,
  SendChannelMessageOptions,
  SendMessageOptionsJson,
} from '@/types'

export interface SendMessageResponse {
  /** 消息唯一ID */
  id: string
  /** 发送时间 */
  timestamp: number
}

/**
 * {key: xxx, values: xxx}，模版内变量与填充值的kv映射
 */
export type Params = Array<{ key: string, values: string[] }>

export class QQBotApi extends EventEmitter {
  /** 开发者的appId */
  appId: string
  /** Bot头像 */
  avatar: string
  /** Bot的昵称 */
  nick: string
  /** 调用凭证 */
  #access_token: string
  /** wss地址 */
  wssUrl: string
  /** 开发者的Secret 仅在内部使用 防止泄露 */
  #Secret: string
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
  #config: AccountCfgType

  constructor (config: AccountCfgType) {
    super()
    this.#config = config
    this.appId = String(this.#config.appId)
    this.avatar = ''
    this.nick = ''
    this.#Secret = this.#config.secret
    this.host = this.#config.sandBox ? this.#config.sandBoxApi : this.#config.qqBotApi
    this.#access_token = ''
    this.wssUrl = ''
    this.heartbeat = { op: 1, d: null, session_id: '' }
    this.heartbeat_interval = 0

    // 后续处理 重启后重新建立历史会话
  }

  logger (level: LoggerLevel, ...args: any[]) {
    logger.bot(level, this.appId, ...args)
  }

  /**
   * post请求
   * @param url 请求地址
   * @param options 请求参数
   */
  async post (url: string, options: any) {
    try {
      return await got.post(url, { json: options, headers: this.headers })
    } catch (error: any) {
      logger.error(`[got] 请求错误: ${JSON.stringify(error.response.body)}`)
    }
  }

  /**
   * 获取调用凭证
   * @param clientSecret 开发者的Secret
   * @param isRefresh 是否是刷新凭证
   */
  async getAccessToken (isRefresh = false) {
    if (isRefresh) this.logger('debug', '凭证即将过期，开始刷新凭证')
    const url = this.#config.accessTokenApi
    const data = await got.post(url, {
      json: { appId: this.appId, clientSecret: this.#Secret },
      headers: { 'Content-Type': 'application/json' },
    }).json() as {
      /** 凭证有效时间，单位：秒 需要在倒计时50秒内刷新凭证 */
      expires_in: string,
      /** 调用凭证 */
      access_token: string
    }

    const { expires_in, access_token } = data
    this.#access_token = access_token
    this.headers = { Authorization: `QQBot ${this.#access_token}`, 'X-Union-Appid': `BOT_${this.appId}` }

    this.logger('debug', `凭证获取成功: ${JSON.stringify(data)}`)

    /** 刷新凭证 */
    const time = Number(expires_in) * 1000 - 50000
    setTimeout(async () => {
      this.getAccessToken(true)
    }, time)
    return data
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
          token: `QQBot ${this.#access_token}`,
          session_id: this.heartbeat.session_id,
          seq: this.heartbeat.d || 0,
        },
      }
      this.wss.send(JSON.stringify(data))
      return
    }
    const intents = Intents(['GROUP_AT_MESSAGE_CREATE', 'AT_MESSAGE_CREATE'])

    if (intents === 0) throw new Error('intents 无效，请检查传入的事件名称是否正确')

    const data = {
      op: Opcode.Identify,
      d: {
        token: `QQBot ${this.#access_token}`,
        intents,
        shard: [0, 1],
        properties: {
          $os: 'Linux',
          $browser: 'karin-plugin-adapter-qqbot',
          $device: 'karin',
        },
      },
    }

    this.wss.send(JSON.stringify(data))
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
   * 获取当前Bot信息
   */
  async getBotInfo () {
    const url = `${this.host}/users/@me`
    const data = await got.get(url, { headers: this.headers }).json() as {
      /** Bot id */
      id: string,
      /** Bot昵称 */
      username: string,
      /** Bot头像 */
      avatar: string,
      /** Bot分享链接 */
      share_url: string,
      /** 欢迎信息 */
      welcome_msg: string,
    }
    return data
  }

  /**
   * 创建wss连接
   */
  createWss (isAuth = true) {
    this.wss = new WebSocket(this.wssUrl)
    /** 建立连接成功之后 需要鉴权 */
    this.wss.once('open', () => this.wssAuth(isAuth))
    /** 监听事件 */
    this.wss.on('message', (data: string) => this.payload(data))
    /** 监听ws关闭 */
    this.wss.once('close', () => {
      this.logger('error', 'ws连接关闭，正在重连')
      /** 回收监听器 */
      this.wss.removeAllListeners()
      this.createWss(false)
    })
  }

  payload (payload: string) {
    const data = JSON.parse(payload)
    this.logger('debug', `收到事件推送: ${JSON.stringify(data, null, 2)}`)
    switch (data.op) {
      case 0:
        this.intents(data)
        this.logger('debug', '事件推送', JSON.stringify(data, null, 2))
        break
      case Opcode.Heartbeat:
        /** 在指定时间进行回包 */
        this.wss.send(JSON.stringify({ op: 11, d: null }))
        this.logger('debug', '心跳', JSON.stringify(data, null, 2))
        break
      case Opcode.Identify:
        this.logger('info', '鉴权成功', JSON.stringify(data, null, 2))
        break
      case Opcode.Resume:
        this.logger('info', '客户端恢复连接', JSON.stringify(data, null, 2))
        break
      case Opcode.Reconnect:
        this.logger('info', '服务端要求重新连接', JSON.stringify(data, null, 2))
        /** 断开已有ws */
        this.wss.close()
        break
      case Opcode.InvalidSession:
        /** 当 identify 或 resume 的时候，如果参数有错，服务端会返回该消息 */
        this.logger('error', '参数错误', JSON.stringify(data, null, 2))
        break
      case Opcode.Hello:
        /** 更新生命周期 对声明周期减少3秒 防止过时 */
        this.heartbeat_interval = data.d.heartbeat_interval - 3000
        this.logger('debug', '心跳生命周期更新', JSON.stringify(data, null, 2))
        break
      case Opcode.HeartbeatACK:
        this.logger('debug', '心跳回包', JSON.stringify(data, null, 2))
        break
      case Opcode.HTTPCallbackACK:
        /** 仅用于 http 回调模式的回包，代表机器人收到了平台推送的数据 */
        this.logger('debug', '回包', JSON.stringify(data, null, 2))
        break
    }
  }

  /**
   * 事件处理
   */
  async intents (data: SubEvent) {
    switch (data.t) {
      case EventType.READY: {
        /** 发送第一次心跳 */
        this.wss.send(JSON.stringify(this.heartbeat))
        /** 更新心跳唯一值 */
        this.heartbeat.d = data.s
        /** 记录session_id 用于重新连接 */
        this.heartbeat.session_id = data.d.session_id
        /** 心跳 */
        setInterval(() => this.wss.send(JSON.stringify(this.heartbeat)), this.heartbeat_interval)
        const info = await this.getBotInfo()
        this.avatar = info.avatar
        this.nick = data.d.user.username
        this.emit('start')
        break
      }
      case EventType.GROUP_AT_MESSAGE_CREATE: {
        this.heartbeat.d = data.s
        this.emit(EventType.GROUP_AT_MESSAGE_CREATE, data)
        break
      }
      case EventType.C2C_MESSAGE_CREATE: {
        this.heartbeat.d = data.s
        this.emit(EventType.C2C_MESSAGE_CREATE, data)
        break
      }
      // case 'GUILD_CREATE':
      // case 'GUILD_UPDATE':
      // case 'GUILD_DELETE':
      // case 'CHANNEL_CREATE':
      // case 'CHANNEL_UPDATE':
      // case 'CHANNEL_DELETE':
      // case 'GUILD_MEMBER_ADD':
      // case 'GUILD_MEMBER_UPDATE':
      // case 'GUILD_MEMBER_REMOVE':
      // case 'MESSAGE_CREATE':
      // case 'MESSAGE_DELETE':
      // case 'MESSAGE_REACTION_ADD':
      // case 'MESSAGE_REACTION_REMOVE':
      // case 'DIRECT_MESSAGE_CREATE':
      // case 'DIRECT_MESSAGE_DELETE':
      // case 'FRIEND_ADD':
      // case 'FRIEND_DEL':
      // case 'C2C_MSG_REJECT':
      // case 'C2C_MSG_RECEIVE':
      // case 'GROUP_ADD_ROBOT':
      // case 'GROUP_DEL_ROBOT':
      // case 'GROUP_MSG_REJECT':
      // case 'GROUP_MSG_RECEIVE':
      // case 'INTERACTION_CREATE':
      // case 'MESSAGE_AUDIT_PASS':
      // case 'MESSAGE_AUDIT_REJECT':
      // case 'FORUM_THREAD_CREATE':
      // case 'FORUM_THREAD_UPDATE':
      // case 'FORUM_THREAD_DELETE':
      // case 'FORUM_POST_CREATE':
      // case 'FORUM_POST_DELETE':
      // case 'FORUM_REPLY_CREATE':
      // case 'FORUM_REPLY_DELETE':
      // case 'FORUM_PUBLISH_AUDIT_RESULT':
      // case 'AUDIO_START':
      // case 'AUDIO_FINISH':
      // case 'AUDIO_ON_MIC':
      // case 'AUDIO_OFF_MIC':
      case EventType.MESSAGE_CREATE:
      case EventType.AT_MESSAGE_CREATE: {
        this.heartbeat.d = data.s
        this.emit(data.t, data)
        break
      }
      // case 'PUBLIC_MESSAGE_DELETE':
      // case 'RESUMED:  {"op":0,"s":53,"t":"RESUMED","d":""} 在客户端恢复连接时收到
      case EventType.RESUMED: {
        this.logger('mark', '[重连] 客户端恢复连接')
        return
      }
      default:
        console.log(`Unhandled event: ${JSON.stringify(data)}`)
    }
  }

  /**
   * 发送消息
   * @param openid 用户、群openid
   * @param type 请求路径类型
   * @param options 请求参数
   */
  async sendMessage (openid: string, type: PathType, options: SendMessageOptions): Promise<SendMessageResponse> {
    const url = this.buildUrl(openid, type, V2ApiType.Message)
    const result = await this.post(url, options) as any
    return JSON.parse(result.body) as SendMessageResponse
  }

  /**
   * 构建发送文本消息请求参数
   */
  buildText (content: string, id?: string, seq?: number): SendMessageOptions {
    const options: SendMessageOptions = {
      content,
      msg_type: MessageType.Text,
    }

    /** id存在 */
    if (id) {
      const { key, value } = this.buildId(id)
      options[key] = value
      options[SeqType.MsgSeq] = seq
    }

    return options
  }

  /**
   * 上传富媒体文件
   * @param openid 用户、群openid
   * @param type 请求类型
   * @param file 文件内容 http、base64、file://
   * @param file_type 文件类型
   */
  async uploadMedia (openid: string, type: PathType, file: string, file_type: FileType): Promise<UploadMediaResponse> {
    const options = await this.buildUploadMedia(file, file_type)
    const url = this.buildUrl(openid, type, V2ApiType.Files)
    return await got.post(url, options).json()
  }

  /**
   * 构建v2接口请求地址
   * @param openid 用户、群openid
   * @param type 请求类型
   * @param apiType v2接口类型
   */
  buildUrl (openid: string, type: PathType, apiType: V2ApiType) {
    return `${this.host}/v2/${type}/${openid}/${apiType}`
  }

  /**
   * 传入一个msg_id或者event_id 返回其对应的key和value
   * @param id 消息id或者事件id
   */
  buildId (id: string) {
    if (id.startsWith(':')) {
      return { key: IdType.EventID, value: id }
    } else {
      return { key: IdType.MsgID, value: id }
    }
  }

  /**
   * 构建发送富媒体请求参数
   * 富媒体消息只能单独发送 并且必须进行上传
   * @param file_info 富媒体接口返回的file_info
   * @param id 消息id或者事件id
   */
  buildMedia (file_info: string, id?: string, seq?: number): SendMessageOptions {
    const options: SendMessageOptions = {
      content: '',
      msg_type: MessageType.Media,
      media: {
        file_info,
      },
    }

    /** id存在 */
    if (id) {
      const { key, value } = this.buildId(id)
      options[key] = value
      options[SeqType.MsgSeq] = seq
    }

    return options
  }

  /**
   * 构建发送Markdown模板请求参数
   * @param custom_template_id 模板id
   * @param params 模板参数
   * @param id 消息id或者事件id
   * @param seq 消息序号
   */
  buildTplMarkdown (
    custom_template_id: string,
    params: Params,
    keyboard: SendMessageOptions['keyboard'],
    id?: string,
    seq?: number
  ): SendMessageOptions {
    const options: SendMessageOptions = {
      msg_type: MessageType.Markdown,
      content: '',
      keyboard,
      markdown: {
        custom_template_id,
        params,
      },
    }

    /** id存在 */
    if (id) {
      const { key, value } = this.buildId(id)
      options[key] = value
      options[SeqType.MsgSeq] = seq
    }

    return options
  }

  /**
   * 构建发送原生Markdown请求参数
   * @param content markdown文本
   * @param id 消息id或者事件id
   * @param seq 消息序号
   */
  buildRawMarkdown (
    content: string,
    keyboard: SendMessageOptions['keyboard'],
    reply: SendMessageOptions['message_reference'],
    id?: string,
    seq?: number
  ): SendMessageOptionsJson {
    const options: SendMessageOptionsJson = {
      msg_type: MessageType.Markdown,
      content: '',
      markdown: { content },
      keyboard,
      image: '',
      message_reference: undefined,
    }

    if (reply) options.message_reference = reply

    /** id存在 */
    if (id) {
      const { key, value } = this.buildId(id)
      options[key] = value
      options[SeqType.MsgSeq] = seq
    }

    return options
  }

  /**
   * 构建上传富媒体请求参数
   * @param file 文件内容 http、base64、file://
   * @param file_type 文件类型
   */
  async buildUploadMedia (file: string, file_type: FileType): Promise<{
    json: UploadMediaOptions,
    headers: { [key: string]: string }
  }> {
    /** 非http转base64 */
    if (!file.startsWith('http')) {
      file = await common.base64(file)

      return {
        json: {
          /** 发base64，无前缀 */
          file_data: file,
          file_type,
          srv_send_msg: false,
        },
        headers: this.headers,
      }
    }

    return {
      json: {
        /** http */
        url: file,
        file_type,
        srv_send_msg: false,
      },
      headers: this.headers,
    }
  }

  /**
   * 发送文字子频道消息
   * @param channel_id 子频道id
   * @param options 请求参数
   */
  async sendChannelText (channel_id: string, options: SendChannelMessageOptions): Promise<any> {
    const url = `${this.host}/channels/${channel_id}/messages`
    /** 判断options是不是FormData */
    if (options instanceof FormData) {
      const data = await got.post(url, { body: options, headers: this.headers })
      console.log(data)
      return data
    }

    return await this.post(url, options)
  }

  /**
   * 发送Markdown、按钮
   */
}
