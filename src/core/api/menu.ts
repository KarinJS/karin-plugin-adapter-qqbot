import { Http } from './http'
import type { Menu, GetMenuResponse, UpdateMenuResponse } from './types'

/**
 * 全局自定义菜单接口
 *
 * 自定义菜单展示在机器人单聊窗口底部，仅支持 C2C（单聊）场景，
 * 设置后对所有用户生效，不支持按用户维度区分。
 *
 * {@link https://bot.q.qq.com/wiki/develop/api-v2/server-inter/menu-panel/}
 */
export class MenuApi extends Http {
  /**
   * 查询全局自定义菜单
   *
   * 未设置过菜单时响应的 `menu` 字段为空。
   * @returns 当前生效的菜单配置与版本号
   */
  getMenu (): Promise<GetMenuResponse> {
    return this.get('/v2/menu')
  }

  /**
   * 修改全局自定义菜单
   *
   * 传入后会覆盖原有的完整菜单配置；不传 `menu` 表示清空菜单。
   * @param menu 菜单配置，最多 10 个一级菜单项
   * @returns 本次修改后的菜单版本号
   */
  updateMenu (menu?: Menu): Promise<UpdateMenuResponse> {
    return this.put('/v2/menu', menu ? { menu } : {})
  }
}
