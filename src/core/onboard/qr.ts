import qrcode from 'qrcode'
import { sleep } from '@/utils/common'
import { log } from '@/utils/logger'
import { decryptSecret } from './crypto'
import { BindStatus, createBindTask, pollBindResult, buildConnectUrl } from './portal'

/** 默认轮询间隔（毫秒） */
const POLL_INTERVAL = 2_000
/** 默认总超时（秒） */
const DEFAULT_TIMEOUT_S = 600
/** 单张二维码硬编码有效期：60s，到时主动判定过期触发刷新 */
const QR_TTL_MS = 60_000
/** 二维码过期最大刷新次数 */
const MAX_REFRESHES = 3

export interface QrRegisterResult {
  appId: string
  secret: string
  userOpenid: string
}

/**
 * 每次产生新二维码时的回调
 */
export interface QrCodeInfo {
  /** 扫码链接 */
  url: string
  /** ASCII 二维码（终端可见） */
  ascii: string
  /** PNG 二维码 base64：`base64://xxx`，可直接喂给 segment.image */
  base64: string
  /** 第几轮（首次=0，过期刷新 +1） */
  refresh: number
}

export interface QrRegisterOptions {
  /** 总超时秒数，默认 600 */
  timeoutSeconds?: number
  /** 是否把二维码渲染为终端可识别的图形并打印到控制台 */
  printTerminal?: boolean
  /** 每次产生新二维码时的回调（首次 / 过期刷新都会调用） */
  onQr?: (info: QrCodeInfo) => void | Promise<void>
}

/**
 * 生成二维码（同时拿到 ascii / base64）
 */
const renderQr = async (url: string): Promise<{ ascii: string; base64: string }> => {
  const ascii = await qrcode.toString(url, { type: 'terminal', small: true }).catch(() => '')
  const dataUrl = await qrcode.toDataURL(url, { width: 320, margin: 2 })
  const base64 = `base64://${dataUrl.split(',')[1]}`
  return { ascii, base64 }
}

/**
 * 扫码登录主流程：
 * 1. 创建绑定任务，调用 onQr 暴露二维码
 * 2. 轮询直到 COMPLETED / 二维码过期刷新 / 超时
 * 3. 解密返回 secret
 */
export const qrRegister = async (opts: QrRegisterOptions = {}): Promise<QrRegisterResult | null> => {
  const { timeoutSeconds = DEFAULT_TIMEOUT_S, printTerminal = false, onQr } = opts
  const deadline = Date.now() + timeoutSeconds * 1000

  for (let refresh = 0; refresh <= MAX_REFRESHES; refresh++) {
    let task: { taskId: string; aesKey: string }
    try {
      task = await createBindTask()
    } catch (err) {
      log('error', '[扫码登录] 创建绑定任务失败:', err)
      return null
    }

    const url = buildConnectUrl(task.taskId)
    const { ascii, base64 } = await renderQr(url)
    const qrDeadline = Date.now() + QR_TTL_MS

    if (printTerminal) {
      if (ascii) {
        console.log()
        console.log(ascii)
      }
      console.log(`  请使用 QQ 扫码（60s 内有效），或在手机 QQ 打开：\n  ${url}\n`)
    }

    if (onQr) {
      try {
        await onQr({ url, ascii, base64, refresh })
      } catch (err) {
        log('warn', '[扫码登录] onQr 回调异常:', err)
      }
    }

    // 本轮二维码窗口：当前二维码失效 (qrDeadline) 或总超时 (deadline) 二选一
    let expired = false
    while (Date.now() < deadline) {
      // 60s 硬过期：不论服务端怎么说，本地直接进入刷新
      if (Date.now() >= qrDeadline) {
        expired = true
        break
      }

      let result: Awaited<ReturnType<typeof pollBindResult>>
      try {
        result = await pollBindResult(task.taskId)
      } catch {
        await sleep(POLL_INTERVAL)
        continue
      }

      if (result.status === BindStatus.COMPLETED) {
        if (!result.encryptedSecret) {
          log('error', '[扫码登录] 绑定结果缺少加密密钥')
          return null
        }
        let secret: string
        try {
          secret = decryptSecret(result.encryptedSecret, task.aesKey)
        } catch (err) {
          log('error', '[扫码登录] 解密 secret 失败:', err)
          return null
        }
        log('info', `[扫码登录] 授权成功，App ID: ${result.appId}`)
        return { appId: result.appId, secret, userOpenid: result.userOpenid }
      }

      // 服务端先于本地判定过期，提前 break 进入刷新
      if (result.status === BindStatus.EXPIRED) {
        expired = true
        break
      }

      await sleep(POLL_INTERVAL)
    }

    // 进入刷新分支
    if (expired) {
      if (refresh >= MAX_REFRESHES) {
        log('error', `[扫码登录] 二维码已过期 ${MAX_REFRESHES + 1} 次，终止流程`)
        return null
      }
      log('info', `[扫码登录] 二维码 60s 内未完成扫码，正在刷新 (${refresh + 1}/${MAX_REFRESHES})`)
      continue
    }

    // 总超时
    log('error', `[扫码登录] 等待扫码总超时（${timeoutSeconds}s）`)
    return null
  }

  return null
}
