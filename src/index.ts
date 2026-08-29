import { logger } from 'node-karin'
import { basename, config } from '@/utils'
import { log } from '@/utils/logger'
import { initQQBotAdapter } from '@/core/index'
import { createRouting } from '@/connection/routing'
import type { AdapterQQBot } from '@/core/adapter/base'

logger.info(
  `${logger.violet(`[插件:${config.pkg().version}]`)} ${logger.green(basename)} 初始化完成~`
)

createRouting()

const bootstrap = async () => {
  try {
    await initQQBotAdapter()
  } catch (err) {
    log('error', '初始化适配器失败:', err)
  }
}

bootstrap()

export type { AdapterQQBot }
export { QQBotApi, RequestApi, Http } from '@/core/api'
export type { RequestOptions, AxiosInstance } from '@/core/api'
