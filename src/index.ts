import { logger } from 'node-karin'
import { basename, config } from '@/utils'
import { initQQBotAdapter } from '@/core/index'
import { createRouting } from '@/connection/routing'
import { needQrOnboard, runQrOnboard } from '@/core/onboard'
import type { AdapterQQBot } from '@/core/adapter/base'

/** 请不要在这编写插件 不会有任何效果~ */
logger.info(`${logger.violet(`[插件:${config.pkg().version}]`)} ${logger.green(basename)} 初始化完成~`)

createRouting()

/**
 * 检测是否需要扫码登录引导
 * 当没有任何启用的 Bot 配置时，提示用户通过二维码扫码添加机器人
 */
const checkOnboard = async () => {
  if (needQrOnboard()) {
    console.log()
    console.log('  ==========================================')
    console.log('  未检测到启用的 QQBot 配置')
    console.log('  请使用二维码扫码方式快速添加机器人')
    console.log('  ==========================================')
    console.log()

    const success = await runQrOnboard()
    if (success) {
      // writeConfig 已触发 watch 回调自动初始化新配置，无需手动调用 initQQBotAdapter
      logger.info('[QQ Official Bot] 扫码成功，配置已保存，watch 回调将自动完成初始化')
    } else {
      console.log('  扫码登录已取消或失败，请手动编辑配置文件添加机器人')
    }
  } else {
    // 已有配置，正常初始化
    try {
      await initQQBotAdapter()
    } catch (error) {
      logger.error('[QQ Official Bot] 初始化适配器失败:', error)
    }
  }
}

checkOnboard()

export type { AdapterQQBot }
