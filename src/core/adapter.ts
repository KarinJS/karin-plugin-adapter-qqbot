// import got from 'got'
// import WebSocket from 'ws'
// import EventEmitter from 'events'
// import { Intents } from './intents'
// import { AccountCfgType } from '@/utils'
// import { common, logger, LoggerLevel } from 'node-karin'
// import {
//   Opcode,
//   IdType,
//   SeqType,
//   FileEnum,
//   PathType,
//   V2ApiType,
//   MessageType,
//   UploadMediaOptions,
//   SendMessageOptions,
//   UploadMediaResponse,
//   SendChannelMessageOptions,
//   SendMessageOptionsJson,
// } from '@/types'
// import { parentEventHandling } from '../ws/handlers'

// export interface SendMessageResponse {
//   /** 消息唯一ID */
//   id: string
//   /** 发送时间 */
//   timestamp: number
// }

// /**
//  * {key: xxx, values: xxx}，模版内变量与填充值的kv映射
//  */
// export type Params = Array<{ key: string, values: string[] }>

// export class QQBotCore extends EventEmitter {
//   /** 开发者的appId */
//   appId: string
//   /** Bot头像 */
//   avatar: string
//   /** Bot的昵称 */
//   nick: string
//   /** 调用凭证 */
//   #access_token: string
//   /** wss地址 */
//   wssUrl: string
//   /** 开发者的Secret 仅在内部使用 防止泄露 */
//   #Secret: string
//   /** wss连接 */
//   wss!: WebSocket
//   /** wss连接唯一值 */
//   seq: number = 0
//   /** 心跳内容 */
//   heartbeat: { op: 1, d: null | number, session_id: string }
//   /** 心跳生命周期 单位：毫秒 */
//   heartbeat_interval: number
//   /** 请求头 用于鉴权 */
//   headers: { [key: string]: string } = {}
//   /** 基本请求接口 */
//   host: string
//   #config: AccountCfgType

//   constructor (config: AccountCfgType) {
//     super()
//     this.#config = config
//     this.appId = String(this.#config.appId)
//     this.avatar = ''
//     this.nick = ''
//     this.#Secret = this.#config.secret
//     this.host = this.#config.sandBox ? this.#config.sandBoxApi : this.#config.qqBotApi
//     this.#access_token = ''
//     this.wssUrl = ''
//     this.heartbeat = { op: 1, d: null, session_id: '' }
//     this.heartbeat_interval = 0

//     // todo: 后续处理 重启后重新建立历史会话
//   }

//   logger (level: LoggerLevel, ...args: any[]) {
//     logger.bot(level, this.appId, ...args)
//   }

//   /**
//    * post请求
//    * @param url 请求地址
//    * @param options 请求参数
//    */
//   async post (url: string, options: any) {
//     try {
//       return await got.post(url, { json: options, headers: this.headers })
//     } catch (error: any) {
//       logger.error(`[got] 请求错误: ${JSON.stringify(error.response.body)}`)
//     }
//   }

//   /**
//    * 获取调用凭证
//    * @param clientSecret 开发者的Secret
//    * @param isRefresh 是否是刷新凭证
//    */
//   async getAccessToken (isRefresh = false) {
//     if (isRefresh) this.logger('debug', '凭证即将过期，开始刷新凭证')
//     const url = this.#config.accessTokenApi
//     const data = await got.post(url, {
//       json: { appId: this.appId, clientSecret: this.#Secret },
//       headers: { 'Content-Type': 'application/json' },
//     }).json() as {
//       /** 凭证有效时间，单位：秒 需要在倒计时50秒内刷新凭证 */
//       expires_in: string,
//       /** 调用凭证 */
//       access_token: string
//     }

//     const { expires_in: expiresIn, access_token: accessToken } = data
//     this.#access_token = accessToken
//     this.headers = { Authorization: `QQBot ${this.#access_token}`, 'X-Union-Appid': `BOT_${this.appId}` }

//     this.logger('debug', `凭证获取成功: ${JSON.stringify(data)}`)

//     /** 刷新凭证 */
//     const time = Number(expiresIn) * 1000 - 50000
//     setTimeout(async () => {
//       this.getAccessToken(true)
//     }, time)
//     return data
//   }

