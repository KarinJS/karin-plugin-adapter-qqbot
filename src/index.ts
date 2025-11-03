import { logger } from 'node-karin'
import { basename, config } from '@/utils'
import { initQQBotAdapter } from '@/core/index'
import { createRouting } from '@/connection/routing'
import type { AdapterQQBot } from '@/core/adapter/adapter'

/** 请不要在这编写插件 不会有任何效果~ */
logger.info(`${logger.violet(`[插件:${config.pkg().version}]`)} ${logger.green(basename)} 初始化完成~`)

createRouting()
initQQBotAdapter()

export type { AdapterQQBot }
