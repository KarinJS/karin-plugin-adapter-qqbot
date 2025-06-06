import FormData from 'form-data'
import lodash from 'node-karin/lodash'
import { AxiosError } from 'node-karin/axios'
import type { createAxiosInstance } from '@/core/internal/axios'
import type {
  Ark,
  DmsResponse,
  Embeds,
  GetMeResponse,
  Keyboard,
  Markdown,
  MediaType,
  Scene,
  SendGuildArkMessageRequest,
  SendGuildEmbedMessageRequest,
  SendGuildMarkdownMessageRequest,
  SendGuildMessageRequest,
  SendGuildMsg,
  SendGuildResponse,
  SendGuildTextMessageRequest,
  SendQQArkMessageRequest,
  SendQQMarkdownMessageRequest,
  SendQQMediaMessageRequest,
  SendQQMsg,
  SendQQMsgResponse,
  SendQQTextMessageRequest,
  UploadMediaResponse
} from './types'

export class QQBotApi {
  /** axios 实例 */
  public axios: ReturnType<typeof createAxiosInstance>
  constructor (axios: ReturnType<typeof createAxiosInstance>) {
    this.axios = axios
  }

  /**
   * 发送get请求
   * @param path 请求路径
   * @returns 请求结果
   */
  async get<T> (path: string): Promise<T> {
    try {
      const { data } = await this.axios.get(path)
      return data
    } catch (error) {
      this.handleError(path, {}, error)
      throw error
    }
  }

  /**
   * 发送post请求
   * @param path 请求路径
   * @param options 请求数据
   * @param headers 请求头
   */
  async post<T> (path: string, options = {}, headers?: Record<string, string>): Promise<T> {
    try {
      const result = await this.axios.post(path, options, { headers })
      return result.data
    } catch (error) {
      this.handleError(path, options, error)
      throw error
    }
  }

  /**
   * 处理请求错误
   * @param error 错误信息
   */
  handleError (path: string, options: any, error: any) {
    if (error instanceof AxiosError) {
      throw new Error([
        '[axios] 请求失败',
        `请求路径: ${path}`,
        `请求数据: ${lodash.truncate(JSON.stringify(options), { length: 500 })}`,
        `响应数据: ${JSON.stringify(error?.response?.data)}`
      ].join('\n'))
    }

    if (error.request) throw error.request?.message || error.request
    throw error?.message || error?.stack || error
  }

  /**
   * 发送单聊消息
   * @param targetId 目标QQ用户的 openid
   * @param options 消息参数
   */
  sendFriendMsg (targetId: string, options: SendQQMsg): Promise<SendQQMsgResponse> {
    return this.post(`/v2/users/${targetId}/messages`, options)
  }

  /**
   * 发送群聊消息
   * @param targetId 目标QQ群的 openid
   * @param options 消息参数
   */
  sendGroupMsg (targetId: string, options: SendQQMsg): Promise<SendQQMsgResponse> {
    return this.post(`/v2/groups/${targetId}/messages`, options)
  }

  /**
   * 构建QQBot文本消息参数
   * @param content 消息文本内容
   */
  QQdMsgOptions (type: 'text', content: string): SendQQTextMessageRequest
  /**
   * 构建Markdown消息参数
   * @param markdown Markdown文本内容
   * @param keyboard 按钮
   */
  QQdMsgOptions (type: 'markdown', markdown: Markdown, keyboard?: Keyboard): SendQQMarkdownMessageRequest
  /**
   * 构建Ark消息参数
   * @param ark Ark参数
   */
  QQdMsgOptions (type: 'ark', ark: SendQQArkMessageRequest['ark']): SendQQArkMessageRequest
  /**
   * 构建Media消息参数
   * @param file 文件信息
   */
  QQdMsgOptions (type: 'media', file: string): SendQQMediaMessageRequest

  QQdMsgOptions (
    type: 'text' | 'markdown' | 'ark' | 'media',
    data: any,
    keyboard?: Keyboard
  ): SendQQMsg {
    switch (type) {
      case 'text':
        return { msg_type: 0, content: data }
      case 'markdown':
        return { msg_type: 2, markdown: data, keyboard }
      case 'ark':
        return { msg_type: 3, ark: data }
      case 'media':
        return { msg_type: 7, media: { file_info: data }, content: '' }
      default:
        throw new Error('未知的消息类型')
    }
  }

  /**
   * 构建频道文本、文本图片消息参数
   * @param type 消息类型
   * @param content 消息内容
   * @param image 图片url
   */
  GuildMsgOptions (type: 'text', content: string, image?: string): SendGuildTextMessageRequest
  /**
   * 构建图片消息参数
   * @param type 消息类型
   * @param image 图片url
   */
  GuildMsgOptions (type: 'image', image: string): SendGuildTextMessageRequest
  /**
   * 构建Embed消息参数
   * @param type 消息类型
   * @param embed Embed参数
   */
  GuildMsgOptions (type: 'embed', embed: Embeds): SendGuildEmbedMessageRequest
  /**
   * 构建Ark消息参数
   * @param type 消息类型
   * @param ark Ark参数
   */
  GuildMsgOptions (type: 'ark', ark: Ark): SendGuildArkMessageRequest
  /**
   * 构建Markdown消息参数
   * @param type 消息类型
   * @param markdown Markdown文本
   */
  GuildMsgOptions (type: 'markdown', markdown: Markdown): SendGuildMarkdownMessageRequest
  GuildMsgOptions (
    type: SendGuildMessageRequest['type'],
    data: any,
    image?: string
  ): SendGuildMsg {
    switch (type) {
      case 'text':
        return { type: 'text', content: data, image }
      case 'image':
        return { type: 'image', image: data }
      case 'embed':
        return { type: 'embed', embed: data }
      case 'ark':
        return { type: 'ark', ark: data }
      case 'markdown':
        return { type: 'markdown', markdown: data }
      default:
        throw new Error('未知的消息类型')
    }
  }

