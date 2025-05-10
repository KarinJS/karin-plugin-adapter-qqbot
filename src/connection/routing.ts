import { app } from 'node-karin'
import express from 'node-karin/express'
import { webhookRouting } from './webhook'

/**
 * 初始化路由
 */
export const createRouting = () => {
  /** 基本路由 */
  const BASE_ROUTES = '/qqbot'
  /**
   * webhook 路由
   * - tx -> bot/webhook
   */
  const WEBHOOK_ROUTES = '/webhook'

  /** 创建路由 */
  const router = express.Router()
  router.use(WEBHOOK_ROUTES, webhookRouting)
  app.use(BASE_ROUTES, router)
}
