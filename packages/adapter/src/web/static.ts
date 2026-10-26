import fs from 'node:fs'
import path from 'node:path'
import { app } from 'node-karin'
import express from 'node-karin/express'
import { dirPath } from '@/root'

const webDistPath = path.join(dirPath, 'dist', 'web')
const webIndexPath = path.join(webDistPath, 'index.html')

const sendIndex = (res: express.Response) => {
  if (!fs.existsSync(webIndexPath)) {
    res.status(503).type('text/plain').send('QQBot 配置页面尚未构建。请先在仓库根目录运行 pnpm build。')
    return
  }

  res.setHeader('Cache-Control', 'no-cache')
  res.sendFile(webIndexPath)
}

const webStatic = express.static(webDistPath, {
  index: 'index.html',
  redirect: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache')
      return
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  },
})

/**
 * 在插件自己的路径下提供构建好的 SPA。
 *
 * 挂载点必须与 Vite 的 `base` 保持一致，否则前端路由和静态资源都会 404。
 * `/qqbot/webhook` 不会被 `/qqbot/web` 前缀匹配，Webhook 路由不受影响。
 */
export const registerStaticRoutes = () => {
  const staticRouter = express.Router()
  staticRouter.use(webStatic)
  staticRouter.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }

    /** 带扩展名的请求视为静态资源，缺失时保持 404，不要回退成 index.html。 */
    if (path.extname(req.path)) {
      next()
      return
    }

    sendIndex(res)
  })

  app.use('/qqbot/web', staticRouter)
}
