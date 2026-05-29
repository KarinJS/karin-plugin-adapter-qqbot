import { logger } from 'node-karin'
import { basename, config } from '@/utils'
import { log } from '@/utils/logger'
import { initQQBotAdapter } from '@/core/index'
import { createRouting } from '@/connection/routing'
import { needQrOnboard } from '@/core/onboard'
import type { AdapterQQBot } from '@/core/adapter/base'

logger.info(
  `${logger.violet(`[插件:${config.pkg().version}]`)} ${logger.green(basename)} 初始化完成~`
)

createRouting()

const printOnboardBanner = () => {
  console.log()
  console.log('  ==========================================')
  console.log('  未检测到 QQBot 配置')
  console.log('  请使用任意可用 bot（如 OneBot / Console 适配器）')
  console.log('  对机器人发送指令： #QQ登录')
  console.log('  扫码授权完成后会自动写入配置并完成初始化')
  console.log()
  console.log('  ⚠ 注意：扫码授权会刷新该机器人的 secret，旧 secret 立即失效')
  console.log('  ==========================================')
  console.log()
}

const bootstrap = async () => {
  if (needQrOnboard()) {
    printOnboardBanner()
    return
  }

  try {
    await initQQBotAdapter()
  } catch (err) {
    log('error', '初始化适配器失败:', err)
  }
}

bootstrap()

export type { AdapterQQBot }
