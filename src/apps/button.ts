import karin, { segment } from 'node-karin'

export const buttonDemo = karin.command(/^按钮示例$/, async (e) => {
  await e.reply([
    segment.markdown('#### 按钮示例\n请选择一个操作：'),
    segment.button([
      { text: '打开文档', link: 'https://bot.q.qq.com/wiki/' },
      { text: '发送指令', data: '按钮示例 帮助', enter: true },
      { text: '回调确认', callback: true, data: '按钮示例 确认' },
    ]),
  ])
})

export const buttonHelp = karin.command(/^按钮示例 帮助$/, async (e) => {
  await e.reply('这是指令按钮发送出来的消息。')
})

export const buttonConfirm = karin.command(/^按钮示例 确认$/, async (e) => {
  await e.reply(`收到回调按钮：${e.msg}`)
})

const getPage = (msg = '') => Number(msg.match(/^菜单(?:\s+(\d+))?$/)?.[1] || 1)

export const menuDemo = karin.command(/^菜单(?:\s+\d+)?$/, async (e) => {
  const page = getPage(e.msg)
  await e.reply(segment.markdown(`#### 菜单\n当前第 ${page} 页`))
})

export const menuKeyboard = karin.button(/^菜单(?:\s+\d+)?$/, (next, args) => {
  const page = getPage(args?.e?.msg)

  return segment.keyboard([
    [
      { text: '上一页', data: `菜单 ${Math.max(1, page - 1)}`, enter: true },
      { text: '下一页', data: `菜单 ${page + 1}`, enter: true },
    ],
  ])
})
