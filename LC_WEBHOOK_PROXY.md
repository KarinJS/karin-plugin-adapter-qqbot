# LC Webhook-Proxy 中转服务适配指南

## 简介

本适配器支持通过 [lc-cn/webhook-proxy](https://github.com/lc-cn/webhook-proxy) 中转服务来接收 QQ 机器人事件。这对于没有公网 IP 或无法配置 HTTPS 的环境特别有用。

## 什么是 webhook-proxy？

webhook-proxy 是一个开源的 webhook 代理服务，基于 Hono 框架和 Cloudflare Workers 构建。它可以将 webhook 事件实时转换为 WebSocket 或 SSE 事件流。

### 主要特性

- ✅ **多平台支持**：GitHub、GitLab、QQBot、Telegram、Stripe、Jenkins、Jira、Sentry、Generic
- ✅ **实时推送**：WebSocket 和 SSE 双模式支持
- ✅ **安全认证**：GitHub/GitLab OAuth 登录
- ✅ **双因素认证**：TOTP (Google Authenticator) + WebAuthn/Passkey
- ✅ **签名验证**：支持各平台的 webhook 签名验证
- ✅ **高性能**：基于 Cloudflare Workers，全球 CDN 边缘计算

## 使用场景

### 适合使用 lc 中转的场景

1. **没有公网 IP**：家庭网络或内网环境
2. **无法配置 HTTPS**：没有域名或 SSL 证书
3. **防火墙限制**：企业网络环境有严格的入站限制
4. **快速测试**：开发环境快速测试机器人功能
5. **多环境部署**：在多个环境中使用同一个机器人

### 不适合使用的场景

1. **已有公网 HTTPS 服务器**：直接使用 webhook 方式更简单
2. **对延迟要求极高**：中转会增加少量延迟（通常 < 100ms）
3. **安全要求极高**：虽然 webhook-proxy 支持签名验证，但直连更安全

## 配置步骤

### 第一步：部署 webhook-proxy 服务

您有两个选择：

#### 选项 1：使用公共服务（推荐用于测试）

如果有公开的 webhook-proxy 服务可用，可以直接使用。

#### 选项 2：自己部署（推荐用于生产）

详细部署步骤请参考 [webhook-proxy 官方文档](https://github.com/lc-cn/webhook-proxy#%E9%83%A8%E7%BD%B2%E6%8C%87%E5%8D%97)。

快速部署到 Cloudflare Workers：

```bash
# 1. 克隆项目
git clone https://github.com/lc-cn/webhook-proxy.git
cd webhook-proxy

# 2. 安装依赖
pnpm install

# 3. 登录 Cloudflare
npx wrangler login

# 4. 创建数据库和配置
# 按照官方文档配置 D1 数据库、KV 存储和环境变量

# 5. 部署
pnpm deploy
```

部署完成后，你会得到一个类似 `https://webhook-proxy.your-subdomain.workers.dev` 的地址。

### 第二步：安装 CLI 工具（推荐）

webhook-proxy 提供了便捷的 CLI 工具来管理 proxy：

```bash
npm install -g webhook-proxy-cli
```

或使用源码：

```bash
cd webhook-proxy/packages/cli
pnpm build
pnpm link --global
```

### 第三步：登录并创建 Proxy

#### 1. 配置 API 地址

```bash
webhook-proxy config set-api https://your-webhook-proxy.workers.dev
```

#### 2. 登录

CLI 支持多种登录方式：

```bash
webhook-proxy login
```

选择您喜欢的方式：
- 🔐 **GitHub OAuth**（推荐）
- 🦊 **GitLab OAuth**
- 👤 **用户名/邮箱 + 密码**
- 🔑 **Passkey / 指纹 / Face ID**
- 📋 **手动输入 Token**

#### 3. 创建 QQBot Proxy

```bash
webhook-proxy proxy create
```

按提示操作：
1. 选择平台：选择 `qqbot`
2. 输入名称：例如 `my-qqbot`
3. 输入描述：例如 `测试机器人`
4. 输入 platform_app_id：填入你的 QQ 机器人 AppID
5. 是否启用签名验证：选择 `是`（推荐）
6. 输入 webhook_secret：填入你的 QQ 机器人 Secret

创建成功后，CLI 会显示：
- `random_key`：随机密钥（用于 webhook URL）
- `access_token`：访问令牌（用于 WebSocket 连接）
- `webhook_url`：Webhook 地址（需要配置到 QQ 开放平台）

**重要**：请妥善保存 `access_token`，它只显示一次！

#### 4. 查看 Proxy 列表

```bash
webhook-proxy list
```

### 第四步：配置 QQ 开放平台

1. 登录 [QQ 开放平台](https://bot.q.qq.com/)
2. 进入你的机器人应用
3. 配置 Webhook 回调地址为：
   ```
   https://your-webhook-proxy.workers.dev/qqbot/{random_key}
   ```
   （将 `{random_key}` 替换为创建 proxy 时生成的值）

### 第五步：配置 Karin QQBot 适配器

在配置文件 `@karinjs/@karinjs-adapter-qqbot/config/config.json` 中添加：

```json
[
  {
    "appId": "你的机器人AppID",
    "secret": "你的机器人Secret",
    "event": {
      "type": 3,
      "lcProxy": {
        "apiUrl": "https://your-webhook-proxy.workers.dev",
        "accessToken": "从 webhook-proxy CLI 获取的 access_token"
      }
    }
  }
]
```

### 配置说明

| 参数 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `event.type` | 是 | 设置为 `3` 启用 lc 中转 | `3` |
| `event.lcProxy.apiUrl` | 是 | webhook-proxy 服务器地址 | `https://webhook-proxy.workers.dev` |
| `event.lcProxy.accessToken` | 是 | 从 CLI 获取的访问令牌 | `proxy_xxxxxxxxxxxxxx` |

### 完整配置示例

```json
[
  {
    "appId": "123456789",
    "secret": "your-bot-secret",
    "prodApi": "https://api.sgroup.qq.com",
    "sandboxApi": "https://sandbox.api.sgroup.qq.com",
    "tokenApi": "",
    "sandbox": false,
    "qqEnable": true,
    "guildEnable": true,
    "guildMode": 0,
    "exclude": [],
    "regex": [
      {
        "reg": "^/",
        "rep": "#"
      }
    ],
    "markdown": {
      "mode": 0,
      "id": "",
      "kv": []
    },
    "event": {
      "type": 3,
      "wsUrl": "",
      "wsToken": "",
      "lcProxy": {
        "apiUrl": "https://your-webhook-proxy.workers.dev",
        "accessToken": "proxy_xxxxxxxxxxxxxx"
      }
    }
  }
]
```

### 第六步：启动 Karin

```bash
npm start
```

如果配置正确，你会看到类似的日志：

```
[QQBot] 123456789: lc webhook-proxy WebSocket连接已打开: wss://your-webhook-proxy.workers.dev/qqbot/proxy_xxx/ws
```

## 工作原理

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  QQ开放平台  │         │  webhook-proxy   │         │  Karin 适配器   │
│             │         │   (Cloudflare)   │         │   (本地/内网)   │
└─────────────┘         └──────────────────┘         └─────────────────┘
       │                        │                             │
       │  1. 发送 webhook       │                             │
       ├───────────────────────>│                             │
       │                        │                             │
       │  2. 验证签名           │                             │
       │     存储事件           │                             │
       │                        │  3. 通过 WebSocket 推送     │
       │                        ├────────────────────────────>│
       │                        │                             │
       │                        │  4. 验证签名                │
       │                        │     处理事件                │
       │                        │                             │
       │  5. 返回 200 OK        │                             │
       │<───────────────────────┤                             │
       │                        │                             │
```

### 关键步骤

1. **QQ 开放平台**发送 webhook 到 webhook-proxy
2. **webhook-proxy** 验证签名，并将事件存储
3. **webhook-proxy** 通过 WebSocket 实时推送事件到 Karin
4. **Karin 适配器**再次验证签名（双重验证），确保安全
5. webhook-proxy 返回 200 OK 给 QQ 开放平台

### 安全机制

1. **双重签名验证**：
   - webhook-proxy 验证 QQ 开放平台的签名
   - Karin 适配器再次验证签名

2. **访问令牌认证**：
   - WebSocket 连接需要有效的 access_token
   - 令牌与特定 proxy 绑定

3. **HTTPS 加密**：
   - QQ 开放平台到 webhook-proxy: HTTPS
   - webhook-proxy 到 Karin: WSS (WebSocket Secure)

## 高级配置

### 多机器人配置

可以为不同的机器人配置不同的 webhook-proxy 服务：

```json
[
  {
    "appId": "bot1",
    "secret": "secret1",
    "event": {
      "type": 3,
      "lcProxy": {
        "apiUrl": "https://proxy1.example.com",
        "accessToken": "token1"
      }
    }
  },
  {
    "appId": "bot2",
    "secret": "secret2",
    "event": {
      "type": 3,
      "lcProxy": {
        "apiUrl": "https://proxy2.example.com",
        "accessToken": "token2"
      }
    }
  }
]
```

### 混合模式

可以同时使用不同的事件接收方式：

```json
[
  {
    "appId": "bot1",
    "event": {
      "type": 1  // 生产环境使用 webhook
    }
  },
  {
    "appId": "bot2",
    "event": {
      "type": 3,  // 测试环境使用 lc 中转
      "lcProxy": {
        "apiUrl": "https://webhook-proxy.workers.dev",
        "accessToken": "test-token"
      }
    }
  }
]
```

## 故障排查

### 1. WebSocket 连接失败

**症状**：日志显示连接错误或无法建立连接

**检查清单**：
- [ ] `apiUrl` 是否正确（注意不要包含路径，只需要域名）
- [ ] `accessToken` 是否正确
- [ ] webhook-proxy 服务是否正常运行
- [ ] 网络是否可以访问 webhook-proxy 服务

**解决方案**：
```bash
# 测试连接
curl https://your-webhook-proxy.workers.dev/health

# 检查 proxy 状态
webhook-proxy list
```

### 2. 签名验证失败

**症状**：日志显示 "签名验证失败"

**可能原因**：
- Secret 配置错误
- webhook-proxy 中的 webhook_secret 与 Karin 配置不一致
- 时间戳差异过大

**解决方案**：
1. 确认 `secret` 配置正确
2. 确认 webhook-proxy proxy 配置中的 `webhook_secret` 与 Karin 的 `secret` 一致
3. 检查服务器时间是否同步：
   ```bash
   date
   # 如果时间不对，同步时间
   sudo ntpdate ntp.ubuntu.com
   ```

### 3. 收不到事件

**症状**：webhook-proxy 和 Karin 都启动了，但收不到事件

**检查清单**：
- [ ] QQ 开放平台的 webhook URL 是否配置正确
- [ ] webhook-proxy 的 proxy 是否处于 active 状态
- [ ] Karin 的 WebSocket 连接是否建立成功

**调试步骤**：
```bash
# 1. 检查 proxy 状态
webhook-proxy list

# 2. 测试 webhook（模拟 QQ 开放平台请求）
curl -X POST https://your-webhook-proxy.workers.dev/qqbot/{random_key} \
  -H "Content-Type: application/json" \
  -H "User-Agent: QQBot-Callback" \
  -H "x-bot-appid: your-appid" \
  -H "x-signature-ed25519: test" \
  -H "x-signature-timestamp: $(date +%s)" \
  -d '{"op":0,"t":"TEST","d":{"test":true}}'

# 3. 查看 Karin 日志
tail -f logs/error/*.log
```

### 4. WebSocket 频繁断开重连

**症状**：日志显示连接不断断开和重连

**可能原因**：
- 网络不稳定
- webhook-proxy 服务重启或更新
- Cloudflare Workers 限制

**解决方案**：
- 适配器已内置自动重连机制（5秒后重连）
- 适配器已内置心跳保活机制（30秒一次）
- 如果持续出现，检查网络连接或 webhook-proxy 服务状态

### 5. 性能问题

**症状**：事件处理延迟较高

**优化建议**：
1. **选择就近的 webhook-proxy 服务**：
   - 如果自己部署，选择离你更近的 Cloudflare 数据中心
   
2. **监控延迟**：
   ```bash
   # 检查到 webhook-proxy 的网络延迟
   ping your-webhook-proxy.workers.dev
   ```

3. **升级 Cloudflare 套餐**：
   - Workers 免费套餐有每日请求限制
   - 付费套餐有更高的 CPU 时间和并发限制

### 6. CLI 工具问题

**问题**：无法通过 CLI 创建 proxy

**解决方案**：
```bash
# 检查 CLI 配置
webhook-proxy config show

# 重新登录
webhook-proxy logout
webhook-proxy login

# 手动输入 token 方式登录
webhook-proxy login
# 选择 "手动输入 Token"
```

## 性能对比

| 指标 | Webhook 直连 | lc 中转 | 说明 |
|------|-------------|---------|------|
| **延迟** | 50-200ms | 100-300ms | 中转增加 50-100ms |
| **稳定性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 依赖 webhook-proxy 稳定性 |
| **配置难度** | 困难 | 简单 | 需要公网 IP + HTTPS vs 只需要访问令牌 |
| **安全性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 双重签名验证 |
| **扩展性** | 一般 | 优秀 | webhook-proxy 基于 Cloudflare Workers |

## 常见问题 (FAQ)

### Q1: lc 中转和普通 WebSocket 有什么区别？

**A**: 
- **普通 WebSocket (type: 2)**：需要自己搭建 WebSocket 中转服务
- **lc 中转 (type: 3)**：使用 webhook-proxy 提供的中转服务，无需自己搭建

### Q2: access_token 丢失了怎么办？

**A**: 需要重新创建 proxy：
```bash
# 删除旧的 proxy
webhook-proxy proxy delete <proxy-id>

# 创建新的 proxy
webhook-proxy proxy create
```
然后更新 Karin 配置和 QQ 开放平台的 webhook URL。

### Q3: 可以多个 Karin 实例共用一个 proxy 吗？

**A**: 不建议。每个 Karin 实例应该有自己独立的 proxy，这样：
- 避免事件重复处理
- 便于监控和调试
- 提高安全性

### Q4: webhook-proxy 会记录我的机器人消息吗？

**A**: webhook-proxy 只转发事件，不会永久存储消息内容。但为了安全考虑：
- 建议使用自己部署的 webhook-proxy 服务
- 启用签名验证
- 定期更新 access_token

### Q5: 为什么叫 "lc 中转"？

**A**: 因为这个 webhook-proxy 项目是由 GitHub 用户 [@lc-cn](https://github.com/lc-cn) 开发的。

### Q6: 可以在生产环境使用吗？

**A**: 可以，但建议：
- 使用自己部署的 webhook-proxy 服务
- 启用 MFA/2FA 保护账号
- 定期检查和更新凭据
- 监控服务状态和性能

## 参考链接

- [webhook-proxy 官方文档](https://github.com/lc-cn/webhook-proxy)
- [webhook-proxy CLI 工具](https://github.com/lc-cn/webhook-proxy/tree/master/packages/cli)
- [QQ 机器人开放平台](https://bot.q.qq.com/)
- [QQ 机器人开发文档](https://bot.q.qq.com/wiki/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)

## 更新日志

### v1.4.0 (2025-01-03)
- ✨ 新增 lc webhook-proxy 中转支持 (type: 3)
- ✨ 支持通过 WebSocket 接收 webhook-proxy 转发的事件
- ✨ 内置心跳保活机制
- ✨ 双重签名验证保证安全性
- ✨ 自动重连机制

## 贡献

欢迎提交 Issue 和 Pull Request！

- 提出建议：[GitHub Issues](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues)
- 贡献代码：[Pull Requests](https://github.com/KarinJS/karin-plugin-adapter-qqbot/pulls)

## 许可证

本项目基于 MIT 许可证开源。
