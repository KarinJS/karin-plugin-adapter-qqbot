# S03 · Webhook 接入层

## 目标
- 保留 1.x 现有 webhook 鉴权（`op:13` 回包 + ed25519 校验）；
- 把签名校验逻辑下沉到 `core/api/sign.ts`，让 webhook 文件只负责 HTTP I/O；
- 用统一的 `bus.dispatch(appId, event)` 取代散落的 `event.emit`；
- 把 `appid` / `User-Agent` 检查抽成单元可测函数。

## 改动文件

| 文件 | 操作 |
| --- | --- |
| `src/connection/webhook.ts` | 重写 |
| `src/connection/routing.ts` | 保持，增加一行 `body-parser raw` 中间件以确保 rawBody 可读 |
| `src/connection/transport.ts` | 已在 S02 新增，本阶段消费 |

## 行为

```
[POST /qqbot/webhook]
   │
   ▼
 checkRequest(req) → { appid, rawBody, parsed }
   │
   ▼
 if parsed.op === 13:
     signature = sign(secret, eventTs, plainToken)
     return res.json({ plain_token, signature })
   │
   ▼
 verifySignature(secret, ts, rawBody, headerSig)
   │
   ▼
 bus.dispatch(appid, parsed)        ← 与 WS 路径完全一致
 res.status(204).end()              ← 3s 内必须返回 200/204
```

## 实现步骤

1. 把 `checkAppid` 拆为两段：
   - `parseRequest(req)`：读 rawBody + JSON 解析 + 基本字段校验，不做副作用；
   - `respond200(res)`：抽统一的 fast-200 响应方法（包括 op=13 时不要先 200）。
2. `verifySignature` 抽到 `core/api/sign.ts` 暴露：
   ```ts
   export const verifySignature = (
     secret: string, timestamp: string, rawBody: string, ed25519: string
   ): boolean
   ```
3. webhook.ts 内部按上面流程编排，所有打印走 `log.*`，伪事件继续用 `fakeEvent` 红字告警。
4. 删除 `op===13` 路径里 `response = false` 这种 finally 状态机，改为「直接 return 在 res 上写好」。

## 验收点

- 用 `curl` 模拟 op=13，返回里包含正确 `plain_token`/`signature`；
- 用合法 ed25519 签名的群事件请求，`bus.dispatch` 能触发，并在 karin 内出现群消息事件；
- 错误签名请求被 fakeEvent 红字打印，且响应 200（QQ 要求必须 3s 内返回 2xx）；
- 单元层面 `parseRequest` 可在 jest 风格断言（即便项目暂未引入测试框架，也保证函数纯净易测）。

## 风险与缓解

- **rawBody 读取与 Express body-parser 冲突**：要在 `app.use('/qqbot', json())` 前接管路由，
  或显式禁用对 `/qqbot/webhook` 的 json 解析。S03 的 routing.ts 内显式添加 `express.raw()` 路由。

## 下一步
进入 [S04 · 事件分发器](./04-event-dispatcher.md)。
