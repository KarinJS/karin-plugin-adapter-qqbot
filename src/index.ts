import { logger } from 'node-karin'
import { basename, config } from '@/utils'
import { log } from '@/utils/logger'
import { initQQBotAdapter } from '@/core/index'
import { createRouting } from '@/connection/routing'
import { needQrOnboard, runQrOnboard } from '@/core/onboard'
import type { AdapterQQBot } from '@/core/adapter/base'

logger.info(
  `${logger.violet(`[插件:${config.pkg().version}]`)} ${logger.green(basename)} 初始化完成~`
)

createRouting()

const printOnboardBanner = () => {
  console.log()
  console.log('  ==========================================')
  console.log('  未检测到启用的 QQBot 配置')
  console.log('  请使用二维码扫码方式快速添加机器人')
  console.log('  ==========================================')
  console.log()
}

const bootstrap = async () => {
  if (needQrOnboard()) {
    printOnboardBanner()
    const ok = await runQrOnboard()
    if (ok) {
      // 配置写入会触发 watch 回调，自动完成初始化
      log('info', '扫码成功，配置已保存，watch 回调将完成初始化')
    } else {
      console.log('  扫码登录已取消或失败，请手动编辑配置文件添加机器人')
    }
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
