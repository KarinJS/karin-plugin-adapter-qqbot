import axios from 'node-karin/axios'
import crypto from 'node:crypto'

export enum BindStatus {
  NONE = 0,
  PENDING = 1,
  COMPLETED = 2,
  EXPIRED = 3
}
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

const BASEURL = 'q.qq.com'
const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
/** 生成随机密钥 */
export const RandomKey = (): string => {
  return crypto.randomBytes(32).toString('base64')
}

/**
 * 解密密钥
 * @param encryptedBase64
 * @param keyBase64
 * @returns
 */
export const decryptSecret = (encryptedBase64: string, keyBase64: string): string => {
  const key = Buffer.from(keyBase64, 'base64')
  const data = Buffer.from(encryptedBase64, 'base64')
  const IV = data.subarray(0, 12)
  const authtag = data.subarray(data.length - 16)
  const ciphertext = data.subarray(12, data.length - 16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, IV)
  decipher.setAuthTag(authtag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/**
 * 创建绑定任务
 * @param timeout 超时时间
 */
export const createBindTask = async (timeout: number = 10000) => {
  const url = `https://${BASEURL}/lite/create_bind_task`
  const key = RandomKey()
  const { data } = await axios.post<ApiEnvelope<CreateTaskData>>(url, { key }, { headers, timeout })
  if (data.retcode !== 0) throw new Error(data.msg ?? '创建绑定任务失败')
  if (!data.data?.task_id) throw new Error('创建绑定任务失败: task_id 缺失')
  return { taskId: data.data.task_id, aesKey: key }
}

/**
 * 查询绑定结果
 * @param taskId 任务id
 * @param timeout 超时时间
 */
export const checkBindResult = async (taskId: string, timeout: number = 10000) => {
  const url = `https://${BASEURL}/lite/poll_bind_result`
  const { data } = await axios.post<ApiEnvelope<PollData>>(url, { task_id: taskId }, { headers, timeout })
  if (data.retcode !== 0) throw new Error(data.msg ?? '查询绑定结果失败')
  return {
    status: data.data?.status ?? BindStatus.NONE,
    appId: String(data.data?.bot_appid ?? ''),
    encryptedSecret: data.data?.bot_encrypt_secret ?? '',
    userOpenid: data.data?.user_openid ?? undefined,
  }
}

/** 构建连接URL */
export const buildConnectUrl = (taskId: string) => `https://${BASEURL}/qqbot/openclaw/connect.html?task_id=${encodeURIComponent(taskId)}&source=karin&_wv=2`
