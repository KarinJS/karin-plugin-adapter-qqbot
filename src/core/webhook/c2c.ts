import { webhook } from '.'
import { app } from 'node-karin'
import { expressAfterInit } from '@/utils/common'

/** 创建端到端webhook路由 */
export const createC2CWebhook = () => {
  const c2cRouting = '/webhook/c2c'

  /**
 * api 端到端
 * tx -> bot/webhook
 */
  app.post(c2cRouting, (req, res) => webhook(req, res, () => true))

  /** 调整中间件顺序 不使用json中间件 */
  expressAfterInit(app._router.stack, c2cRouting, 'post')
}
