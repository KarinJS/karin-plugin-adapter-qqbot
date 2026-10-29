/** 自定义菜单按钮类型 */
export type MenuItemType = 'switch' | 'send_message' | 'link' | 'menu'

/** 自定义菜单开关配置 */
export interface MenuSwitch {
  switch_id?: string
  default?: boolean
}

/** 自定义菜单二级菜单项 */
export interface SubMenuItem {
  name?: string
  type?: Extract<MenuItemType, 'send_message' | 'link'>
  send_message?: string
  link?: string
}

/** 自定义菜单一级菜单项 */
export interface MenuItem {
  name?: string
  type?: MenuItemType
  sub_menu_items?: SubMenuItem[]
  send_message?: string
  link?: string
  switch?: MenuSwitch
}

export interface Menu {
  items?: MenuItem[]
}

export interface GetMenuResponse {
  version: number
  menu?: Menu
}

export interface UpdateMenuResponse {
  version: number
}

/** 指令面板生效场景 */
export type PanelScope = 'c2c' | 'group' | 'channel' | 'dm'

/** 本页面支持编辑的场景，频道 / 私信暂不做预览。 */
export type PanelScene = Extract<PanelScope, 'c2c' | 'group'>

export type PanelTargetType = 'all' | 'specific'
export type PanelItemType = 'command' | 'link'

export interface PanelItem {
  name?: string
  desc?: string
  type?: PanelItemType
  only_admin?: boolean
  link?: string
}

export interface Panel {
  items?: PanelItem[]
  remark?: string
  version?: number
}

export interface PanelRecord {
  panel_id: string
  scope: PanelScope
  target_type: PanelTargetType
  panel: Panel
  created_at?: string
  updated_at?: string
  version: number
}

export interface GetPanelListResponse {
  records: PanelRecord[]
  next_cursor: string
  is_end: boolean
}

export interface CreatePanelRequest {
  scope: PanelScope
  target_type?: PanelTargetType
  user_openids?: string[]
  group_openids?: string[]
  panel: Panel
}

export interface CreatePanelResponse {
  panel_id: string
}

export interface GetPanelResponse extends PanelRecord {
  user_openids?: string[]
  group_openids?: string[]
}

export interface UpdatePanelResponse {
  version: number
}

export interface UpdatePanelTargetRequest {
  op: 'add' | 'del'
  user_openids?: string[]
  group_openids?: string[]
}
