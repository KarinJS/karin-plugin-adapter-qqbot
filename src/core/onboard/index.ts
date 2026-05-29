import { log } from '@/utils/logger'
import { config, getDefaultConfig, writeConfig } from '@/utils/config'
import { qrRegister, type QrRegisterOptions } from './qr'
import { fetchBotName } from './portal'
import type { QQBotConfig } from '@/types/config'

/** 是否需要触发扫码引导：完全没有 bot 配置时为 true */
export const needQrOnboard = (): boolean => config().length === 0

/**
 * 执行扫码登录并把结果写入 config.json
 *
 * - 同 appId 已存在 → 覆盖 secret / name
 * - 不存在 → 追加新配置
 *
 * 支持 `opts.onQr` 把新二维码透出给调用方（如 #QQ登录 指令把图片回给用户）
 */
export const runQrOnboard = async (opts: QrRegisterOptions = {}): Promise<boolean> => {
  const result = await qrRegister(opts)
  if (!result) return false

  const name = await fetchBotName(result.appId, result.secret)
  if (name) log('info', `[扫码登录] Bot 名称: ${name}`)

  const list = config()
  const idx = list.findIndex(item => item.appId === result.appId)

  if (idx >= 0) {
    list[idx].secret = result.secret
    if (name) list[idx].name = name
    log('info', `[扫码登录] 已更新已有配置: ${result.appId}`)
  } else {
    const defaults = getDefaultConfig()[0]
    list.push({
      ...defaults,
      name: name || '',
      appId: result.appId,
      secret: result.secret,
    } as QQBotConfig)
    log('info', `[扫码登录] 已添加新配置: ${result.appId}`)
  }

  writeConfig(list)
  return true
}

export { qrRegister } from './qr'
export type { QrRegisterResult, QrRegisterOptions, QrCodeInfo } from './qr'
