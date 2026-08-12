import { BindStatus, checkBindResult, decryptSecret } from './session'

const WaitingMS = 2000

/**
 * 轮询绑定结果
 * @param taskId 任务ID
 * @param key 解密密钥
 * @returns QQBot 的appid与secret
 */
export const PollBindResult = async (taskId: string, key: string) => {
  while (true) {
    let data
    try {
      data = await checkBindResult(taskId)
    } catch {
      await new Promise(resolve => setTimeout(resolve, WaitingMS))
      continue
    }
    if (data.status === BindStatus.COMPLETED) {
      const secret = decryptSecret(data.encryptedSecret, key)
      return {
        status: data.status,
        appId: data.appId,
        secret,
      } as const
    }
    if (data.status === BindStatus.EXPIRED) {
      return { status: data.status } as const
    }
    await new Promise(resolve => setTimeout(resolve, WaitingMS))
  }
}
