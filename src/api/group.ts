import { GuildApi } from './guild'
import { SendMessageOptions } from '@/types'

/**
 * 群聊API
 */
export class GroupApi extends GuildApi {
  /**
   * 发送群消息
   * @param groupId 群ID
   * @param options 发送消息参数
   */
  async sendGroupMessage (groupId: string, options: SendMessageOptions) {
    const url = `/v2/groups/${groupId}/messages`
    const data = await this.post(url, { json: options })
    return data
  }

  /**
   * 发送c2c单聊消息
   * @param post post请求函数
   * @param userId 用户ID
   * @param options 发送消息参数
   */
  async sendPrivateMessage (userId: string, options: SendMessageOptions) {
    const url = `/v2/users/${userId}/messages`
    const data = await this.post(url, { json: options })
    return data
  }
}
