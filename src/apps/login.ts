import { BindStatus, buildConnectUrl, createBindTask, PollBindResult } from '@/core/qrcode'
import QRCode from 'qrcode'
import karin, { segment, SendMessage } from 'node-karin'
import { config, getDefaultConfig } from '@/utils/config'
import { QQBotConfig } from '@/types'
let busy = false
export const QQBotLogin = karin.command(/^#qqbot(登录|login)$/i, async (e) => {
  const msgIds: string[] = []
  const reply = async (elements: SendMessage | string) => {
    const res = await e.reply(elements, { at: true })
    msgIds.push(res.messageId)
  }
  if (busy) return await e.reply('已有扫码授权在进行中，请稍候再试', { reply: true })
  busy = true
  await reply('注意: 确认登录后将刷新 QQBot 的 AppSecret,旧的 AppSecret 将失效')
  const task = await createBindTask()
  const url = buildConnectUrl(task.taskId)
  const msg: SendMessage = [segment.text('请使用 QQ 扫码登录')]
  if (e.bot.adapter.protocol === 'console') {
    const qrcode = await QRCode.toString(url, { type: 'terminal', small: true })
    msg.push(segment.text(`\n${qrcode}`))
  } else {
    const qrcode = await QRCode.toDataURL(url)
    msg.push(segment.image(qrcode))
  }
  msg.push(segment.text(`或使用手机 QQ 打开链接登录: ${url}`))
  await reply(msg)
  const ok = await PollBindResult(task.taskId, task.aesKey)
  msgIds.forEach(async (id) => {
    await e.bot.recallMsg(e.contact, id).catch(() => { })
  })
  if (ok.status === BindStatus.COMPLETED) {
    const list = config()
    const idx = list.findIndex(item => item.appId === ok.appId)
    if (idx >= 0) {
      list[idx].secret = ok.secret
      e.reply(`Bot存在,已更新[${ok.appId}]配置`, { reply: true })
    } else {
      const defaults = getDefaultConfig()[0]
      list.push({
        ...defaults,
        appId: ok.appId,
        secret: ok.secret,
      } as QQBotConfig)
      e.reply(`[${ok.appId}] 扫码登录成功`, { reply: true })
    }
    return
  }
  return await e.reply('二维码过期,请重新触发指令', { reply: true })
}, {
  perm: 'master',
  name: 'QQBot 扫码登录',
})
