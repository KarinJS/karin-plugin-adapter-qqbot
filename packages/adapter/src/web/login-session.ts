import { BindStatus, checkBindResult, createBindTask, decryptSecret } from '@/core/qrcode'
import { getDefaultConfig, readConfigFile, writeConfig } from '@/utils/config'

export type WebLoginStatus = 'pending' | 'completed' | 'expired' | 'cancelled' | 'failed'

export interface WebLoginSnapshot {
  taskId: string
  status: WebLoginStatus
  createdAt: number
  expiresAt: number
  appId?: string
  /** 完成时表示更新了已有机器人，而不是新增。 */
  updated?: boolean
  message?: string
}

interface WebLoginSession extends WebLoginSnapshot {
  /** 解密 AppSecret 的 AES 密钥，完成后立即清空。 */
  key: string
  polling: boolean
  timer?: NodeJS.Timeout
  failures: number
}

/** 二维码最多保留 5 分钟，超时后即使 QQ 侧仍可轮询也不再继续。 */
const SESSION_TTL = 5 * 60 * 1000
const POLL_INTERVAL = 2000
const MAX_FAILURES = 8

let current: WebLoginSession | null = null

const snapshot = (session: WebLoginSession): WebLoginSnapshot => ({
  taskId: session.taskId,
  status: session.status,
  createdAt: session.createdAt,
  expiresAt: session.expiresAt,
  appId: session.appId,
  updated: session.updated,
  message: session.message,
})

const stopTimer = (session: WebLoginSession) => {
  if (!session.timer) return
  clearInterval(session.timer)
  session.timer = undefined
}

const finish = (session: WebLoginSession, status: WebLoginStatus, message?: string) => {
  session.status = status
  session.message = message
  session.key = ''
  stopTimer(session)
}

/**
 * 把扫码得到的 AppSecret 写回配置文件。
 *
 * 已存在的 appId 只替换 secret，保留用户的其他配置；新 appId 使用默认模板。
 */
const persistBot = (appId: string, secret: string): boolean => {
  const list = readConfigFile()
  const index = list.findIndex((item) => item.appId === appId)

  if (index >= 0) {
    list[index] = { ...list[index], secret }
  } else {
    list.push({ ...getDefaultConfig()[0], appId, secret })
  }

  writeConfig(list)
  return index >= 0
}

const poll = async (session: WebLoginSession) => {
  if (session.status !== 'pending' || session.polling) return

  if (Date.now() >= session.expiresAt) {
    finish(session, 'expired', '二维码已过期，请重新生成')
    return
  }

  session.polling = true
  try {
    const result = await checkBindResult(session.taskId)

    if (result.status === BindStatus.COMPLETED) {
      const secret = decryptSecret(result.encryptedSecret, session.key)
      const updated = persistBot(result.appId, secret)
      session.appId = result.appId
      session.updated = updated
      finish(session, 'completed', updated ? '已更新现有机器人的 AppSecret' : '已添加新的机器人')
      return
    }

    if (result.status === BindStatus.EXPIRED) {
      finish(session, 'expired', '二维码已过期，请重新生成')
      return
    }

    session.failures = 0
  } catch (error) {
    session.failures += 1
    if (session.failures >= MAX_FAILURES) {
      finish(session, 'failed', error instanceof Error ? error.message : '查询授权状态失败')
    }
  } finally {
    session.polling = false
  }
}

const cancelCurrent = (message: string) => {
  if (!current) return
  if (current.status === 'pending') finish(current, 'cancelled', message)
  stopTimer(current)
  current = null
}

/**
 * 创建一次扫码授权会话。
 *
 * 同一时间只保留一个进行中的会话，重新生成二维码会取消上一次会话。
 */
export const startLogin = async (): Promise<WebLoginSnapshot> => {
  cancelCurrent('已取消上一次授权')

  const { taskId, aesKey } = await createBindTask()
  const now = Date.now()
  const session: WebLoginSession = {
    taskId,
    key: aesKey,
    status: 'pending',
    createdAt: now,
    expiresAt: now + SESSION_TTL,
    polling: false,
    failures: 0,
  }

  session.timer = setInterval(() => {
    void poll(session)
  }, POLL_INTERVAL)
  session.timer.unref?.()

  current = session
  void poll(session)
  return snapshot(session)
}

/**
 * 查询扫码授权进度。
 */
export const getLoginSnapshot = (taskId: string): WebLoginSnapshot | null => {
  if (!current || current.taskId !== taskId) return null
  return snapshot(current)
}

/**
 * 取消扫码授权。无论会话处于哪个阶段，都会从内存中移除。
 */
export const cancelLogin = (taskId: string): boolean => {
  if (!current || current.taskId !== taskId) return false
  if (current.status === 'pending') finish(current, 'cancelled', '已取消扫码授权')
  stopTimer(current)
  current = null
  return true
}
