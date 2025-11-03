# @karinjs/adapter-qqbot

QQ机器人适配器插件，为 Karin 框架提供 QQ 机器人支持。

## 功能特性

- ✅ 支持 QQ 群聊消息收发
- ✅ 支持 QQ 好友消息收发
- ✅ 支持 QQ 频道消息收发
- ✅ 支持 Webhook、WebSocket 和 LC Webhook-Proxy 三种连接方式
- ✅ 支持无公网IP环境部署（通过 LC Webhook-Proxy）
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

## 快速开始

### 前置要求

- 已安装并配置好 [Karin 框架](https://github.com/KarinJS/Karin)
- Node.js >= 16
- 有QQ开放平台的机器人应用

### 5分钟快速配置

1. **安装插件**
   ```bash
   pnpm add @karinjs/adapter-qqbot -w
   ```

2. **获取机器人信息**
   - 访问 [QQ开放平台](https://bot.q.qq.com/)
   - 创建机器人应用，获取 AppID 和 Secret

3. **创建配置**
   ```json
   [
     {
       "appId": "你的AppID",
       "secret": "你的Secret",
       "event": { "type": 1 }
     }
   ]
   ```

4. **配置回调地址**
   - 在QQ开放平台设置**统一**回调地址：`https://你的域名/qqbot/webhook`
   - **必须使用HTTPS协议**，端口必须为443（默认HTTPS端口）
   - 该地址接收所有事件：群聊、C2C私聊、频道消息等

5. **启动服务**
   ```bash
   npm start
   ```

完成！现在可以邀请机器人到群聊测试了。

## 详细配置指南

### 第一步：获取机器人凭证

1. 访问 [QQ开放平台](https://bot.q.qq.com/)
2. 登录并创建新的机器人应用
3. 获取 `AppID` 和 `Secret`
4. 记录这些信息，后续配置需要用到

### 第二步：创建配置文件

配置文件位置：`@karinjs/@karinjs-adapter-qqbot/config/config.json`

如果文件不存在，插件会自动创建一个空的配置文件。

### 第三步：基本配置

#### 最简配置示例

```json
[
  {
    "appId": "你的机器人AppID",
    "secret": "你的机器人Secret"
  }
]
```

#### 完整配置示例

```json
[
  {
    "appId": "你的机器人AppID",
    "secret": "你的机器人Secret",
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
      "kv": [
        "text_start",
        "img_dec", 
        "img_url",
        "text_end"
      ]
    },
    "event": {
      "type": 1,
      "wsUrl": "",
      "wsToken": ""
    }
  }
]
```

### 第四步：选择事件接收方式

#### 方式一：Webhook（推荐）

**适用场景：** 有公网IP或域名的服务器

1. 在配置文件中设置：
```json
{
  "event": {
    "type": 1
  }
}
```

2. 在QQ开放平台配置回调地址：
   - 回调地址格式：`https://你的域名/qqbot/webhook`
   - 例如：`https://your-domain.com/qqbot/webhook`
   - **⚠️ 重要限制：**
     - 必须使用 **HTTPS** 协议
     - 端口必须为 **443**（标准HTTPS端口）
     - 不支持自定义端口（如:8080、:3000等）
   
> **重要说明：** 这是**统一的回调地址**，QQ开放平台会将所有配置的事件类型（群聊、C2C私聊、频道消息等）都发送到这个地址。您不需要为不同的消息类型配置不同的回调地址。

#### 方式二：WebSocket

**适用场景：** 内网环境，需要通过中转服务连接

1. 在配置文件中设置：
```json
{
  "event": {
    "type": 2,
    "wsUrl": "wss://your-websocket-server/ws",
    "wsToken": "你的ws认证token"
  }
}
```

#### 方式三：LC Webhook-Proxy 中转（推荐新手）

**适用场景：** 没有公网IP，无法配置HTTPS，需要快速部署

**特点**：
- ✅ 无需公网IP或域名
- ✅ 无需配置HTTPS证书
- ✅ 配置简单，5分钟即可完成
- ✅ 支持内网环境
- ✅ 基于开源项目 [lc-cn/webhook-proxy](https://github.com/lc-cn/webhook-proxy)

**快速配置**：

1. 安装 webhook-proxy CLI 工具：
```bash
npm install -g webhook-proxy-cli
```

2. 配置并登录：
```bash
# 配置 API 地址（使用公共服务或自己部署的服务）
webhook-proxy config set-api https://your-webhook-proxy.workers.dev

# 登录（支持GitHub OAuth、GitLab OAuth、用户名密码等多种方式）
webhook-proxy login
```

3. 创建 QQBot Proxy：
```bash
webhook-proxy proxy create
# 选择平台: qqbot
# 输入你的机器人 AppID 和 Secret
# 获取 access_token（请妥善保存！）
```

4. 在 Karin 配置文件中添加：
```json
{
  "event": {
    "type": 3,
    "lcProxy": {
      "apiUrl": "https://your-webhook-proxy.workers.dev",
      "accessToken": "从 CLI 获取的 access_token"
    }
  }
}
```

5. 在 QQ 开放平台配置 webhook URL（从 CLI 获取）：
```
https://your-webhook-proxy.workers.dev/qqbot/{random_key}
```

**详细文档**：[LC_WEBHOOK_PROXY.md](./LC_WEBHOOK_PROXY.md)


### 第五步：反向代理配置（重要）

> **为什么需要反向代理？**
> 
> QQ开放平台对Webhook回调地址有严格要求：
> - **必须使用HTTPS协议**（不支持HTTP）
> - **端口必须为443**（标准HTTPS端口，不支持自定义端口）
> - 必须有有效的SSL证书
> 
> 如果你的Karin服务运行在：
> - 内网服务器（如家用电脑、局域网服务器）
> - 云服务器的内网端口（如3000端口）
> - Docker容器内部
> 
> 就需要通过反向代理将内网服务暴露到公网的443端口，并配置SSL证书。

#### 反向代理的目标

**反向代理要代理的地址：** `http://127.0.0.1:3000/qqbot/webhook`

这是Karin QQBot适配器监听的统一webhook接收地址，用于接收**所有类型**的QQ机器人事件，包括：
- 群聊消息（GROUP_AT_MESSAGE_CREATE）
- C2C私聊消息（C2C_MESSAGE_CREATE）
- 频道消息（GUILD_MESSAGE_CREATE）
- 频道私信（DIRECT_MESSAGE_CREATE）
- 其他机器人事件

QQ开放平台会将所有配置的事件都发送到这个统一的回调地址，然后由适配器内部根据事件类型进行分发处理。

#### 方案一：Nginx 反向代理（推荐）

**1. 安装Nginx**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

**2. 创建配置文件**

创建 `/etc/nginx/sites-available/karin-qqbot`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或公网IP
    
    # QQ机器人webhook接收地址
    location /qqbot/webhook {
        # 代理到本地Karin服务
        proxy_pass http://127.0.0.1:3000/qqbot/webhook;
        
        # 必要的代理头设置
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 关键配置：保持原始请求体用于签名验证
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # 可选：为Karin的其他功能添加代理
    location /karin/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**获取免费SSL证书（Let's Encrypt）：**

```bash
# 1. 安装certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 2. 获取SSL证书（自动配置Nginx）
sudo certbot --nginx -d your-domain.com

# 3. 测试自动续期
sudo certbot renew --dry-run

# 4. 设置自动续期（可选）
sudo crontab -e
# 添加以下行：
# 0 12 * * * /usr/bin/certbot renew --quiet
```

**手动配置SSL证书：**

如果你有其他SSL证书提供商的证书，按以下格式配置：

```nginx
ssl_certificate /path/to/your/certificate.crt;      # 证书文件
ssl_certificate_key /path/to/your/private.key;     # 私钥文件
```

**3. 启用配置**
```bash
# 创建软链接启用站点
sudo ln -s /etc/nginx/sites-available/karin-qqbot /etc/nginx/sites-enabled/

# 测试配置文件语法
sudo nginx -t

# 重载配置
sudo systemctl reload nginx

# 确保Nginx开机自启
sudo systemctl enable nginx
```

**4. 配置HTTPS（必需）**

> **⚠️ 重要：** QQ开放平台**强制要求**使用HTTPS协议和443端口，以下配置是**必需的**，不是可选的。

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL证书配置（使用Let's Encrypt免费证书）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # 如果没有SSL证书，可以使用以下命令获取Let's Encrypt免费证书：
    # sudo apt install certbot python3-certbot-nginx
    # sudo certbot --nginx -d your-domain.com
    
    # SSL优化配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+AESGCM:EDH+AESGCM;
    ssl_prefer_server_ciphers on;
    
    location /qqbot/webhook {
        proxy_pass http://127.0.0.1:3000/qqbot/webhook;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 保持原始请求体
        proxy_buffering off;
        proxy_request_buffering off;
    }
}

# HTTP自动跳转HTTPS（推荐配置）
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

#### 方案二：宝塔面板配置

**1. 创建网站**
- 域名：填写你的域名
- 根目录：可以是任意目录（不会用到）

**2. 配置SSL证书（必需）**
- 进入网站设置 → SSL
- 申请Let's Encrypt免费证书或上传自有证书
- 开启"强制HTTPS"

**3. 添加反向代理**

有两种配置方式，选择其一：

**方式一：代理整个域名到Karin服务**
- **代理名称：** Karin Service
- **目标URL：** `http://127.0.0.1:3000`
- **发送域名：** `$host`
- **代理目录：** `/`

**方式二：只代理webhook路径（推荐）**
- **代理名称：** QQBot Webhook
- **目标URL：** `http://127.0.0.1:3000/qqbot/webhook`
- **发送域名：** `$host`
- **代理目录：** `/qqbot/webhook`

> **推荐使用方式一**，这样整个域名都会指向您的Karin服务，QQ开放平台访问 `https://your-domain.com/qqbot/webhook` 时会被代理到 `http://127.0.0.1:3000/qqbot/webhook`。

**4. 高级设置**
添加以下配置到反向代理的配置文件中：
```nginx
proxy_buffering off;
proxy_request_buffering off;
```

> **重要提醒：** 确保网站已启用HTTPS并强制跳转，QQ开放平台只接受HTTPS协议的回调地址。

#### 方案三：Caddy 服务器

**1. 安装Caddy**
```bash
# 参考官方文档安装Caddy
```

**2. 创建Caddyfile**
```caddy
your-domain.com {
    reverse_proxy /qqbot/webhook/* 127.0.0.1:3000
    
    # 自动HTTPS
    tls {
        on_demand
    }
}
```

#### 方案四：Cloudflare Tunnel（内网穿透）

**适用场景：** 没有公网IP，通过Cloudflare暴露服务

**1. 安装cloudflared**
```bash
# 下载并安装cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

**2. 登录Cloudflare**
```bash
cloudflared tunnel login
```

**3. 创建隧道**
```bash
cloudflared tunnel create karin-qqbot
```

**4. 配置DNS**
```bash
cloudflared tunnel route dns karin-qqbot your-subdomain.your-domain.com
```

**5. 运行隧道**
```bash
cloudflared tunnel run --url http://localhost:3000 karin-qqbot
```

#### 方案五：frp 内网穿透

**适用场景：** 使用自建或第三方frp服务

**客户端配置 (frpc.ini):**
```ini
[common]
server_addr = your-frp-server.com
server_port = 7000
token = your_token

[karin-qqbot]
type = http
local_ip = 127.0.0.1
local_port = 3000
custom_domains = your-domain.com
```

### 第六步：QQ开放平台回调地址要求

#### 官方限制条件

QQ开放平台对Webhook回调地址有以下**强制要求**：

| 要求项 | 限制 | 说明 |
|--------|------|------|
| **协议** | 必须HTTPS | 不支持HTTP协议 |
| **端口** | 必须443 | 不支持自定义端口（如:8080、:3000等） |
| **SSL证书** | 必须有效 | 需要被浏览器信任的证书 |
| **域名** | 必须有域名 | 不支持IP地址直接访问 |
| **响应时间** | 3秒内 | 超时会重试 |

#### 正确的回调地址格式

✅ **正确格式：**
- `https://your-domain.com/qqbot/webhook`
- `https://bot.your-company.com/qqbot/webhook`

❌ **错误格式：**
- `http://your-domain.com/qqbot/webhook` （不支持HTTP）
- `https://your-domain.com:3000/qqbot/webhook` （不支持自定义端口）
- `https://123.456.789.10/qqbot/webhook` （不支持IP地址）

### 第七步：域名和防火墙配置

#### 域名解析配置

确保域名正确解析到你的服务器：
```bash
# 检查域名解析
nslookup your-domain.com
dig your-domain.com
```

#### 防火墙配置

**Ubuntu/Debian (ufw):**
```bash
# 开放HTTP和HTTPS端口
sudo ufw allow 80
sudo ufw allow 443

# 如果直接暴露端口
sudo ufw allow 3000
```

**CentOS/RHEL (firewalld):**
```bash
# 开放端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

**云服务器安全组：**
- 阿里云：安全组规则添加入方向 80、443 端口
- 腾讯云：防火墙规则添加入站 80、443 端口
- AWS：Security Group 添加 HTTP、HTTPS 规则

### 第九步：配置参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `appId` | 机器人ID（必填） | "" |
| `secret` | 机器人密钥（必填） | "" |
| `sandbox` | 是否使用沙盒环境 | false |
| `qqEnable` | 是否启用QQ场景 | true |
| `guildEnable` | 是否启用频道场景 | true |
| `guildMode` | 频道模式（0公域，1私域） | 0 |
| `event.type` | 事件接收方式（0关闭，1webhook，2ws，3lc中转） | 0 |
| `event.lcProxy.apiUrl` | lc webhook-proxy 服务器地址 | - |
| `event.lcProxy.accessToken` | lc webhook-proxy 访问令牌 | - |

#### Markdown 模式说明

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| 0 | 直接发送 | 简单文本和图片消息 |
| 1 | 原生Markdown | 需要富文本格式 |
| 3 | 旧图文模板 | 复杂图文混排 |
| 4 | 纯文模板 | 多段文本消息 |
| 5 | 自定义处理 | 完全自定义逻辑 |

#### 支持的事件类型

QQ机器人适配器通过统一的webhook地址接收以下事件类型：

| 事件类型 | 说明 | 处理函数 |
|---------|------|---------|
| `GROUP_AT_MESSAGE_CREATE` | 群聊@机器人消息 | `onGroupMsg` |
| `C2C_MESSAGE_CREATE` | C2C私聊消息 | `onFriendMsg` |
| `GUILD_MESSAGE_CREATE` | 频道消息 | `onChannelMsg` |
| `DIRECT_MESSAGE_CREATE` | 频道私信 | `onDirectMsg` |

所有这些事件都通过同一个回调地址 `/qqbot/webhook` 接收，适配器内部会根据事件类型自动分发到对应的处理函数。

## 使用说明

### 连接方式说明

#### 1. Webhook 方式

- **优点**：配置简单，直连性能最好
- **缺点**：需要有公网IP或域名，需要配置HTTPS
- **适用场景**：有固定服务器或云服务器的用户

配置完成后，需要在 QQ 开放平台配置 Webhook 回调地址。

#### 2. WebSocket 方式

- **优点**：适合内网环境，通过中转服务连接
- **缺点**：需要额外部署中转服务
- **适用场景**：有自建 WebSocket 中转服务的用户

#### 3. LC Webhook-Proxy 中转方式（推荐新手）

- **优点**：
  - 无需公网IP或域名
  - 无需配置HTTPS证书
  - 配置简单快速（5分钟完成）
  - 支持内网环境
  - 基于 Cloudflare Workers，全球加速
- **缺点**：
  - 增加少量延迟（约50-100ms）
  - 依赖第三方服务（可自行部署）
- **适用场景**：
  - 没有公网IP的家庭网络
  - 快速测试和开发
  - 企业内网环境

详细配置说明请查看：[LC_WEBHOOK_PROXY.md](./LC_WEBHOOK_PROXY.md)

### 连接方式对比

| 特性 | Webhook | WebSocket | LC Webhook-Proxy |
|------|---------|-----------|-----------------|
| 公网IP | 需要 | 不需要 | 不需要 |
| HTTPS证书 | 需要 | 不需要 | 不需要 |
| 配置难度 | 较难 | 中等 | 简单 |
| 延迟 | 最低 | 低 | 较低 |
| 稳定性 | 最高 | 高 | 高 |
| 维护成本 | 中 | 高 | 低 |
| 推荐场景 | 生产环境 | 自建服务 | 快速部署/测试 |

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

### 第十步：验证配置

#### 1. 检查配置文件

确保配置文件格式正确：

```bash
# 查看配置文件
cat @karinjs/@karinjs-adapter-qqbot/config/config.json
```

#### 2. 启动服务

```bash
# 启动 Karin 服务
npm start
# 或者
node app.js
```

#### 3. 查看日志

检查日志文件，确认机器人连接成功：

```bash
# 查看最新日志
tail -f logs/error/*.log
```

正常情况下应该看到类似信息：
- `QQBot [AppID] 连接成功`
- `Webhook服务已启动，端口: 3000`

#### 4. 测试机器人

1. 将机器人邀请到测试群
2. 发送消息测试机器人响应
3. 检查日志确认消息接收正常

### 第十一步：常见问题排查

#### 问题1：Webhook接收不到消息

**检查清单：**
- [ ] QQ开放平台回调地址配置正确
- [ ] 服务器防火墙开放对应端口
- [ ] Nginx反向代理配置正确
- [ ] 域名解析正确指向服务器IP

**排查命令：**
```bash
# 检查端口是否监听
netstat -tlnp | grep :3000

# 检查防火墙状态
sudo ufw status

# 测试本地接口
curl -X POST http://localhost:3000/qqbot/webhook
```

#### 问题2：签名验证失败

**可能原因：**
- Secret配置错误
- 反向代理修改了请求体
- 时间戳差异过大

**解决方案：**
```nginx
# Nginx配置中添加
proxy_buffering off;
proxy_request_buffering off;
```

#### 问题3：消息发送失败

**检查清单：**
- [ ] AppID和Secret正确
- [ ] 机器人有发送消息权限
- [ ] API地址配置正确
- [ ] 网络连接正常

#### 问题4：频道消息收不到

**可能原因：**
- 频道机器人权限不足
- guildEnable配置为false
- 私域机器人未正确配置

**解决方案：**
```json
{
  "guildEnable": true,
  "guildMode": 1  // 私域机器人使用1
}
```

#### 问题5：LC Webhook-Proxy 连接失败

**症状**：日志显示 "lc webhook-proxy WebSocket连接已断开"

**检查清单：**
- [ ] `apiUrl` 配置正确（不要包含 `/qqbot/` 路径）
- [ ] `accessToken` 正确（从 webhook-proxy CLI 获取）
- [ ] webhook-proxy 服务正常运行
- [ ] 网络可以访问 webhook-proxy

**排查命令：**
```bash
# 测试 webhook-proxy 服务
curl https://your-webhook-proxy.workers.dev/health

# 查看 proxy 状态
webhook-proxy list

# 检查配置
webhook-proxy config show
```

**常见错误：**
1. **apiUrl 配置错误**：
   ```json
   // ❌ 错误
   "apiUrl": "https://webhook-proxy.workers.dev/qqbot"
   
   // ✅ 正确
   "apiUrl": "https://webhook-proxy.workers.dev"
   ```

2. **accessToken 过期或错误**：
   - 重新运行 `webhook-proxy proxy create` 获取新的 token
   - 确保复制了完整的 token（以 `proxy_` 开头）

3. **WebSocket 协议错误**：
   - 适配器会自动将 `https://` 转换为 `wss://`
   - 确保 webhook-proxy 支持 WebSocket 连接

**详细故障排查**：请查看 [LC_WEBHOOK_PROXY.md](./LC_WEBHOOK_PROXY.md#故障排查)

#### 问题6：LC Webhook-Proxy 签名验证失败

**症状**：日志显示 "lc webhook-proxy 签名验证失败"

**可能原因：**
- Karin 配置的 `secret` 与 webhook-proxy proxy 的 `webhook_secret` 不一致
- webhook-proxy 未启用签名验证

**解决方案：**
```bash
# 1. 查看当前 proxy 配置
webhook-proxy list

# 2. 确认 webhook_secret 与 Karin 的 secret 一致
# 如果不一致，需要重新创建 proxy：
webhook-proxy proxy delete <proxy-id>
webhook-proxy proxy create
# 创建时确保填入正确的 secret

# 3. 更新 Karin 配置
# 确保 config.json 中的 secret 与 webhook-proxy 一致
```
```json
{
  "guildEnable": true,
  "guildMode": 1  // 私域机器人使用1
}
```

### 第十二步：进阶配置

#### 多机器人配置

```json
[
  {
    "appId": "机器人1的AppID",
    "secret": "机器人1的Secret",
    "event": { "type": 1 }
  },
  {
    "appId": "机器人2的AppID", 
    "secret": "机器人2的Secret",
    "event": { "type": 1 }
  }
]
```

#### 环境分离配置

开发环境使用沙盒：
```json
{
  "sandbox": true,
  "sandboxApi": "https://sandbox.api.sgroup.qq.com"
}
```

生产环境使用正式API：
```json
{
  "sandbox": false,
  "prodApi": "https://api.sgroup.qq.com"
}
```

#### 消息过滤配置

```json
{
  "exclude": [
    "https://example.com",
    "https://trusted-site.com"
  ],
  "regex": [
    {
      "reg": "^/",
      "rep": "#"
    },
    {
      "reg": "\\[图片\\]",
      "rep": ""
    }
  ]
}
```

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
- [LC Webhook-Proxy 项目](https://github.com/lc-cn/webhook-proxy) - 用于实现 type: 3 中转功能

## 技术支持

如有问题，请通过以下方式获取帮助：

- 提交 [GitHub Issue](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues)
- 加入 Karin 开发者社群
