import { webhook } from '.'
import { app, } from 'node-karin'
import { Request, } from 'express'
import { config } from '@/utils/config'
import { expressAfterInit, fakeEvent } from '@/utils/common'

/** 创建http中转webhook路由 */
export const createHttpWebhook = () => {
  const httpRouting = '/webhook/http'

  /**
 * api 中转
 * tx -> webhook ->bot/http
 */
  app.post(httpRouting, (req, res) => webhook(req, res, (req: Request, appid: string) => {
    const auth = req.headers['authorization']
    if (!auth) {
      fakeEvent(`${appid} 未在头部中找到 Authorization: ${req.socket.remoteAddress}`)
      return false
    }

    const cfg = config()[appid]

    if (!cfg) {
      fakeEvent(`[配置错误][${appid}] 配置文件中未找到对应的appid，请检查配置文件`)
      return false
    }

    if (cfg.event.type !== 2) {
      fakeEvent(`${appid} http中转服务未启用，请检查配置文件: ${req.socket.remoteAddress}`)
      return false
    }

    if (auth !== cfg.event.httpToken) {
      fakeEvent(`${appid} Authorization 验证失败: ${req.socket.remoteAddress}`)
      return false
    }

    return true
  }))

  /** 调整中间件顺序 不使用json中间件 */
  expressAfterInit(app._router.stack, httpRouting, 'post')
}
