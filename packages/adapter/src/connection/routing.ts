import { app } from 'node-karin'
import express from 'node-karin/express'
import { webhookRouting } from './webhook'

/**
 * 初始化路由
 * 创建 /qqbot/webhook 路由用于接收QQ机器人事件
 */
export const createRouting = () => {
  const router = express.Router()
  router.use('/webhook', webhookRouting)
  app.use('/qqbot', router)
}
