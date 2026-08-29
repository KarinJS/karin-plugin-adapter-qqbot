import { Http } from './http'
import type {
  GuildInfo, GetGuildListParams, ChannelInfo,
  CreateChannelRequest, UpdateChannelRequest,
} from './types'

/**
 * 频道 / 子频道接口
 *
 * 子频道的创建、修改、删除均需要管理员权限且属于私域接口，
 * 操作成功后会触发 `CHANNEL_CREATE` / `CHANNEL_UPDATE` / `CHANNEL_DELETE` 事件。
 */
export class GuildsApi extends Http {
  /**
   * 获取机器人加入的频道列表
   *
   * 官方文档响应体标注为 `{ guilds: [] }`，但示例与实际返回均为裸数组；
   * 这里对两种形态都做兼容。
   *
   * @param params 分页参数，`limit` 默认 100、最大 100
   */
  async getGuildList (params: GetGuildListParams = {}): Promise<GuildInfo[]> {
    const query = new URLSearchParams()
    if (params.before) query.set('before', params.before)
    if (params.after) query.set('after', params.after)
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    const search = query.toString()
    const data = await this.get<GuildInfo[] | { guilds?: GuildInfo[] }>(
      `/users/@me/guilds${search ? `?${search}` : ''}`
    )
    if (Array.isArray(data)) return data
    return data?.guilds ?? []
  }

  /**
   * 获取频道详情
   * @param guildId 频道 ID
   */
  getGuild (guildId: string): Promise<GuildInfo> {
    return this.get(`/guilds/${guildId}`)
  }

  /**
   * 获取子频道列表
   *
   * 官方文档响应体标注为 `{ channels: [] }`，但示例与实际返回均为裸数组；
   * 这里对两种形态都做兼容。
   *
   * @param guildId 频道 ID
   */
  async getChannelList (guildId: string): Promise<ChannelInfo[]> {
    const data = await this.get<ChannelInfo[] | { channels?: ChannelInfo[] }>(
      `/guilds/${guildId}/channels`
    )
    if (Array.isArray(data)) return data
    return data?.channels ?? []
  }

  /**
   * 创建子频道（需要管理员权限，私域接口）
   * @param guildId 频道 ID
   * @param body 子频道配置
   */
  createChannel (guildId: string, body: CreateChannelRequest): Promise<ChannelInfo> {
    return this.post(`/guilds/${guildId}/channels`, body)
  }

  /**
   * 获取子频道详情
   * @param channelId 子频道 ID
   */
  getChannel (channelId: string): Promise<ChannelInfo> {
    return this.get(`/channels/${channelId}`)
  }

  /**
   * 修改子频道（需要管理员权限，私域接口）
   *
   * 只需传入要修改的字段。
   * @param channelId 子频道 ID
   * @param body 待修改的字段
   */
  updateChannel (channelId: string, body: UpdateChannelRequest): Promise<ChannelInfo> {
    return this.patch(`/channels/${channelId}`, body)
  }

  /**
   * 删除子频道（需要管理员权限，私域接口）
   *
   * 子频道删除后无法恢复。
   * @param channelId 子频道 ID
   */
  deleteChannel (channelId: string): Promise<{}> {
    return this.delete(`/channels/${channelId}`)
  }
}
