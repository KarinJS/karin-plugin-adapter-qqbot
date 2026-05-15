import { Http } from './http'
import type { GetMeResponse, DmsResponse } from './types'

/**
 * 元信息接口：@me / dms / gateway
 */
export class MetaApi extends Http {
  /** 当前机器人详情 */
  getMe (): Promise<GetMeResponse> {
    return this.get('/users/@me')
  }

  /** 创建频道私信会话 */
  createDms (recipientId: string, srcGuildId: string): Promise<DmsResponse> {
    return this.post('/users/@me/dms', { recipient_id: recipientId, source_guild_id: srcGuildId })
  }

  /** 获取通用 WSS 地址 */
  getGateway (): Promise<{ url: string }> {
    return this.get('/gateway')
  }
}
