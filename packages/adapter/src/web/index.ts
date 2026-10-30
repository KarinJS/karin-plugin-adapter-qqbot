import { registerConfigRoutes } from './config'
import { registerLoginRoutes } from './login'
import { registerMenuPanelRoutes } from './menu-panel'
import { registerStaticRoutes } from './static'

/**
 * 注册 QQBot 配置页面的静态资源、配置接口、扫码授权接口与菜单面板接口。
 */
export const registerWebRoutes = () => {
  registerStaticRoutes()
  registerConfigRoutes()
  registerLoginRoutes()
  registerMenuPanelRoutes()
}
