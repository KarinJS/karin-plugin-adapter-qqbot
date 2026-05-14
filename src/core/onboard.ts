import crypto from 'node:crypto'
import qrcode from 'qrcode'
import axios from 'node-karin/axios'
import { logger } from 'node-karin'
import { config, getDefaultConfig, writeConfig } from '@/utils/config'
import type { Config, QQBotConfig } from '@/types/config'

/** QQ 开放平台扫码绑定相关 API 域名 */
const PORTAL_HOST = 'q.qq.com'
/** 创建绑定任务接口 */
const ONBOARD_CREATE_PATH = '/lite/create_bind_task'
/** 轮询绑定结果接口 */
const ONBOARD_POLL_PATH = '/lite/poll_bind_result'
/** 扫码页面 URL 模板 */
const QR_URL_TEMPLATE = 'https://q.qq.com/qqbot/openclaw/connect.html?task_id={task_id}&_wv=2&source=karin'

/** 轮询间隔（毫秒） */
const POLL_INTERVAL_MS = 2000
/** 默认超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 600_000
/** 二维码过期后最大刷新次数 */
const MAX_REFRESHES = 3

/** 绑定状态 */
enum BindStatus {
  NONE = 0,
  PENDING = 1,
  COMPLETED = 2,
  EXPIRED = 3,
}

/** 创建绑定任务响应 */
interface CreateBindTaskResponse {
  retcode: number
  msg: string
  data?: {
    task_id: string
  }
}

/** 轮询绑定结果数据结构 */
interface PollBindResultData {
  status: number
  bot_appid: string
  bot_encrypt_secret: string
  user_openid: string
}

/** 轮询绑定结果响应 */
interface PollBindResultResponse {
  retcode: number
  msg: string
  data?: PollBindResultData
}

/** 扫码注册结果 */
interface QrRegisterResult {
  appId: string
  secret: string
  userOpenid: string
}

/**
 * 生成 256-bit 随机 AES 密钥并返回 base64 编码
 */
const generateBindKey = (): string => {
  return crypto.randomBytes(32).toString('base64')
}

/**
 * 使用 AES-256-GCM 解密 base64 编码的密文
 *
 * 密文布局: IV (12 bytes) || ciphertext (N bytes) || AuthTag (16 bytes)
 *
 * @param encryptedBase64 - `bot_encrypt_secret` 字段值
 * @param keyBase64 - 本地生成的 AES 密钥
 * @returns 解密后的 client_secret
 */
const decryptSecret = (encryptedBase64: string, keyBase64: string): string => {
  const key = Buffer.from(keyBase64, 'base64')
  const raw = Buffer.from(encryptedBase64, 'base64')

  if (key.length !== 32) {
    throw new Error(`AES key length must be 32 bytes, got ${key.length}`)
  }

  const iv = raw.subarray(0, 12)
  const ciphertext = raw.subarray(12, raw.length - 16)
  const authTag = raw.subarray(raw.length - 16)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(ciphertext, undefined, 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}

/**
 * 获取标准请求头
 */
const getApiHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
})

/**
 * 创建绑定任务
 * @returns task_id 和 aes_key
 */
const createBindTask = async (): Promise<{ taskId: string; aesKey: string }> => {
  const url = `https://${PORTAL_HOST}${ONBOARD_CREATE_PATH}`
  const key = generateBindKey()

  const { data } = await axios.post<CreateBindTaskResponse>(url, { key }, { headers: getApiHeaders() })

  if (data.retcode !== 0) {
    throw new Error(`create_bind_task failed: ${data.msg || 'unknown error'}`)
  }

  const taskId = data.data?.task_id
  if (!taskId) {
    throw new Error('create_bind_task: missing task_id in response')
  }

  return { taskId, aesKey: key }
}

/**
 * 轮询绑定结果
 * @param taskId 任务 ID
 * @returns 绑定状态及相关信息
 */
const pollBindResult = async (taskId: string): Promise<{
  status: BindStatus
  appId: string
  encryptedSecret: string
  userOpenid: string
}> => {
  const url = `https://${PORTAL_HOST}${ONBOARD_POLL_PATH}`

  const { data } = await axios.post<PollBindResultResponse>(url, { task_id: taskId }, { headers: getApiHeaders() })

  if (data.retcode !== 0) {
    throw new Error(`poll_bind_result failed: ${data.msg || 'unknown error'}`)
  }

  const d: Partial<PollBindResultData> = data.data || {}
  return {
    status: (d.status ?? BindStatus.NONE) as BindStatus,
    appId: String(d.bot_appid ?? ''),
    encryptedSecret: d.bot_encrypt_secret ?? '',
    userOpenid: d.user_openid ?? '',
  }
}

/**
 * 构建扫码 URL
 * @param taskId 任务 ID
 */
const buildConnectUrl = (taskId: string): string => {
  return QR_URL_TEMPLATE.replace('{task_id}', encodeURIComponent(taskId))
}

/**
 * 在终端渲染二维码
 * @param url 二维码内容
 * @returns 是否成功渲染
 */
const renderQr = async (url: string): Promise<boolean> => {
  try {
    const qrString = await qrcode.toString(url, { type: 'terminal', small: true })
    console.log(qrString)
    return true
  } catch {
    return false
  }
}

/**
 * 扫码注册 QQBot
 *
 * 完整流程：
 * 1. 创建绑定任务，获取 task_id 和 AES 密钥
 * 2. 在控制台输出二维码
 * 3. 轮询等待用户扫码授权并选择机器人
 * 4. 解密获取 client_secret
 * 5. 将配置写入 config.json
 *
 * @param timeoutSeconds 超时时间（秒），默认 600 秒
 * @returns 注册结果，失败返回 null
 */