  /**
   * 上传富媒体文件
   * @param scene 上传场景
   * @param targetId 目标id
   * @param type 文件类型
   * @param url 需要上传的文件的url
   * @param srvSendMsg 是否发送消息
   */
  uploadMedia (scene: Scene, targetId: string, type: MediaType, url: string, srvSendMsg?: boolean): Promise<UploadMediaResponse>
  /**
   * 上传富媒体文件
   * @param scene 上传场景
   * @param targetId 目标id
   * @param type 文件类型
   * @param base64 需要上传的文件的base64编码
   * @param srvSendMsg 是否发送消息
   */
  uploadMedia (scene: Scene, targetId: string, type: MediaType, base64: string, srvSendMsg?: boolean): Promise<UploadMediaResponse>
  uploadMedia (scene: Scene, targetId: string, type: MediaType, data: string, srvSendMsg = false): Promise<UploadMediaResponse> {
    const map = {
      image: 1,
      video: 2,
      record: 3,
      file: 4
    }

    const options: Record<string, any> = {
      file_type: map[type],
      srv_send_msg: srvSendMsg
    }

    if (data.startsWith('http')) {
      options.url = data
    } else {
      options.file_data = data.replace(/^data:image\/\w+;base64,|^base64:\/\//g, '')
    }

    return this.post(`/v2/${scene}s/${targetId}/files`, options)
  }

  /**
   * 单聊撤回消息
   * @param type 场景类型
   * @param targetId 目标QQ用户的openid
   * @param messageId 消息id
   */
  recallMsg (type: 'user', targetId: string, messageId: string): Promise<boolean>
  /**
   * 群聊撤回消息
   * @param type 场景类型
   * @param targetId 目标QQ群的openid
   * @param messageId 消息id
   */
  recallMsg (type: 'group', targetId: string, messageId: string): Promise<boolean>
  /**
   * 文字子频道撤回消息
   * @param type 场景类型
   * @param channelId 子频道的id
   * @param messageId 消息id
   * @param hidetip 是否隐藏提示小灰条，true 为隐藏，false 为显示。默认为false
   */
  recallMsg (type: 'channels', channelId: string, messageId: string, hidetip?: boolean): Promise<boolean>
  /**
   * 频道私信撤回消息
   * @param type 场景类型
   * @param guildId 频道的id
   * @param messageId 消息id
   * @param hidetip 是否隐藏提示小灰条，true 为隐藏，false 为显示。默认为false
   */
  recallMsg (type: 'dms', guildId: string, messageId: string, hidetip?: boolean): Promise<boolean>
  async recallMsg (
    type: Scene | 'dms' | 'channels',
    targetId: string,
    messageId: string,
    hidetip = false
  ): Promise<boolean> {
    let url: string
    if (type === 'user') {
      url = `/v2/users/${targetId}/messages/${messageId}`
    } else if (type === 'group') {
      url = `/v2/groups/${targetId}/messages/${messageId}`
    } else if (type === 'channels') {
      url = ` /channels/${targetId}/messages/${messageId}?hidetip=${hidetip}`
    } else if (type === 'dms') {
      url = `/dms/${targetId}/messages/${messageId}?hidetip=${hidetip}`
    } else {
      throw new Error('未知的撤回消息类型')
    }

    return this.get(url).then(() => true).catch(() => false)
  }

  /**
   * 发送文字子频道消息
   * @param targetId 目标子频道的id
   * @param options 消息参数
   */
  sendChannelMsg (targetId: string, options: SendGuildMsg | FormData): Promise<SendGuildResponse> {
    const headers = options instanceof FormData ? options.getHeaders() : undefined
    return this.post(`/channels/${targetId}/messages`, options, headers)
  }

  /**
   * 直接发送频道消息
   * @param guildID 频道的id
   * @param options 消息参数
   */
  sendDmsMsg (guildID: string, options: SendGuildMsg | FormData): Promise<SendGuildResponse>
  /**
   * 发送频道私信消息
   * @param targetId 目标的id
   * @param srcGuildId 源频道的id
   * @param options 消息参数
   */
  sendDmsMsg (targetId: string, srcGuildId: string, options: SendGuildMsg | FormData): Promise<SendGuildResponse>

  /**
   * 发送频道私信消息
   * @param targetId 目标的id
   * @param data 源频道的id
   * @param options 消息参数
   */
  async sendDmsMsg (
    targetId: string,
    data: string | SendGuildMsg | FormData,
    options?: SendGuildMsg | FormData
  ): Promise<SendGuildResponse> {
    if (typeof data === 'string') {
      const { guild_id: guildId } = await this.dms(targetId, data)
      const headers = options instanceof FormData ? options.getHeaders() : undefined
      return this.post(`/dms/${guildId}/messages`, options, headers)
    }

    const headers = data instanceof FormData ? data.getHeaders() : undefined
    return this.post(`/dms/${targetId}/messages`, data, headers)
  }

  /**
   * 获取当前机器人详情
   */
  getMe (): Promise<GetMeResponse> {
    return this.get<GetMeResponse>('/users/@me')
  }

  /**
   * 创建私信会话
   * @param recipientID 接受者id
   * @param srcGuildID 源频道id
   */
  dms (recipientID: string, srcGuildID: string): Promise<DmsResponse> {
    return this.post('/users/@me/dms', { recipient_id: recipientID, source_guild_id: srcGuildID })
  }
}