//   /**
//    * wss鉴权
//    * @param isAuth 是否鉴权
//    */
//   async wssAuth (isAuth: boolean) {
//     if (!isAuth) {
//       /** 断连后不需要重新ws鉴权 需要恢复登录态 Session */
//       const data = {
//         op: Opcode.Resume,
//         d: {
//           token: `QQBot ${this.#access_token}`,
//           session_id: this.heartbeat.session_id,
//           seq: this.heartbeat.d || 0,
//         },
//       }
//       this.wss.send(JSON.stringify(data))
//       return
//     }
//     const intents = Intents(['GROUP_AT_MESSAGE_CREATE', 'AT_MESSAGE_CREATE', 'DIRECT_MESSAGE_CREATE'])

//     if (intents === 0) throw new Error('intents 无效，请检查传入的事件名称是否正确')

//     const data = {
//       op: Opcode.Identify,
//       d: {
//         token: `QQBot ${this.#access_token}`,
//         intents,
//         shard: [0, 1],
//         properties: {
//           $os: 'Linux',
//           $browser: '@karinjs/adapter-qqbot',
//           $device: 'karin',
//         },
//       },
//     }

//     this.wss.send(JSON.stringify(data))
//   }

//   /**
//    * 获取wss地址
//    */
//   async getWssUrl () {
//     const url = `${this.host}/gateway`
//     const data = await got.get(url, { headers: this.headers }).json() as { url: string }
//     this.wssUrl = data.url
//   }

//   /**
//    * 获取当前Bot信息
//    */
//   async getBotInfo () {
//     const url = `${this.host}/users/@me`
//     const data = await got.get(url, { headers: this.headers }).json() as {
//       /** Bot id */
//       id: string,
//       /** Bot昵称 */
//       username: string,
//       /** Bot头像 */
//       avatar: string,
//       /** Bot分享链接 */
//       share_url: string,
//       /** 欢迎信息 */
//       welcome_msg: string,
//     }
//     return data
//   }

//   /**
//    * 创建wss连接
//    */
//   createWss (isAuth = true) {
//     this.wss = new WebSocket(this.wssUrl)
//     /** 建立连接成功之后 需要鉴权 */
//     this.wss.once('open', () => this.wssAuth(isAuth))
//     /** 监听事件 */
//     this.wss.on('message', (data: string) => parentEventHandling(this, data))
//     /** 监听ws关闭 */
//     this.wss.once('close', () => {
//       this.logger('error', 'ws连接关闭，正在重连')
//       /** 回收监听器 */
//       this.wss.removeAllListeners()
//       this.createWss(false)
//     })
//   }

//   /**
//    * 发送消息
//    * @param openid 用户、群openid
//    * @param type 请求路径类型
//    * @param options 请求参数
//    */
//   async sendMessage (openid: string, type: PathType, options: SendMessageOptions): Promise<SendMessageResponse> {
//     const url = this.buildUrl(openid, type, V2ApiType.Message)
//     const result = await this.post(url, options) as any
//     return JSON.parse(result.body) as SendMessageResponse
//   }

//   /**
//    * 构建发送文本消息请求参数
//    */
//   buildText (content: string, id?: string, seq?: number): SendMessageOptions {
//     const options: SendMessageOptions = {
//       content,
//       msg_type: MessageType.Text,
//     }

//     /** id存在 */
//     if (id) {
//       const { key, value } = this.buildId(id)
//       options[key] = value
//       options[SeqType.MsgSeq] = seq
//     }

//     return options
//   }

//   /**
//    * 上传富媒体文件
//    * @param openid 用户、群openid
//    * @param type 请求类型
//    * @param file 文件内容 http、base64、file://
//    * @param fileType 文件类型
//    */
//   async uploadMedia (openid: string, type: PathType, file: string, fileType: FileEnum): Promise<UploadMediaResponse> {
//     const options = await this.buildUploadMedia(file, fileType)
//     const url = this.buildUrl(openid, type, V2ApiType.Files)
//     return await got.post(url, options).json()
//   }

//   /**
//    * 构建v2接口请求地址
//    * @param openid 用户、群openid
//    * @param type 请求类型
//    * @param apiType v2接口类型
//    */
//   buildUrl (openid: string, type: PathType, apiType: V2ApiType) {
//     return `${this.host}/v2/${type}/${openid}/${apiType}`
//   }

