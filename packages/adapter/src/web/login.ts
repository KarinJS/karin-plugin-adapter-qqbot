import QRCode from 'qrcode'
import { router } from 'node-karin'
import type { Request, Response } from 'node-karin/express'
import { buildConnectUrl } from '@/core/qrcode'
import { cancelLogin, getLoginSnapshot, startLogin } from './login-session'

const success = (res: Response, data: unknown) => {
  res.json({ success: true, data })
}

const failure = (res: Response, status: number, message: string) => {
  res.status(status).json({ success: false, message })
}

const readTaskId = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 注册扫码授权接口。
 *
 * 浏览器只负责发起与轮询，QQ 开放平台的轮询在服务端进行；AppSecret 不会下发到前端。
 */
export const registerLoginRoutes = () => {
  router.post('/qqbot/login/start', async (_req, res) => {
    try {
      const session = await startLogin()
      const connectUrl = buildConnectUrl(session.taskId)
      const qrCode = await QRCode.toDataURL(connectUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 512,
        color: {
          dark: '#000000FF',
          light: '#FFFFFFFF',
        },
      })

      success(res, { ...session, connectUrl, qrCode })
    } catch (error) {
      failure(res, 500, error instanceof Error ? error.message : '创建扫码授权失败')
    }
  })

  router.get('/qqbot/login/status', (req: Request, res) => {
    const taskId = readTaskId(req.query.taskId)
    if (!taskId) {
      failure(res, 400, '缺少 taskId')
      return
    }

    const session = getLoginSnapshot(taskId)
    if (!session) {
      failure(res, 404, '授权会话不存在或已结束')
      return
    }

    success(res, session)
  })

  router.post('/qqbot/login/cancel', (req, res) => {
    const body = req.body as { taskId?: unknown } | undefined
    const taskId = readTaskId(body?.taskId)
    if (!taskId) {
      failure(res, 400, '缺少 taskId')
      return
    }

    if (!cancelLogin(taskId)) {
      failure(res, 404, '授权会话不存在或已结束')
      return
    }

    success(res, { taskId, status: 'cancelled' })
  })
}
