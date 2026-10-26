import { registerConfigRoutes } from './config'
import { registerLoginRoutes } from './login'
import { registerStaticRoutes } from './static'

/**
 * 注册 QQBot 配置页面的静态资源、配置接口与扫码授权接口。
 */
export const registerWebRoutes = () => {
  registerStaticRoutes()
  registerConfigRoutes()
  registerLoginRoutes()
}
