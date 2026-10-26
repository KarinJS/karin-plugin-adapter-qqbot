import QRCode from 'qrcode'
import {
  createBadRequestResponse,
  createNotFoundResponse,
  createServerErrorResponse,
  createSuccessResponse,
  router,
} from 'node-karin'
import type { Request, Response } from 'node-karin/express'
import { buildConnectUrl } from '@/core/qrcode'
import { cancelLogin, getLoginSnapshot, startLogin } from './login-session'

/**
 * 扫码状态每次请求都必须拿到最新值。
 *
 * 反向代理或浏览器一旦缓存了 pending 响应，前端会永远停在“等待扫码确认”，
 * 所以这几个接口都显式禁用缓存。
 */
const noStore = (res: Response) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
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
    noStore(res)
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

      createSuccessResponse(res, { ...session, connectUrl, qrCode })
    } catch (error) {
      createServerErrorResponse(res, error instanceof Error ? error.message : '创建扫码授权失败')
    }
  })

  router.get('/qqbot/login/status', (req: Request, res) => {
    noStore(res)
    const taskId = readTaskId(req.query.taskId)
    if (!taskId) {
      createBadRequestResponse(res, '缺少 taskId')
      return
    }

    const session = getLoginSnapshot(taskId)
    if (!session) {
      createNotFoundResponse(res, '授权会话不存在或已结束')
      return
    }

    createSuccessResponse(res, session)
  })

  router.post('/qqbot/login/cancel', (req, res) => {
    noStore(res)
    const body = req.body as { taskId?: unknown } | undefined
    const taskId = readTaskId(body?.taskId)
    if (!taskId) {
      createBadRequestResponse(res, '缺少 taskId')
      return
    }

    if (!cancelLogin(taskId)) {
      createNotFoundResponse(res, '授权会话不存在或已结束')
      return
    }

    createSuccessResponse(res, { taskId, status: 'cancelled' })
  })
}
