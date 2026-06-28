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
    "keyboard": { "enable": true },
    "event": { "type": 2 }
  }
]
```

- `event.type`: `0` 关闭、`1` Webhook、`2` WebSocket（默认）。
- `guildMode`: `0` 公域，只收 @ 消息；`1` 私域，接收全部频道消息。
- `keyboard.enable`: 自动将文本中的 URL 转为 QQ 按钮。

## 发送消息与资源文件

适配器会尽量帮你发送图片、视频、语音和文件。推荐配置 `fileToUrl` 上传处理器，把本地文件、截图、Base64 等资源上传到你的图床、对象存储或 CDN，并返回一个 QQ 能访问的链接。

配置 `fileToUrl` 后：

- 本地图片可以正常嵌入 Markdown 消息。
- 视频、语音和文件会优先使用你返回的链接发送，通常比直接上传给 QQ 更稳定。
- 如果资源本身已经是 `http` / `https` 链接，适配器会直接使用它。

没有配置 `fileToUrl` 时：

- 单独发送图片、视频、语音、文件时，适配器会尝试直接交给 QQ 发送。
- 较大的文件会使用 QQ 的大文件上传流程。
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
