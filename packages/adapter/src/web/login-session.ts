import { BindStatus, checkBindResult, createBindTask, decryptSecret } from '@/core/qrcode'
import { QQBotApi } from '@/core/api'
import { createAxiosInstance, getAccessToken } from '@/core/internal/axios'
import { getDefaultConfig, readConfigFile, writeConfig } from '@/utils/config'
import { log } from '@/utils/logger'

export type WebLoginStatus = 'pending' | 'completed' | 'expired' | 'cancelled' | 'failed'

export interface WebLoginSnapshot {
  taskId: string
  status: WebLoginStatus
  createdAt: number
  expiresAt: number
  appId?: string
  name?: string
  avatar?: string
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
/**
 * 连续失败多少次才放弃。
 *
 * QQ 的轮询接口偶尔会超时或返回业务错误，扫码过程本身可能持续几十秒；
 * 16 秒就判定失败太激进，这里放宽到约一分钟，且任意一次成功都会清零。
 */
const MAX_FAILURES = 30

let current: WebLoginSession | null = null

const snapshot = (session: WebLoginSession): WebLoginSnapshot => ({
  taskId: session.taskId,
  status: session.status,
  createdAt: session.createdAt,
  expiresAt: session.expiresAt,
  appId: session.appId,
  name: session.name,
  avatar: session.avatar,
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

const PROFILE_TIMEOUT = 1500

/**
 * 授权完成后立刻拉一次机器人资料。
 *
 * 新建的机器人要等适配器重连后才有 `account`，这里直接用刚写入的凭据请求
 * `/users/@me`，让前端在成功页就能显示头像和昵称。
 */
const fetchBotProfile = async (appId: string, secret: string) => {
  const request = (async () => {
    await getAccessToken(appId, secret)
    const api = new QQBotApi(createAxiosInstance(appId))
    const me = await api.meta.getMe()
    return { name: me.username, avatar: me.avatar }
  })().catch(() => null)

  /** 资料只用于成功页展示，超时就不要拖住授权完成。 */
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), PROFILE_TIMEOUT).unref?.()
  })

  return Promise.race([request, timeout])
}

const poll = async (session: WebLoginSession) => {
  if (session.status !== 'pending' || session.polling) return

  if (Date.now() >= session.expiresAt) {
    log('warn', `[扫码授权] 会话 ${session.taskId} 已过期`)
    finish(session, 'expired', '二维码已过期，请重新生成')
    return
  }

  session.polling = true
  try {
    const result = await checkBindResult(session.taskId)

    if (result.status === BindStatus.COMPLETED) {
      const secret = decryptSecret(result.encryptedSecret, session.key)
      const updated = persistBot(result.appId, secret)
      const profile = await fetchBotProfile(result.appId, secret)
      session.appId = result.appId
      session.name = profile?.name
      session.avatar = profile?.avatar
      session.updated = updated
      log('info', `[扫码授权] ${updated ? '更新' : '新增'}机器人 ${result.appId}`)
      finish(session, 'completed', updated ? '已更新现有机器人的 AppSecret' : '已添加新的机器人')
      return
    }

    if (result.status === BindStatus.EXPIRED) {
      log('warn', `[扫码授权] 会话 ${session.taskId} 已过期`)
      finish(session, 'expired', '二维码已过期，请重新生成')
      return
    }

    session.failures = 0
  } catch (error) {
    session.failures += 1
    if (session.failures === 1) {
      log('warn', `[扫码授权] 查询授权状态失败: ${error instanceof Error ? error.message : String(error)}`)
    }
    if (session.failures >= MAX_FAILURES) {
      log('error', `[扫码授权] 连续 ${session.failures} 次查询失败，结束本次会话`)
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
  log('info', `[扫码授权] 已创建任务 ${taskId}`)
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
