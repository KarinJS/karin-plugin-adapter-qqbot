# @karinjs/adapter-qqbot

QQ机器人适配器插件，为 Karin 框架提供 QQ 机器人支持。

## 功能特性

- ✅ 支持 QQ 群聊消息收发
- ✅ 支持 QQ 好友消息收发
- ✅ 支持 QQ 频道消息收发
- ✅ 支持 WebSocket 和 Webhook 两种连接方式
- ✅ 支持多种 Markdown 模板（原生、图文模板、纯文模板）
- ✅ 支持沙盒环境和正式环境
- ✅ 完整的 TypeScript 类型定义
- ✅ 自动消息签名验证

## 安装

### 使用 pnpm（推荐）

```bash
pnpm add @karinjs/adapter-qqbot -w
```

### 使用 npm

```bash
npm install @karinjs/adapter-qqbot
```

### 使用 yarn

```bash
yarn add @karinjs/adapter-qqbot
```

## 配置指南

### 1. 创建配置文件

在 `config/plugin/@karinjs/adapter-qqbot/` 目录下创建 `config.yaml` 文件。

### 2. 基本配置示例

```yaml
# 全局默认配置 - 以下所有配置均可在账号配置中单独覆盖
default:
  # 获取调用凭证的API地址
  accessTokenApi: https://bots.qq.com/app/getAppAccessToken
  # 沙盒环境API地址
  sandBoxApi: https://sandbox.api.sgroup.qq.com
  # 正式环境API地址
  qqBotApi: https://api.sgroup.qq.com
  # 机器人发送模式
  # 0 - 直接发送（默认）
  # 1 - 原生Markdown
  # 3 - 旧图文模板Markdown
  # 4 - 纯文模板Markdown
  # 5 - 自定义处理
  sendMode: 0
  # 是否开启沙盒环境（开发测试用）
  sandBox: false
  # 是否启用频道机器人（暂未完全适配）
  guild: false
  # 频道机器人模式
  # 0 - 公域机器人
  # 1 - 私域机器人
  guildMode: 0

  # Markdown模板ID（仅在sendMode为3或4时有效）
  templateId: ""

  # 旧图文模板Markdown配置
  oldTemplate:
    textStartKey: text_start  # 开头文字键名
    imgDescKey: img_dec       # 图片描述键名
    imgUrlKey: img_url        # 图片地址键名
    textEndKey: text_end      # 结尾文字键名

  # 纯文模板Markdown配置（可配置的文本字段）
  textTemplate:
    - text_0
    - text_1
    - text_2
    - text_3
    - text_4
    - text_5
    - text_6
    - text_7
    - text_8
    - text_9

  # URL转二维码白名单
  # 配置后这些URL将不会被转换为二维码
  exclude: []
  
  # 消息文本正则表达式处理
  # 接收到消息后对文本进行处理
  regex:
    - reg: "^#"    # 正则表达式
      rep: ""      # 替换为的内容

# 账号配置列表
accounts:
  # 账号配置示例（可以配置多个账号）
  default:
    # 机器人ID（必填，必须为字符串）
    appId: "123456789"
    # 机器人密钥（必填）
    secret: "your_bot_secret_here"
    # 机器人发送模式（可选，会覆盖全局配置）
    sendMode: 0
    # URL转二维码白名单（可选，优先级高于全局配置）
    exclude: []
    # 消息文本正则处理（可选，优先级高于全局配置）
    regex: []
```

### 3. Webhook 配置示例

如果使用 Webhook 方式接收事件：

```yaml
accounts:
  bot1:
    appId: "123456789"
    secret: "your_secret"
    # 事件配置
    event:
      type: 1  # 1表示使用Webhook
```

Webhook 地址为：`http://你的服务器地址:端口/qqbot/webhook`

### 4. WebSocket 配置示例

如果使用 WebSocket 方式（需要中转服务）：

