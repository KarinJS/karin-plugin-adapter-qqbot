import { Http } from './http'
import type {
  Panel, GetPanelListParams, GetPanelListResponse, CreatePanelRequest,
  CreatePanelResponse, GetPanelResponse, UpdatePanelResponse, UpdatePanelTargetRequest,
} from './types'

/**
 * 指令面板接口
 *
 * 指令面板以面板形式展示指令或链接，支持 c2c（单聊）、group（群聊）、
 * channel（文字子频道）、dm（频道私信）四种场景；其中 c2c / group 支持
 * 按指定用户或群生效（target_type=specific），channel / dm 仅支持全局配置。
 *
 * 一个机器人最多创建 20 个指令面板。
 *
 * {@link https://bot.q.qq.com/wiki/develop/api-v2/server-inter/menu-panel/}
 */
export class PanelsApi extends Http {
  /**
   * 查询指令面板列表
   *
   * 分页拉取指定场景下已生效的面板，按设置时间倒序排列。
   * @param params 查询参数，`scope` 必填
   * @returns 面板记录列表与分页游标
   */
  getPanelList (params: GetPanelListParams): Promise<GetPanelListResponse> {
    const query = new URLSearchParams({ scope: params.scope })
    if (params.cursor) query.set('cursor', params.cursor)
    if (params.limit !== undefined) query.set('limit', String(params.limit))
    return this.get(`/v2/panels?${query.toString()}`)
  }

  /**
   * 创建指令面板
   * @param body 面板场景、作用范围与配置内容
   * @returns 新创建的面板 ID
   */
  createPanel (body: CreatePanelRequest): Promise<CreatePanelResponse> {
    return this.post('/v2/panels', body)
  }

  /**
   * 查询指令面板详情
   *
   * 返回面板完整配置，target_type=specific 时同时返回关联的用户 / 群 openid 列表。
   * @param panelId 面板 ID
   */
  getPanel (panelId: string): Promise<GetPanelResponse> {
    return this.get(`/v2/panels/${panelId}`)
  }

  /**
   * 修改指令面板
   *
   * 传入后会覆盖原有的面板元素列表和备注，不影响已关联的用户 / 群列表。
   * @param panelId 面板 ID
   * @param panel 面板配置内容
   * @returns 本次修改后的面板版本号
   */
  updatePanel (panelId: string, panel: Panel): Promise<UpdatePanelResponse> {
    return this.put(`/v2/panels/${panelId}`, { panel })
  }

  /**
   * 删除指令面板
   *
   * 删除后该面板不再对任何用户或群生效。
   * @param panelId 面板 ID
   */
  deletePanel (panelId: string): Promise<{}> {
    return this.delete(`/v2/panels/${panelId}`)
  }

  /**
   * 修改指令面板关联对象
   *
   * c2c 场景操作 `user_openids`，group 场景操作 `group_openids`，一次最多 20 个；
   * channel / dm 场景为全局配置，不支持此操作。
   * @param panelId 面板 ID
   * @param body 操作类型与关联对象列表
   */
  updatePanelTarget (panelId: string, body: UpdatePanelTargetRequest): Promise<{}> {
    return this.put(`/v2/panels/${panelId}/target`, body)
  }
}
