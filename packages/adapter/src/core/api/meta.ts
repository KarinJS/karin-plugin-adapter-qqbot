import { Http } from './http'
import type { GetMeResponse, DmsResponse, GenerateUrlLinkRequest, GenerateUrlLinkResponse } from './types'

/**
 * 元信息接口：@me / dms / gateway / 分享链接
 */
export class MetaApi extends Http {
  /** 当前机器人详情 */
  getMe(): Promise<GetMeResponse> {
    return this.get('/users/@me')
  }

  /** 创建频道私信会话 */
  createDms(recipientId: string, srcGuildId: string): Promise<DmsResponse> {
    return this.post('/users/@me/dms', { recipient_id: recipientId, source_guild_id: srcGuildId })
  }

  /** 获取通用 WSS 地址 */
  getGateway(): Promise<{ url: string }> {
    return this.get('/gateway')
  }

  /**
   * 生成机器人分享链接
   *
   * 用于邀请用户添加机器人为好友；`callback_data`（最长 32 字符）会在用户通过该
   * 链接添加机器人时透传到 `FRIEND_ADD` 事件的 `scene_param`。
   *
   * @param body 分享链接参数，均为可选
   */
  async generateUrlLink(body: GenerateUrlLinkRequest = {}): Promise<GenerateUrlLinkResponse> {
    const response = await this.post<GenerateUrlLinkResponse | { url_link?: string }>('/v2/generate_url_link', body)

    /** 兼容旧版接口返回；新文档的正式结构是 `{ data: { url } }`。 */
    if (!('data' in response) && response.url_link) {
      return { data: { url: response.url_link } }
    }

    return response as GenerateUrlLinkResponse
  }
}
