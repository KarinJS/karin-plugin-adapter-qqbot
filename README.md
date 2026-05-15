# @karinjs/adapter-qqbot

[![npm](https://img.shields.io/npm/v/@karinjs/adapter-qqbot?style=flat-square)](https://www.npmjs.com/package/@karinjs/adapter-qqbot)
[![license](https://img.shields.io/npm/l/@karinjs/adapter-qqbot?style=flat-square)](./LICENSE)

为 [Karin](https://github.com/KarinJS/Karin) 框架提供 QQ 官方机器人接入能力。

> **2.0 已发布**：完整重写，对齐 QQ 开放平台 2026 年起的新事件协议
> （`GROUP_MESSAGE_CREATE` 全量群聊消息 + `mentions` 数组），并适配
> Markdown / Keyboard 全量开放后的发送方式。

---

## 特性

- 🌐 **完整事件支持**：群聊（@/全量）、单聊、频道、频道私信、按钮点击、机器人入退群、主动消息开关
- 📨 **双发送通道**：自动选择「经典通道」（text + media）或「Markdown 通道」（msg_type=2 + keyboard），按消息内容与配置开关
- 🔌 **双接入方式**：WebSocket（推荐，无需公网）/ Webhook（QQ 主动推送）
- ♻️ **WebSocket Resume**：断网自动重连，携带 `session_id` / `seq` 通过 `op:6` 恢复，减少消息丢失
- 🔑 **扫码登录**：插件首次启动自动二维码引导，授权后写回 `config.json`
- 🧩 **按钮回调**：完整接入 `INTERACTION_CREATE`，自动 ack 并以普通消息事件投递给业务层
- 🛡️ **签名校验**：webhook 入口自动用 ed25519 校验
- 📐 **完整 TypeScript 类型**
- 🧹 **零 1.x 残留**：不再依赖 Markdown 模板 / keyboard 模板 / 中转服务

---

## 安装

```bash
pnpm add @karinjs/adapter-qqbot
```

> 要求 Node.js >= 18，Karin >= 1.15

---

## 快速开始

### 方式 A：扫码登录（推荐）

首次启动且配置为空时，插件自动弹出扫码引导。

```bash
pnpm dev   # 或 pnpm start
```

控制台会输出：

```
  ==========================================
  未检测到启用的 QQBot 配置
  请使用二维码扫码方式快速添加机器人
  ==========================================

  ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢
  ▢ ASCII QR ▢▢▢▢▢▢▢
  ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢

  请使用 QQ 扫描上方二维码，或在手机 QQ 打开链接：
  https://q.qq.com/qqbot/openclaw/connect.html?task_id=...
```

手机 QQ 扫码授权后，插件自动：

1. 从平台拉取 `appId` + 加密的 `secret`
2. 本地 AES-256-GCM 解密
3. 调 `/users/@me` 获取昵称
4. 写入 `@karinjs/adapter-qqbot/config/config.json`
5. `watch` 回调自动初始化 bot，无需重启

### 方式 B：手动配置

在 [QQ 开放平台](https://bot.q.qq.com/) 创建机器人，记录 `AppID` 与 `Secret`，然后编辑：

`@karinjs/adapter-qqbot/config/config.json`：

```json
[
  {
    "name": "我的机器人",
    "appId": "1234567890",
    "secret": "your-secret",
    "prodApi": "https://api.sgroup.qq.com",
    "sandboxApi": "https://sandbox.api.sgroup.qq.com",
    "tokenApi": "https://bots.qq.com/app/getAppAccessToken",
    "sandbox": false,
    "qqEnable": true,
    "guildEnable": true,
    "guildMode": 0,
    "regex": [{ "reg": "^/", "rep": "#" }],
    "markdown": { "enable": false },
    "keyboard": { "enable": true },
    "event": { "type": 2 }
  }
]
```

保存即生效（`watch` 自动重载）。

---

## 配置项详解

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `name` | string | `""` | 机器人显示名（扫码登录会自动获取） |
| `appId` | string | — | 机器人 AppID（**必填**） |
| `secret` | string | — | 机器人 Secret（**必填**） |
| `prodApi` | string | `https://api.sgroup.qq.com` | 正式环境 API 基址 |
| `sandboxApi` | string | `https://sandbox.api.sgroup.qq.com` | 沙盒环境 API 基址 |
| `tokenApi` | string | `https://bots.qq.com/app/getAppAccessToken` | access_token 获取接口 |
| `sandbox` | boolean | `false` | 是否启用沙盒环境 |
| `qqEnable` | boolean | `true` | 是否处理单聊 / 群聊 |
| `guildEnable` | boolean | `true` | 是否处理频道消息 |
| `guildMode` | `0` \| `1` | `0` | `0` 公域（只接 @ 消息）/ `1` 私域（所有消息） |
| `regex` | object[] | `[{reg:"^/", rep:"#"}]` | 收到消息后对文本执行的正则替换 |
| `markdown.enable` | boolean | `false` | 是否将纯文本/图文消息**自动**转为 markdown 发送 |
| `keyboard.enable` | boolean | `true` | 是否将文本中的 URL **自动**转为 keyboard 按钮 |
| `event.type` | `0` \| `1` \| `2` | `2` | 事件接收方式：0 关闭 / 1 webhook / 2 WebSocket |

---

## 事件接收方式

### WebSocket（推荐，`event.type: 2`）

- 主动连接 QQ 官方 `wss://api.sgroup.qq.com/websocket/`
- 无需公网 IP / HTTPS 证书
- intents 自动探测，从最大权限位逐级回退到可用集合
- **自动 Resume**：断网时记录 `session_id` / `seq`，下次连接走 `op:6` 让服务端补发丢失的事件；服务端拒绝 Resume 时降级 Identify
- 指数退避重连：`1.5s × 2^n + jitter`，上限 30s

### Webhook（`event.type: 1`）

- QQ 主动推送 `POST /qqbot/webhook` 到你的服务
- 自动处理 `op:13` 鉴权回调（签名回包）
- 普通事件用 ed25519 校验签名
- 需要公网 HTTPS：在 QQ 开放平台后台配置「统一回调地址」为 `https://your-domain/qqbot/webhook`

---

## 发送通道

适配器内部按以下规则选择通道，**业务层无感**：

```
含 segment.markdown(...)            → markdown 通道
markdown.enable=true 且无视频/语音    → markdown 通道
其余                                 → 经典通道
```

### 经典通道

- 文本：`msg_type=0`
- 图片 / 视频 / 语音 / 文件：`msg_type=7`（先 `/v2/.../files` 上传换取 `file_info`）
- 文本中带 URL（关闭 `keyboard.enable` 时）：自动转 QR 图，避免链接审核问题

### Markdown 通道

- 文本 + 图片合并为一段 markdown：`![karin #宽px #高px](url)` 内嵌
- 文本中 URL（开启 `keyboard.enable` 时）自动转 `segment.button` 挂载到 `keyboard.content.rows`
- 显式 `segment.markdown(...)` / `segment.keyboard(...)` 直接走此通道

> ⚠️ Markdown 通道不支持视频、语音、文件 —— 这些 element 会被自动 fallback 到经典通道追加发送。

---

## 按钮回调（INTERACTION_CREATE）

收到按钮点击时，适配器：

1. 立即 `PUT /interactions/{id}` `code=0` 回 ack，防止客户端 loading
2. 将事件转为对应场景的消息事件投递：
   - `chat_type=0` → guild message
   - `chat_type=1` → group message
   - `chat_type=2` → friend message
3. 消息 elements 结构：

```ts
[
  segment.at(selfId),       // 群 / 单聊场景自动补
  segment.text(button_data),
  segment.json('{"tag":"qqbot-button-click","button_id":"...","button_data":"...",...}'),
  // srcReply 末尾自动追加 segment.pasmsg(id, 'event')
]
```

业务层通过 `e.rawEvent.t === 'INTERACTION_CREATE'` 区分普通消息与按钮点击。

---

## 群聊消息事件

QQ 官方 2026 起的新版 `GROUP_MESSAGE_CREATE` 报文：

```json
{
  "op": 0, "t": "GROUP_MESSAGE_CREATE",
  "d": {
    "author": {
      "id": "...", "member_openid": "...", "union_openid": "",
      "username": "小布丁qwq", "bot": false
    },
    "content": " /分布 ",
    "group_id": "...", "group_openid": "...",
    "id": "ROBOT1.0_...",
    "mentions": [
      { "is_you": true, "scope": "single", "username": "方舟生存飞升", "...": "..." }
    ],
    "message_scene": { "ext": ["msg_idx=REFIDX_..."], "source": "default" },
    "message_type": 0,
    "timestamp": "2026-05-08T13:24:53+08:00"
  }
}
```

适配器行为：

- 当 `mentions[].is_you === true` 时，elements 头部自动补 `segment.at(self)`
- `author.username` 写入 `sender.nick`
- `cfg.regex` 应用到 content 拆分后的每个文本段
- 原始报文完整保留在 `e.rawEvent`，业务层可访问 `mentions` / `message_scene` / `message_type`

---

## 撤回 / 引用回复 / 被动消息

- **撤回**：`bot.recallMsg(contact, messageId)` —— 自动按场景调用 `/v2/users` / `/v2/groups` / `/channels` / `/dms`
- **引用回复**：传入 `segment.reply(messageId)`，仅附加在第一条消息上
- **被动消息白名单**：
  - 单聊 `event_id` 接受：`INTERACTION_CREATE` / `C2C_MSG_RECEIVE` / `FRIEND_ADD`
  - 群聊 `event_id` 接受：`INTERACTION_CREATE` / `GROUP_ADD_ROBOT` / `GROUP_MSG_RECEIVE`

---

## Web 配置面板

Karin 内置 Web 面板可视化编辑 `config.json`，本插件提供以下控件：

- 基础字段：name / appId / secret / prodApi / sandboxApi / tokenApi
- 沙盒、QQ 场景、频道场景、频道私域模式开关
- 正则规则列表（每行 `<regex> <replacement>`）
- **自动 Markdown** 开关（`markdown.enable`）
- **URL 自动按钮** 开关（`keyboard.enable`）
- 事件接收方式（关闭 / Webhook / WebSocket）

---

## 开发

```bash
git clone https://github.com/KarinJS/karin-plugin-adapter-qqbot.git
cd karin-plugin-adapter-qqbot
pnpm install
pnpm dev          # tsx watch
pnpm build        # tsc + tsdown
```

源码结构（2.0）：

```
src/
├── connection/
│   ├── routing.ts          express 路由聚合
│   ├── webhook.ts          POST /qqbot/webhook
│   ├── transport.ts        事件总线（appId → 业务）
│   └── ws/
│       ├── client.ts       单连接生命周期 + 心跳 + Resume
│       ├── intents.ts      intents 探测与回退
│       └── manager.ts      多 bot 连接管理
├── core/
│   ├── index.ts            createBot / destroyBot / initQQBotAdapter
│   ├── api/                QQBotApi 门面 + http/messages/media/interaction/meta/builders
│   ├── internal/axios.ts   access_token 缓存 + 自动刷新
│   ├── adapter/
│   │   ├── base.ts         AdapterQQBot
│   │   ├── grouping.ts     消息归类
│   │   ├── pipeline-qq.ts  QQ 单聊/群聊发送管线
│   │   ├── pipeline-guild.ts 频道发送管线
│   │   └── text-to-md.ts   URL→ 按钮、图片→ markdown
│   ├── event/
│   │   ├── dispatcher.ts   事件分发器
│   │   ├── message.ts      群/单/频道/私信消息
│   │   ├── notice.ts       入退群/好友/主动消息开关
│   │   ├── interaction.ts  按钮回调
│   │   └── conver.ts       报文 → karin elements
│   └── onboard/
│       ├── crypto.ts       AES-256-GCM 解密
│       ├── portal.ts       q.qq.com 接口
│       ├── qr.ts           终端二维码 + 轮询
│       └── index.ts        runQrOnboard / needQrOnboard
├── types/                  事件、配置、opcode 类型
└── utils/                  日志、配置读写、文本工具
```

---

## 从 1.x 升级

2.0 是破坏式重写，**不提供配置自动迁移**。需要手动调整：

| 1.x | 2.0 |
| --- | --- |
| `markdown.mode: 0` | `markdown.enable: false` |
| `markdown.mode: 1` | `markdown.enable: true` |
| `markdown.mode: 2/3/4/5` (模板) | 已废弃，改为 `markdown.enable: true` |
| `event.wsUrl` / `event.wsToken` | 删除（中转方案已废弃） |
| 新增 | `keyboard.enable: true`（默认） |

完整改动详见 [CHANGELOG.md](./CHANGELOG.md) 2.0.0 段落。

---

## 反馈

- Issue：https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues

---

## License

MIT
