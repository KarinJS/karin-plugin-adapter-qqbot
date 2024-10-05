import { PostType } from './core'
import { SendChannelMessageOptions } from '@/types'

/**
 * 频道API
 */
export class GuildApi {
  post: PostType
  constructor (post: PostType) {
    this.post = post
  }

  /**
   * 发送频道私信消息
   * @param post post请求函数
   * @param guildId 服务器ID
   * @param options 发送消息参数
   */
  async sendGuildDirectMessage (guildId: string, options: SendChannelMessageOptions) {
    const url = `/dms/${guildId.replace('qg_', '')}/messages`
    const data = await this.post(url, { json: options })
    return data
  }

  /**
   * 发送文字子频道消息
   * @param post post请求函数
   * @param channelId 频道ID
   * @param options 发送消息参数
   */
  async sendGuildTextMessage (channelId: string, options: SendChannelMessageOptions) {
    const url = `/channels/${channelId}/messages`
    const data = await this.post(url, options instanceof FormData ? { body: options } : { json: options })
    return data
  }
}
