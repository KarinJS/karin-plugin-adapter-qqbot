import { log } from '@/utils/logger'
import { config, getDefaultConfig, writeConfig } from '@/utils/config'
import { qrRegister } from './qr'
import { fetchBotName } from './portal'
import type { QQBotConfig } from '@/types/config'

/**
 * 是否需要触发扫码引导：完全没有 bot 配置时为 true
 */
export const needQrOnboard = (): boolean => config().length === 0

/**
 * 执行扫码登录并把结果写入 config.json
 *
 * 已存在同 appId 的条目仅覆盖 secret / name；否则追加新配置
 *
 * @returns 是否成功
 */
export const runQrOnboard = async (): Promise<boolean> => {
  const result = await qrRegister()
  if (!result) return false

  const name = await fetchBotName(result.appId, result.secret)
  if (name) console.log(`  Bot 名称: ${name}`)

  const list = config()
  const idx = list.findIndex(item => item.appId === result.appId)

  if (idx >= 0) {
    list[idx].secret = result.secret
    if (name) list[idx].name = name
    log('info', `[扫码登录] 已更新已有配置: ${result.appId}`)
  } else {
    const defaults = getDefaultConfig()[0]
    const created: QQBotConfig = {
      ...defaults,
      name: name || '',
      appId: result.appId,
      secret: result.secret,
    }
    list.push(created)
    log('info', `[扫码登录] 已添加新配置: ${result.appId}`)
  }

  writeConfig(list)

  console.log()
  console.log('  ==========================================')
  console.log('  配置已自动保存，请根据需要进行以下操作：')
  console.log('  1. 如需修改事件接收方式（webhook/ws），请编辑配置文件')
  console.log('  2. 重启服务使配置生效')
  console.log('  ==========================================')
  console.log()

  return true
}

export { qrRegister } from './qr'
export type { QrRegisterResult } from './qr'
