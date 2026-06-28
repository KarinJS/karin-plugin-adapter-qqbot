/**
 * #QQ登录 指令
 *
 * 仅主人可用。匹配 `#QQ登录` 或 `#qqlogin`（大小写均可）。
 * 必须带 `#` 前缀。
 *
 * 流程：
 * 1. 立即回复"开始扫码"
 * 2. 触发扫码授权流程
 * 3. 每次生成新二维码 → 把 PNG 图片回复给触发者
 * 4. 授权成功 → 回复结果，watch 回调自动初始化 bot
 *
 * ⚠ 注意：扫码授权会刷新该 appId 的 secret，旧 secret 立即失效
 */

import karin, { segment, type AdapterType, type Contact, type SendMsgResults } from 'node-karin'
import { log } from '@/utils/logger'
import { runQrOnboard } from '@/core/onboard'

/** 互斥锁：避免并发扫码 */
let busy = false

/**
 * 判断触发 #QQ登录 的上游是否为 Karin 控制台适配器。
 * Console 适配器无法直接在聊天窗口展示二维码图片，因此需要额外打印终端二维码。
 */
const isConsoleAdapter = (bot: AdapterType): boolean => {
  const selfId = String(bot.selfId || '').toLowerCase()
  const name = String(bot.adapter.name || '').toLowerCase()
  const protocol = String(bot.adapter.protocol || '').toLowerCase()
  return selfId === 'console' || name === 'console' || name.endsWith('/console') || protocol === 'console'
}

/**
 * 记录一次回复返回的消息 ID，便于扫码流程结束后清理二维码、链接等临时信息。
 * @param result 回复返回值。
 * @param messageIds 已登记的消息 ID 集合。
 */
const trackReply = (result: SendMsgResults | undefined, messageIds: string[]): void => {
  const messageId = result?.messageId
  if (messageId && !messageIds.includes(messageId)) messageIds.push(messageId)
}

/**
 * 撤回扫码流程中发出的临时消息。
 * @param bot 触发登录的机器人实例。
 * @param contact 回复所在会话。
 * @param messageIds 需要撤回的消息 ID。
 */
const recallTrackedReplies = async (bot: AdapterType, contact: Contact, messageIds: string[]): Promise<void> => {
  for (const messageId of messageIds) {
    try {
      await bot.recallMsg(contact, messageId)
    } catch (err) {
      log('warn', `[扫码登录] 撤回临时消息失败: ${messageId}`, err)
    }
  }
  messageIds.length = 0
}

export const qqLogin = karin.command(
  /^#(?:qq登录|qqlogin)$/i,
  async (e) => {
    if (busy) {
      await e.reply('已有扫码授权在进行中，请稍候再试')
      return
    }
    busy = true

    const messageIds: string[] = []
    type ReplyPayload = Parameters<typeof e.reply>[0]

    /**
     * 发送并登记扫码流程的临时回复。
     * @param elements 回复内容。
     */
    const replyAndTrack = async (elements: ReplyPayload): Promise<SendMsgResults> => {
      const result = await e.reply(elements)
      trackReply(result, messageIds)
      return result
    }

    try {
      await replyAndTrack([
        segment.text(
          '已开始 QQ 扫码登录授权\n' +
          '⚠ 扫码完成会刷新该机器人的 secret，旧 secret 立即失效'
        ),
      ])
      log('info', `[扫码登录] 由用户 ${e.userId} 触发`)

      const ok = await runQrOnboard({
        printTerminal: isConsoleAdapter(e.bot),
        onQr: async ({ base64, url, refresh }) => {
          const head = refresh === 0
            ? '请使用手机 QQ 扫描二维码完成授权（二维码 60s 内有效，过期会自动刷新最多 3 次）：'
            : `上一张二维码已过期，已自动刷新（第 ${refresh}/3 次，仍为 60s 有效期）：`
          try {
            await replyAndTrack([
              segment.text(head),
              segment.image(base64),
              segment.text(`或在手机 QQ 打开链接：\n${url}`),
            ])
          } catch (err) {
            log('warn', '[扫码登录] 推送二维码失败:', err)
          }
        },
      })

      await recallTrackedReplies(e.bot, e.contact, messageIds)

      if (ok) {
        await e.reply('扫码授权成功，配置已保存，QQBot 实例正在初始化…')
      } else {
        await e.reply('扫码授权失败或超时，请重试 #QQ登录')
      }
    } catch (err) {
      log('error', '[扫码登录] 异常:', err)
      await recallTrackedReplies(e.bot, e.contact, messageIds)
      await e.reply('扫码授权过程中发生异常，详情见服务端日志')
    } finally {
      busy = false
    }
  },
  {
    name: 'qqbot:login',
    permission: 'master',
    authFailMsg: '#QQ登录 仅限主人使用',
  }
)
