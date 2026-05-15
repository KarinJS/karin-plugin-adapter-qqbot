import qrcode from 'qrcode'
import { sleep } from '@/utils/common'
import { log } from '@/utils/logger'
import { decryptSecret } from './crypto'
import {
  BindStatus, createBindTask, pollBindResult, buildConnectUrl,
} from './portal'

/** 默认轮询间隔（毫秒） */
const POLL_INTERVAL = 2_000
/** 默认总超时（秒） */
const DEFAULT_TIMEOUT_S = 600
/** 二维码过期最大刷新次数 */
const MAX_REFRESHES = 3

export interface QrRegisterResult {
  appId: string
  secret: string
  userOpenid: string
}

const printQr = async (url: string): Promise<void> => {
  try {
    const ascii = await qrcode.toString(url, { type: 'terminal', small: true })
    console.log(ascii)
    console.log(`  请使用 QQ 扫描上方二维码，或在手机 QQ 打开链接：\n  ${url}\n`)
  } catch {
    console.log(`  请在手机 QQ 中打开链接：\n  ${url}\n`)
  }
}

/**
 * 走一遍扫码登录：
 * 1. 创建绑定任务 + 终端二维码
 * 2. 轮询直到状态变为 COMPLETED / 二维码过期 / 超时
 * 3. 解密返回 secret
 */
export const qrRegister = async (timeoutSeconds = DEFAULT_TIMEOUT_S): Promise<QrRegisterResult | null> => {
  const deadline = Date.now() + timeoutSeconds * 1000

  for (let refresh = 0; refresh <= MAX_REFRESHES; refresh++) {
    let task: { taskId: string; aesKey: string }
    try {
      task = await createBindTask()
    } catch (err) {
      log('error', '[扫码登录] 创建绑定任务失败:', err)
      return null
    }

    console.log()
    await printQr(buildConnectUrl(task.taskId))

    while (Date.now() < deadline) {
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
        console.log(`\n  扫码授权成功！App ID: ${result.appId}`)
        if (result.userOpenid) {
          console.log(`  扫码用户 OpenID: ${result.userOpenid}`)
        }
        return { appId: result.appId, secret, userOpenid: result.userOpenid }
      }

      if (result.status === BindStatus.EXPIRED) {
        if (refresh >= MAX_REFRESHES) {
          log('error', `[扫码登录] 二维码已过期 ${MAX_REFRESHES} 次，终止流程`)
          return null
        }
        console.log(`\n  二维码已过期，正在刷新... (${refresh + 1}/${MAX_REFRESHES})`)
        break
      }

      await sleep(POLL_INTERVAL)
    }

    if (Date.now() >= deadline) {
      log('error', `[扫码登录] 等待扫码超时（${timeoutSeconds}s）`)
      return null
    }
  }

  return null
}