```yaml
accounts:
  bot1:
    appId: "123456789"
    secret: "your_secret"
    event:
      type: 2  # 2表示使用WebSocket
      wsUrl: "wss://your-websocket-server/ws"
      wsToken: "your_ws_token"
```

## 使用说明

### 连接方式说明

#### 1. Webhook 方式

- **优点**：配置简单，不需要额外的中转服务
- **缺点**：需要有公网IP或域名
- **适用场景**：有固定服务器或云服务器的用户

配置完成后，需要在 QQ 开放平台配置 Webhook 回调地址。

#### 2. WebSocket 方式

- **优点**：适合内网环境，通过中转服务连接
- **缺点**：需要额外部署中转服务
- **适用场景**：没有公网IP的本地开发环境

### 发送模式说明

#### 模式 0：直接发送（推荐）
最简单的模式，直接发送纯文本和图片消息。

#### 模式 1：原生 Markdown
使用 QQ 官方的原生 Markdown 格式发送消息。

#### 模式 3：旧图文模板 Markdown
使用旧版图文混排模板，适合需要复杂排版的场景。

#### 模式 4：纯文模板 Markdown
使用纯文本模板，支持多个文本字段。

#### 模式 5：自定义处理
完全自定义消息处理逻辑。

## 开发指南

### 环境要求

- Node.js >= 16
- TypeScript >= 5.0
- Karin 框架

### 本地开发

1. 克隆仓库

```bash
git clone https://github.com/KarinJS/karin-plugin-adapter-qqbot.git
cd karin-plugin-adapter-qqbot
```

2. 安装依赖

```bash
npm install
```

3. 开发模式运行

```bash
npm run dev
```

### 构建项目

项目使用 `tsup` 进行打包，同时会运行 `tsc` 进行类型检查。

```bash
npm run build
```

构建产物会输出到 `dist` 目录。

### 代码检查

```bash
npm run lint
```

### 发布

```bash
# 发布正式版
npm run pub

# 发布测试版
npm run pub-beta
```

## 项目结构

```
karin-plugin-adapter-qqbot/
├── src/
│   ├── connection/      # 连接层（WebSocket、Webhook、路由）
│   ├── core/           # 核心功能（适配器、事件处理、API）
│   ├── types/          # TypeScript 类型定义
│   └── utils/          # 工具函数
├── dist/               # 构建产物
├── config/             # 配置文件目录
├── package.json
├── tsconfig.json       # TypeScript 配置
└── tsup.config.ts      # 打包配置
```

## API 使用示例

### 发送群消息

```typescript
import type { AdapterQQBot } from '@karinjs/adapter-qqbot'

// 在你的插件中使用
export class MyPlugin extends plugin {
  async handleGroupMessage(e: KarinMessage) {
    const bot = e.bot as AdapterQQBot
    // 发送消息
    await bot.SendMessage(e.contact, [
      { type: 'text', text: 'Hello, World!' }
    ])
  }
}
```

### 撤回消息

```typescript
await bot.recallMsg(e.contact, messageId)
```

## 常见问题

### Q: Webhook 地址配置后没有收到消息？

A: 请检查：
1. 服务器防火墙是否开放对应端口
2. QQ 开放平台的 Webhook 地址是否配置正确
3. 查看日志是否有签名验证失败的错误

### Q: 编译报错找不到类型定义？

A: 运行 `npm install` 确保所有依赖已安装。

### Q: 如何获取机器人的 AppID 和 Secret？

A: 前往 [QQ 开放平台](https://bot.q.qq.com/) 创建机器人后即可获取。

## 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本更新历史。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

本项目基于 [项目许可证] 开源。

## 相关链接

- [Karin 框架](https://github.com/KarinJS/Karin)
- [QQ 机器人开放平台](https://bot.q.qq.com/)
- [QQ 机器人开发文档](https://bot.q.qq.com/wiki/)

## 技术支持

如有问题，请通过以下方式获取帮助：
- 提交 [GitHub Issue](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues)
- 加入 Karin 开发者社群
