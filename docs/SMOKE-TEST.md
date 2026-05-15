# 2.0 烟测指引

测试目标：在真号 + 沙盒/正式环境上验证 2.0 重写后的核心路径，确保上线前没有
回归问题。配合 `src/apps/qqtest.ts` 提供的测试命令。

---

## 前置准备

### 1. 拿到机器人

**方式 A（推荐）：扫码登录**

```bash
# 确保 config/config.json 是空数组 []，或者根本不存在
pnpm dev
```

观察控制台，扫描二维码，使用一个**专门用作测试**的 QQ 号扫码授权。
插件会自动写入 `appId` / `secret` 到 `config/config.json` 并热加载。

> 注意：扫码授权的 QQ 必须是开发者账号。

**方式 B：手动配置**

参考 README 「方式 B」段落，手动填入 `config.json`。

### 2. 把机器人拉进群 / 加为好友

- 在 QQ 开放平台找到机器人，扫码加好友 或 拉机器人进群
- 若 `event.type=2`（WebSocket，默认），无需配置回调地址
- 若 `event.type=1`（Webhook），需在开放平台配置：`https://你的域名/qqbot/webhook`

---

## 测试用例清单

> 所有命令都以 `#qqtest` 开头（也支持无 `#`，匹配为不区分大小写）。
> 群聊场景需先 `@机器人` 触发 `GROUP_AT_MESSAGE_CREATE`，或开启 `GROUP_MESSAGE_CREATE`
> 后无需 at 也能触发。

### 基础事件流

| # | 操作 | 预期 |
| --- | --- | --- |
| 1 | `#qqtest help` | 返回命令清单文本 |
| 2 | `#qqtest who` | 返回 sender / contact 摘要，**`senderNick` 应为发送者群昵称** |
| 3 | `#qqtest event` | 返回 raw 摘要，确认含 `d.author.username` / `d.mentions` / `d.message_scene` / `d.message_type` |

✅ 通过条件：`who` 里 `senderNick` 非 `unknown`；`event` 里 `mentions[].is_you=true`（at 触发时）。

### 发送通道

| # | 配置 | 命令 | 预期 |
| --- | --- | --- | --- |
| 4 | `markdown.enable=false` | `#qqtest text` | 一条普通文本，QQ 客户端正常显示 |
| 5 | `markdown.enable=true` | `#qqtest text` | 同上文本被合成为 markdown 一行 |
| 6 | 任意 | `#qqtest md` | 显式 markdown，标题/加粗/列表正确渲染 |
| 7 | 任意 | `#qqtest btn` | 一条 markdown + 两个回调按钮 |
| 8 | 任意 | `#qqtest image` | 文本 + 图片（github avatar） |
| 9 | `keyboard.enable=true` | `#qqtest urls` | 文本里的 URL 被替换为「请点击 按钮N 查看」，下方挂 3 个跳转按钮 |
| 10 | `keyboard.enable=false` | `#qqtest urls` | 文本里的 URL 被替换为「请扫码查看」，下方多一张合成 QR 图 |

✅ 通过条件：第 7 步 button 渲染在 markdown 下方；第 9/10 步开关切换有不同表现。

### 引用 / 撤回

| # | 命令 | 预期 |
| --- | --- | --- |
| 11 | `#qqtest reply` | 收到 bot 回复消息，带「引用了你刚发的消息」气泡 |
| 12 | `#qqtest recall` | 收到「这条消息将在 3 秒后撤回」，3s 后该消息变为「已撤回」灰条 |

✅ 通过条件：群与单聊均可生效；撤回失败时控制台有错误日志。

### 按钮回调（INTERACTION_CREATE 闭环）

| # | 操作 | 预期 |
| --- | --- | --- |
| 13 | 完成第 7 步，点击「回调 A」 | 客户端按钮 loading 立即消失（ack 成功），bot 回复 `收到按钮点击：button_id=... button_data=qqtest:cb-a scene=group` |
| 14 | 在 1.0 旧版上同样测一遍（参考） | 1.0 不支持 INTERACTION_CREATE，**2.0 必须可以** |

✅ 通过条件：按钮 ack 成功（无 loading 卡死）；业务层确实收到带 `rawEvent.t === 'INTERACTION_CREATE'` 的消息事件。

### WebSocket Resume

| # | 操作 | 预期 |
| --- | --- | --- |
| 15 | 启动并保持连接 30s | 控制台 `WebSocket opened` + `Identify sent, intents=...` + intents 探测汇总日志（仅一次） |
| 16 | 拔网线 / 阻断网络 5 ~ 10s 后恢复 | 控制台 `WebSocket 断开 (closed)，1500ms 后重连...` → `Resume sent, session=..., seq=...` → 若服务端接受，收到 `RESUMED` 事件，日志「连接已恢复」 |
| 17 | 切换 `event.type` 字段（2 → 0）保存 | 旧 WS 立即关闭，无重连日志；token 刷新计时器也停止 |
| 18 | 重新切回 `event.type=2` | 重新建立连接 + 重新 Identify |

✅ 通过条件：第 16 步看到 `Resume sent` 而非全新 `Identify sent`；第 17 步不再有「重连」日志。

### Webhook（可选，需公网）

| # | 操作 | 预期 |
| --- | --- | --- |
| 19 | 配置 `event.type=1`，开放平台填入 webhook 地址 | 首次推送 op:13 时控制台 `[webhook][appid] sign=...` 一行，平台显示已通过校验 |
| 20 | 给机器人发普通消息 | 控制台收到事件并触发 `qqtest:*` 命令；签名校验通过 |
| 21 | 用错误的 secret 重启再发 | 控制台红字「签名验证失败」，事件不触发 |

✅ 通过条件：op:13 鉴权回包 200；ed25519 校验对错都按预期处理。

### 多账号 / 热重载（可选）

| # | 操作 | 预期 |
| --- | --- | --- |
| 22 | `config.json` 加入第 2 个机器人配置保存 | 控制台 `[配置监听] 配置已变更`，初始化第 2 个 bot 不影响第 1 个 |
| 23 | 移除第 2 个机器人 | 第 2 个 bot 注销 + WS 关闭 + token 停刷；第 1 个继续工作 |

---

## 失败排查

| 现象 | 怀疑点 | 检查 |
| --- | --- | --- |
| `获取 access_token 失败` | secret 错 / tokenApi 不通 | 直接 curl 测试 `tokenApi` |
| `鉴权失败，所有 intents 均不可用` | 机器人未上线 / 未开通对应权限 | 开放平台后台「在线状态」+「事件订阅」 |
| 按钮点击客户端 loading 不消失 | ack 调用失败 | 查 `[INTERACTION] ack 失败` 日志 |
| Resume 后丢消息 | 服务端拒绝 Resume → 降级 Identify 是预期 | 看 `Invalid session, will retry with fresh identify` |
| 文本里 URL 没转按钮 | `keyboard.enable=false` 或文本中 URL 数 = 0 | 检查 cfg + URL 正则 |
| 收到 `MESSAGE_AUDIT_*` 没处理 | karin 暂无对应事件类型，debug 日志即可 | 看 `消息审核通过/不通过` debug 日志 |

---

## 自动化（远景）

当前 2.0 没有 unit test。后续可加：

- `vitest` 单元测试：`conver.ts`、`grouping.ts`、`text-to-md.ts` 都是纯函数易测
- `nock` 拦截 axios 测试 `messages` / `media` / `interaction` 三个子 API
- mock WebSocket server 测试 `ws/client.ts` 的 Hello → Identify → Resume 流程

目前没做，依赖人工烟测覆盖。