//   /**
//    * 传入一个msg_id或者event_id 返回其对应的key和value
//    * @param id 消息id或者事件id
//    */
//   buildId (id: string) {
//     if (id.startsWith(':')) {
//       return { key: IdType.EventID, value: id }
//     } else {
//       return { key: IdType.MsgID, value: id }
//     }
//   }

//   /**
//    * 构建发送富媒体请求参数
//    * 富媒体消息只能单独发送 并且必须进行上传
//    * @param fileInfo 富媒体接口返回的file_info
//    * @param id 消息id或者事件id
//    */
//   buildMedia (fileInfo: string, id?: string, seq?: number): SendMessageOptions {
//     const options: SendMessageOptions = {
//       content: '',
//       msg_type: MessageType.Media,
//       media: {
//         file_info: fileInfo,
//       },
//     }

//     /** id存在 */
//     if (id) {
//       const { key, value } = this.buildId(id)
//       options[key] = value
//       options[SeqType.MsgSeq] = seq
//     }

//     return options
//   }

//   /**
//    * 构建发送Markdown模板请求参数
//    * @param customTemplateId 模板id
//    * @param params 模板参数
//    * @param id 消息id或者事件id
//    * @param seq 消息序号
//    */
//   buildTplMarkdown (
//     customTemplateId: string,
//     params: Params,
//     keyboard: SendMessageOptions['keyboard'],
//     id?: string,
//     seq?: number
//   ): SendMessageOptions {
//     const options: SendMessageOptions = {
//       msg_type: MessageType.Markdown,
//       content: '',
//       keyboard,
//       markdown: {
//         custom_template_id: customTemplateId,
//         params,
//       },
//     }

//     /** id存在 */
//     if (id) {
//       const { key, value } = this.buildId(id)
//       options[key] = value
//       options[SeqType.MsgSeq] = seq
//     }

//     return options
//   }

//   /**
//    * 构建发送原生Markdown请求参数
//    * @param content markdown文本
//    * @param id 消息id或者事件id
//    * @param seq 消息序号
//    */
//   buildRawMarkdown (
//     content: string,
//     keyboard: SendMessageOptions['keyboard'],
//     reply: SendMessageOptions['message_reference'],
//     id?: string,
//     seq?: number
//   ): SendMessageOptionsJson {
//     const options: SendMessageOptionsJson = {
//       msg_type: MessageType.Markdown,
//       content: '',
//       markdown: { content },
//       keyboard,
//       image: '',
//       message_reference: undefined,
//     }

//     if (reply) options.message_reference = reply

//     /** id存在 */
//     if (id) {
//       const { key, value } = this.buildId(id)
//       options[key] = value
//       options[SeqType.MsgSeq] = seq
//     }

//     return options
//   }

//   /**
//    * 构建上传富媒体请求参数
//    * @param file 文件内容 http、base64、file://
//    * @param fileType 文件类型
//    */
//   async buildUploadMedia (file: string, fileType: FileEnum): Promise<{
//     json: UploadMediaOptions,
//     headers: { [key: string]: string }
//   }> {
//     /** 非http转base64 */
//     if (!file.startsWith('http')) {
//       file = await common.base64(file)

//       return {
//         json: {
//           /** 发base64，无前缀 */
//           file_data: file,
//           file_type: fileType,
//           srv_send_msg: false,
//         },
//         headers: this.headers,
//       }
//     }

//     return {
//       json: {
//         /** http */
//         url: file,
//         file_type: fileType,
//         srv_send_msg: false,
//       },
//       headers: this.headers,
//     }
//   }

//   /**
//    * 发送文字子频道消息
//    * @param channelId 子频道id
//    * @param options 请求参数
//    */
//   async sendChannelMsg (channelId: string, options: SendChannelMessageOptions): Promise<any> {
//     const url = `${this.host}/channels/${channelId}/messages`
//     /** 判断options是不是FormData */
//     if (options instanceof FormData) {
//       const data = await got.post(url, { body: options, headers: this.headers })
//       console.log(data)
//       return data
//     }

//     return await this.post(url, options)
//   }

//   /**
//    * 发送频道私信消息
//    * @param guildId 频道id
//    * @param options 请求参数
//    */
//   async sendGuildPrivateMsg (guildId: string, options: SendChannelMessageOptions): Promise<any> {
//     const url = `${this.host}/dms/${guildId}/messages`
//     return await this.post(url, options)
//   }
// }
