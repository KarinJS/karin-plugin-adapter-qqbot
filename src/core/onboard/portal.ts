import axios from 'node-karin/axios'
import { generateBindKey } from './crypto'

/** QQ 开放平台扫码绑定服务域名 */
const PORTAL_HOST = 'q.qq.com'
const CREATE_PATH = '/lite/create_bind_task'
const POLL_PATH = '/lite/poll_bind_result'
/** 扫码页面模板 */
const CONNECT_URL = 'https://q.qq.com/qqbot/openclaw/connect.html?task_id={task_id}&_wv=2&source=karin'

const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }

/** 绑定状态 */
export const BindStatus = {
  NONE: 0,
  PENDING: 1,
  COMPLETED: 2,
  EXPIRED: 3,
} as const
export type BindStatus = typeof BindStatus[keyof typeof BindStatus]

interface ApiEnvelope<T> {
  retcode: number
  msg: string
  data?: T
}

interface CreateTaskData { task_id: string }

interface PollData {
  status: number
  bot_appid: string
  bot_encrypt_secret: string
  user_openid: string
}

/**
 * 创建绑定任务
 * @returns task_id 与本地生成的 AES key
 */
export const createBindTask = async (): Promise<{ taskId: string; aesKey: string }> => {
  const key = generateBindKey()
  const { data } = await axios.post<ApiEnvelope<CreateTaskData>>(
    `https://${PORTAL_HOST}${CREATE_PATH}`,
    { key },
    { headers }
  )
  if (data.retcode !== 0) throw new Error(`create_bind_task: ${data.msg || 'unknown error'}`)
  const taskId = data.data?.task_id
  if (!taskId) throw new Error('create_bind_task: missing task_id')
  return { taskId, aesKey: key }
}

/**
 * 轮询绑定结果
 */
export const pollBindResult = async (taskId: string) => {
  const { data } = await axios.post<ApiEnvelope<PollData>>(
    `https://${PORTAL_HOST}${POLL_PATH}`,
    { task_id: taskId },
    { headers }
  )
  if (data.retcode !== 0) throw new Error(`poll_bind_result: ${data.msg || 'unknown error'}`)
  const d = data.data ?? ({} as Partial<PollData>)
  return {
    status: (d.status ?? BindStatus.NONE) as BindStatus,
    appId: String(d.bot_appid ?? ''),
    encryptedSecret: d.bot_encrypt_secret ?? '',
    userOpenid: d.user_openid ?? '',
  }
}

/**
 * 构造扫码 URL
 */
export const buildConnectUrl = (taskId: string): string =>
  CONNECT_URL.replace('{task_id}', encodeURIComponent(taskId))

/**
 * 通过 appId + secret 直接调一次 @me，拿到 bot 昵称
 * 用于扫码完成后的展示与写入配置
 */
export const fetchBotName = async (appId: string, secret: string): Promise<string> => {
  try {
    const tokenRes = await axios.post('https://bots.qq.com/app/getAppAccessToken', {
      appId, clientSecret: secret,
    })
    const accessToken = tokenRes.data?.access_token
    if (!accessToken) return ''
    const meRes = await axios.get('https://api.sgroup.qq.com/users/@me', {
      headers: { Authorization: `QQBot ${accessToken}` },
    })
    return meRes.data?.username || ''
  } catch {
    return ''
  }
}
