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

文本、@、图片和按钮都通过 Markdown 发送。视频、语音和文件会先上传，再发送 QQ 富媒体消息。

发送本地文件、Base64 或 Buffer 时，需要你自己提供图床或对象存储。适配器目前暂不内置公共上传服务。

你需要在自己的 Karin 插件中编写一个 Handler 插件并注册：

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

未注册 `fileToUrl` 的 Handler 时，适配器无法上传本地资源，资源消息会发送失败。

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
