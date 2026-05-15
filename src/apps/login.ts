/**
 * 扫码授权指令
 *
 * 任意 bot 适配器下发送：
 *   #QQ登录 / #qq登录 / #qqlogin
 *
 * 触发后：
 * 1. 立即在控制台输出二维码（启动 bot 的环境）
 * 2. 等待手机 QQ 扫码授权
 * 3. 成功后写入 config.json，karin watch 回调自动创建 QQBot 实例
 *
 * ⚠ 注意：扫码授权会刷新该 appId 的 secret，旧 secret 立即失效
 */

import karin from 'node-karin'
import { log } from '@/utils/logger'
import { runQrOnboard } from '@/core/onboard'

/** 互斥锁：避免并发扫码 */
let busy = false

export const qqLogin = karin.command(
  /^#?(?:qq登录|QQ登录|qqlogin|QQLogin)$/i,
  async (e) => {
    if (busy) {
      await e.reply('已有一个扫码授权流程正在进行中，请稍候')
      return
    }
    busy = true

    try {
      await e.reply(
        '已开始 QQ 扫码登录授权流程，请查看服务端控制台扫描二维码。\n' +
        '⚠ 扫码完成会刷新该机器人的 secret，旧 secret 立即失效。'
      )
      log('info', `[扫码登录] 由 ${e.userId} 触发`)

      const ok = await runQrOnboard()
      if (ok) {
        await e.reply('扫码授权成功，配置已保存，QQBot 实例正在初始化…')
      } else {
        await e.reply('扫码授权失败或超时，请重试 #QQ登录')
      }
    } catch (err) {
      log('error', '[扫码登录] 异常:', err)
      await e.reply('扫码授权过程中发生异常，请查看服务端日志')
    } finally {
      busy = false
    }
  },
  { name: 'qqbot:login' }
)
