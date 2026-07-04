# @karinjs/adapter-qqbot

Karin 的 QQ 官方机器人适配器。

## 安装

```bash
pnpm add @karinjs/adapter-qqbot
```

要求：Node.js >= 22、Karin >= 1.15

## 配置

首次启动没有 QQBot 配置时，使用**任意已连接的机器人**或在**控制台中**发送 `#QQ登录` 完成扫码授权。

也可以访问 Karin WebUI 可视化编辑 或者 手动编辑：`@karinjs-adapter-qqbot/config/config.json`。

```json
[
  {
    "name": "我的机器人",
    "appId": "1234567890",
    "secret": "your-secret",
    "sandbox": false,
    "qqEnable": true,
    "guildEnable": true,
    "guildMode": 0,
    "proxy": {
      "prodApi": "https://api.sgroup.qq.com",
      "sandboxApi": "https://sandbox.api.sgroup.qq.com",
      "tokenApi": "https://bots.qq.com/app/getAppAccessToken",
      "prodWs": "wss://api.sgroup.qq.com/websocket/",
      "sandboxWs": "wss://sandbox.api.sgroup.qq.com/websocket/"
    },
    "keyboard": { "enable": true },
    "markdown": { "enable": true },
    "event": { "type": 2 }
  }
]
```

- `event.type`: `0` 关闭、`1` Webhook、`2` WebSocket（默认）。
- `guildMode`: `0` 公域，只收 @ 消息；`1` 私域，接收全部频道消息。
- `proxy`: 自定义连接代理地址。`prodApi` / `sandboxApi` 作为 OpenAPI 根地址使用，后端拼接路径时会兼容末尾 `/`；`tokenApi` 是完整接口地址；`prodWs` / `sandboxWs` 是完整 WebSocket 网关地址，支持 `ws://` 和 `wss://`，路径和查询参数会按配置原样连接。
- `markdown.enable`: 是否启用 Markdown 通道，默认开启。关闭后图片会改为单独上传发送。

## 按钮

按钮一般和 Markdown 一起发送，常用有三种：

- 跳转按钮：点击后打开 `link`。
- 指令按钮：点击后把 `data` 发送成一条普通消息。
- 回调按钮：点击后不会在聊天框发消息，但适配器会下发一条 Karin 消息事件，消息内容就是 `data`。

下面这个示例先发送一组按钮，然后分别接住“指令按钮”和“回调按钮”的点击结果：

```ts
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
```

如果你希望回复自动带上一组按钮，可以把按钮单独注册出来。下面这个分页示例会根据当前消息生成“上一页 / 下一页”：

```ts
import karin, { segment } from 'node-karin'

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
```

简单理解：`karin.button` 是“自动追加按钮”的规则。适配器回复时会自动用 `buttonHandle(e.msg, { e })` 查找匹配规则，所以用户发送 `菜单 2`，就会命中 `/^菜单(?:\s+\d+)?$/`，按钮函数再通过 `args?.e?.msg` 算出当前页。

自己调用 `buttonHandle` 时只记三点：

- 参数一是匹配文本，通常填 `e.msg`，也可以是 `'菜单'`。
- 参数二是给按钮函数的上下文，常用 `{ e }`；需要状态可以写 `{ e, page: 2 }`。
- 一个规则里调用 `next()`，才会继续匹配后面的规则。

回调按钮的 `data` 会变成一条 Karin 消息内容，所以建议直接写成插件能识别的命令，例如 `按钮示例 确认`、`菜单 下一页`。

## 发送消息与资源文件

适配器会尽量帮你发送图片、视频、语音和文件。推荐配置 `fileToUrl` 上传处理器，把本地文件、截图、Base64 等资源上传到你的图床、对象存储或 CDN，并返回一个 QQ 能访问的链接。

配置 `fileToUrl` 后：

- 本地图片可以正常嵌入 Markdown 消息。
- 视频、语音和文件会优先使用你返回的链接发送，通常比直接上传给 QQ 更稳定。
- 如果资源本身已经是 `http` / `https` 链接，适配器会直接使用它。

没有配置 `fileToUrl` 时：

- 单独发送图片、视频、语音、文件时，适配器会尝试直接交给 QQ 发送。
- 较大的资源会使用 QQ 的大文件上传流程，优先保证消息能发出去。
- 较大的图片或视频直接交给 QQ 发送时，QQ 客户端可能会把它显示成群文件，而不是图片或视频卡片；配置 `fileToUrl` 后通常可以避免这种显示问题。
- 直接交给 QQ 只是兜底方案，生产环境仍然建议准备自己的文件服务。

> **注意：Markdown 里的图片必须配置 `fileToUrl`。**
>
> 只要你发送的内容包含 Markdown，并且 Markdown 里有图片、本地生成图、Base64 图等资源，就必须配置 `fileToUrl`。因为 Markdown 里的图片只能写成 QQ 能访问的链接，适配器不能把 Markdown 文本里的图片自动当成附件上传。

你可以在自己的 Karin 插件中编写并注册 `fileToUrl` Handler：

```js
// plugins/karin-plugin-example/fileToUrl.js
import karin, { common } from 'node-karin'
import size from 'image-size'

export const uploadResource = karin.handler('fileToUrl', async (args) => {
  const { file, type, filename } = args
  const buffer = await common.buffer(file)

  // 由你实现：上传到图床/对象存储，返回可公开访问的 URL。
  const url = await uploadToYourStorage(buffer, filename || 'file.bin')

  if (type !== 'image') return { url }

  const dimension = size(buffer) // 获取图片宽高
  return {
    url,
    width: dimension.width || 100,
    height: dimension.height || 100
  }
})
```

> **注意：Handler 插件的 key 必须精确为 `fileToUrl`。**
>
> 图片必须返回 `{ url, width, height }`；其他资源返回 `{ url }`。

建议生产环境都配置 `fileToUrl`。这样图片、视频和文件都可以先上传到你自己的文件服务，再交给 QQ 发送，成功率和可控性都会更好。

## 事件

- 支持 QQ 单聊、群聊、频道、频道私信和按钮回调。
- 支持 `GROUP_MESSAGE_CREATE` 全量群消息和 `author.member_role` 身份字段。
- 支持 `GROUP_MEMBER_ADD`、`GROUP_MEMBER_REMOVE` 群成员进退群事件。
- 单聊同一 `msg_id` 最多回复 4 次；群聊规则保持官方限制。

## 开发

```bash
pnpm install
pnpm build
```

## License

MIT
