import FormData from 'form-data'
import { Http } from './http'
import type {
  SendQQMsg, SendQQMsgResponse, SendGuildMsg, SendGuildResponse, Scene,
  SendQQStreamMessageRequest, SendQQStreamMessageResponse, QQMessageID,
} from './types'

/** 输入中状态默认展示时长（秒），平台 typing 窗口约 60s */
const INPUT_NOTIFY_DEFAULT_SECOND = 60

/**
 * 消息发送 + 撤回
 */
export class MessagesApi extends Http {
  /** 单聊消息 */
  sendFriendMsg (openid: string, body: SendQQMsg): Promise<SendQQMsgResponse> {
    return this.post(`/v2/users/${openid}/messages`, body)
  }

  /** 群聊消息 */
  sendGroupMsg (groupOpenid: string, body: SendQQMsg): Promise<SendQQMsgResponse> {
    return this.post(`/v2/groups/${groupOpenid}/messages`, body)
  }

  /**
   * 单聊输入中状态（msg_type=6，仅单聊）
   * @param openid 用户 openid
   * @param inputSecond 展示时长（秒），默认 60
   * @param passive 被动消息参数（msg_id / event_id / msg_seq），可选
   */
  sendFriendInputNotify (
    openid: string,
    inputSecond: number = INPUT_NOTIFY_DEFAULT_SECOND,
    passive?: QQMessageID
  ): Promise<SendQQMsgResponse> {
    return this.post(`/v2/users/${openid}/messages`, {
      msg_type: 6,
      input_notify: { input_type: 1, input_second: inputSecond },
      ...passive,
    })
  }

  /**
   * 单聊流式消息（仅单聊）
   *
   * 首帧不带 stream_msg_id，响应的 id 作为后续帧的 stream_msg_id 回传；
   * 同一次流 index 从 0 递增、msg_seq 保持一致；建议帧间隔 300~500ms。
   * @param openid 用户 openid
   * @param body 流式消息帧
   */
  sendFriendStreamMsg (openid: string, body: SendQQStreamMessageRequest): Promise<SendQQStreamMessageResponse> {
    return this.post(`/v2/users/${openid}/stream_messages`, body)
  }

  /** 文字子频道消息 */
  sendChannelMsg (channelId: string, body: SendGuildMsg | FormData): Promise<SendGuildResponse> {
    const headers = body instanceof FormData ? body.getHeaders() : undefined
    return this.post(`/channels/${channelId}/messages`, body, headers)
  }

  /**
   * 频道私信消息
   * - 单参 (guildId, body)：guildId 已知
   * - 双参 (recipientId, srcGuildId, body)：先创建会话再发送
   */
  sendDmsMsg (guildId: string, body: SendGuildMsg | FormData): Promise<SendGuildResponse>
  sendDmsMsg (recipientId: string, srcGuildId: string, body: SendGuildMsg | FormData): Promise<SendGuildResponse>
  async sendDmsMsg (
    a: string,
    b: string | SendGuildMsg | FormData,
    c?: SendGuildMsg | FormData
  ): Promise<SendGuildResponse> {
    if (typeof b === 'string') {
      const dms = await this.post<{ guild_id: string }>('/users/@me/dms', {
        recipient_id: a,
        source_guild_id: b,
      })
      const headers = c instanceof FormData ? c.getHeaders() : undefined
      return this.post(`/dms/${dms.guild_id}/messages`, c, headers)
    }
    const headers = b instanceof FormData ? b.getHeaders() : undefined
    return this.post(`/dms/${a}/messages`, b, headers)
  }

  /**
   * 撤回消息
   * - 'user' / 'group' 对应 QQ 单聊 / 群聊
   * - 'channels' / 'dms' 对应频道 / 频道私信，支持 hidetip
   */
  recall (type: 'user' | 'group', peer: string, messageId: string): Promise<true>
  recall (type: 'channels' | 'dms', peer: string, messageId: string, hidetip?: boolean): Promise<true>
  async recall (
    type: Scene | 'channels' | 'dms',
    peer: string,
    messageId: string,
    hidetip = false
  ): Promise<true> {
    const path = type === 'user' || type === 'group'
      ? `/v2/${type}s/${peer}/messages/${messageId}`
      : `/${type}/${peer}/messages/${messageId}?hidetip=${hidetip}`
    await this.delete(path)
    return true
  }
}
