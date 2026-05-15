/**
 * QQBot 2.0 测试 App
 *
 * 仅在 adapter.protocol = 'qqbot' 下生效。
 *
 * 用法：扫码登录得到 bot 并加好友或拉进群后，发送：
 *   #qqtest help         查看命令清单
 *   #qqtest text         纯文本
 *   #qqtest md           显式 markdown
 *   #qqtest btn          markdown + 按钮（覆盖按钮 → INTERACTION_CREATE 回路）
 *   #qqtest image        单图
 *   #qqtest urls         多个 URL（验证 keyboard.enable）
 *   #qqtest reply        引用回复
 *   #qqtest recall       发一条后 3s 撤回
 *   #qqtest event        打印当前事件 raw 关键字段
 *   #qqtest who          打印 author / sender / contact
 */

import karin, { segment, logger, fs } from 'node-karin'

const ONLY_QQBOT = { adapter: ['qqbot'] }

const HELP = `QQBot 2.0 测试命令：
#qqtest help    显示本帮助
#qqtest text    纯文本
#qqtest md      显式 Markdown
#qqtest btn     Markdown + 回调按钮
#qqtest image   单图
#qqtest urls    多 URL（测试 keyboard.enable）
#qqtest reply   引用回复
#qqtest recall  发一条 3s 后撤回
#qqtest event   打印事件 raw 关键字段
#qqtest who     打印发送者信息`

export const help = karin.command(/^#?qqtest\s+help$/i, async (e) => {
  await e.reply(HELP)
}, { name: 'qqtest:help', ...ONLY_QQBOT })

export const text = karin.command(/^#?qqtest\s+text$/i, async (e) => {
  await e.reply('hello QQBot 2.0 — 这是一条普通文本')
}, { name: 'qqtest:text', ...ONLY_QQBOT })

export const md = karin.command(/^#?qqtest\s+md$/i, async (e) => {
  await e.reply([
    segment.markdown(fs.readFileSync('1.md', 'utf-8')),
  ])
}, { name: 'qqtest:md', ...ONLY_QQBOT })

export const btn = karin.command(/^#?qqtest\s+btn$/i, async (e) => {
  await e.reply([
    segment.markdown('点下方按钮，验证 INTERACTION_CREATE 回路'),
    segment.button({ text: '回调 A', callback: true, data: 'qqtest:cb-a' }),
    segment.button({ text: '回调 B', callback: true, data: 'qqtest:cb-b' }),
  ])
}, { name: 'qqtest:btn', ...ONLY_QQBOT })

export const image = karin.command(/^#?qqtest\s+image$/i, async (e) => {
  await e.reply([
    segment.text('来一张图：'),
    segment.image('https://avatars.githubusercontent.com/u/108518214'),
  ])
}, { name: 'qqtest:image', ...ONLY_QQBOT })

export const urls = karin.command(/^#?qqtest\s+urls$/i, async (e) => {
  await e.reply(
    '看这几个：https://github.com 还有 https://q.qq.com 以及 https://karin.fun'
  )
}, { name: 'qqtest:urls', ...ONLY_QQBOT })

export const replyCmd = karin.command(/^#?qqtest\s+reply$/i, async (e) => {
  await e.reply('我引用了你刚发的消息', { reply: true })
}, { name: 'qqtest:reply', ...ONLY_QQBOT })

export const recall = karin.command(/^#?qqtest\s+recall$/i, async (e) => {
  const res = await e.reply('这条消息将在 3 秒后撤回')
  setTimeout(() => {
    e.bot.recallMsg(e.contact, res.messageId).catch(err =>
      logger.error('[qqtest] 撤回失败:', err))
  }, 3000)
}, { name: 'qqtest:recall', ...ONLY_QQBOT })

export const event = karin.command(/^#?qqtest\s+event$/i, async (e) => {
  const raw = e.rawEvent as any
  const summary = {
    t: raw?.t,
    id: raw?.id,
    'd.id': raw?.d?.id,
    'd.author.username': raw?.d?.author?.username,
    'd.author.member_openid': raw?.d?.author?.member_openid,
    'd.author.union_openid': raw?.d?.author?.union_openid,
    'd.author.bot': raw?.d?.author?.bot,
    'd.mentions': raw?.d?.mentions?.map((m: any) => ({
      is_you: m.is_you, scope: m.scope, username: m.username,
    })),
    'd.message_scene': raw?.d?.message_scene,
    'd.message_type': raw?.d?.message_type,
    'd.timestamp': raw?.d?.timestamp,
  }
  await e.reply('event raw：\n```json\n' + JSON.stringify(summary, null, 2) + '\n```')
  logger.info('[qqtest:event]', summary)
}, { name: 'qqtest:event', ...ONLY_QQBOT })

export const who = karin.command(/^#?qqtest\s+who$/i, async (e) => {
  const info = {
    selfId: e.selfId,
    userId: e.userId,
    scene: e.contact.scene,
    peer: e.contact.peer,
    subPeer: (e.contact as any).subPeer,
    senderNick: (e.sender as any).nick,
    isGroup: e.isGroup,
    isFriend: e.isFriend,
    isGuild: e.isGuild,
    isDirect: e.isDirect,
  }
  await e.reply('who：\n```json\n' + JSON.stringify(info, null, 2) + '\n```')
}, { name: 'qqtest:who', ...ONLY_QQBOT })

/**
 * 按钮回调到达时（被 adapter 转成消息事件投递，rawEvent.t === 'INTERACTION_CREATE'）
 * 这里拦截并回显 button_data
 */
export const buttonCallback = karin.command(/^qqtest:cb-/, async (e) => {
  const raw = e.rawEvent as any
  if (raw?.t !== 'INTERACTION_CREATE') return
  const r = raw?.d?.data?.resolved
  await e.reply(
    `收到按钮点击：\n  button_id=${r?.button_id}\n  button_data=${r?.button_data}\n  scene=${raw?.d?.scene}`
  )
}, { name: 'qqtest:button-callback', ...ONLY_QQBOT })