export const qrRegister = async (timeoutSeconds = 600): Promise<QrRegisterResult | null> => {
  const deadline = Date.now() + timeoutSeconds * 1000

  for (let refreshCount = 0; refreshCount <= MAX_REFRESHES; refreshCount++) {
    // 1. 创建绑定任务
    let taskId: string
    let aesKey: string
    try {
      const result = await createBindTask()
      taskId = result.taskId
      aesKey = result.aesKey
    } catch (error) {
      logger.error('[QQ Official Bot][扫码登录] 创建绑定任务失败:', error)
      return null
    }

    const url = buildConnectUrl(taskId)

    // 2. 输出二维码
    console.log()
    const rendered = await renderQr(url)
    if (rendered) {
      console.log(`  请使用 QQ 扫描上方二维码，或直接访问以下链接：`)
    } else {
      console.log(`  请在手机 QQ 中打开以下链接：`)
      console.log('  提示: 安装 qrcode 包可在终端显示可扫描的二维码')
    }
    console.log(`  ${url}`)
    console.log()

    // 3. 轮询等待扫码
    while (Date.now() < deadline) {
      let pollResult: Awaited<ReturnType<typeof pollBindResult>>
      try {
        pollResult = await pollBindResult(taskId)
      } catch {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
        continue
      }

      if (pollResult.status === BindStatus.COMPLETED) {
        if (!pollResult.encryptedSecret) {
          logger.error('[QQ Official Bot][扫码登录] 绑定结果缺少加密密钥')
          return null
        }

        let secret: string
        try {
          secret = decryptSecret(pollResult.encryptedSecret, aesKey)
        } catch (error) {
          logger.error('[QQ Official Bot][扫码登录] 解密 secret 失败:', error)
          return null
        }

        console.log()
        console.log(`  扫码授权成功！App ID: ${pollResult.appId}`)
        if (pollResult.userOpenid) {
          console.log(`  扫码用户 OpenID: ${pollResult.userOpenid}`)
        }

        return {
          appId: pollResult.appId,
          secret,
          userOpenid: pollResult.userOpenid,
        }
      }

      if (pollResult.status === BindStatus.EXPIRED) {
        if (refreshCount >= MAX_REFRESHES) {
          logger.error(`[QQ Official Bot][扫码登录] 二维码已过期 ${MAX_REFRESHES} 次，终止流程`)
          return null
        }
        console.log(`\n  二维码已过期，正在刷新... (${refreshCount + 1}/${MAX_REFRESHES})`)
        break // 跳出轮询循环，进入下一次 for 循环创建新任务
      }

      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    }

    // 超时检查
    if (Date.now() >= deadline) {
      logger.error(`[QQ Official Bot][扫码登录] 等待扫码超时（${timeoutSeconds}秒）`)
      return null
    }
  }

  return null
}

/**
 * 通过 appId 和 secret 获取 bot 基本信息
 * @param appId 机器人 ID
 * @param secret 机器人密钥
 * @returns bot 名称，失败返回空字符串
 */
const getBotName = async (appId: string, secret: string): Promise<string> => {
  try {
    const tokenRes = await axios.post('https://bots.qq.com/app/getAppAccessToken', {
      appId,
      clientSecret: secret,
    })
    const accessToken = tokenRes.data?.access_token
    if (!accessToken) return ''

    const meRes = await axios.get('https://api.sgroup.qq.com/users/@me', {
      headers: { Authorization: `QQBot ${accessToken}` },
    })
    return meRes.data?.username || ''
  } catch (error) {
    logger.debug('[QQ Official Bot][扫码登录] 获取 bot 名称失败:', error)
    return ''
  }
}

/**
 * 运行扫码登录并自动写入配置
 *
 * 如果配置文件中已存在该 appId 的配置，会覆盖 secret；
 * 否则追加一条新配置。
 *
 * @returns 是否成功
 */
export const runQrOnboard = async (): Promise<boolean> => {
  const result = await qrRegister()
  if (!result) return false

  // 获取 bot 名称
  const name = await getBotName(result.appId, result.secret)
  if (name) {
    console.log(`  Bot 名称: ${name}`)
  }

  const cfg = config()
  const defaults = getDefaultConfig()[0]

  // 查找是否已存在该 appId
  const existingIndex = cfg.findIndex(item => item.appId === result.appId)

  if (existingIndex >= 0) {
    // 更新已有配置
    cfg[existingIndex].secret = result.secret
    if (name) cfg[existingIndex].name = name
    logger.info(`[QQ Official Bot][扫码登录] 已更新已有配置: ${result.appId}`)
  } else {
    // 新增配置
    const newConfig: QQBotConfig = {
      ...defaults,
      name: name || '',
      appId: result.appId,
      secret: result.secret,
    }
    cfg.push(newConfig)
    logger.info(`[QQ Official Bot][扫码登录] 已添加新配置: ${result.appId}`)
  }

  writeConfig(cfg)

  // 打印后续指引
  console.log()
  console.log('  ==========================================')
  console.log('  配置已自动保存，请根据需要进行以下操作：')
  console.log('  1. 如需修改事件接收方式（webhook/ws），请编辑配置文件')
  console.log('  2. 重启服务使配置生效')
  console.log('  ==========================================')
  console.log()

  return true
}

/**
 * 检查当前是否没有任何 Bot 配置
 * @returns 是否需要扫码引导
 */
export const needQrOnboard = (): boolean => {
  const cfg = config()
  // 只有配置完全为空时才触发扫码引导
  return cfg.length === 0
}
