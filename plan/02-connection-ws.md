# S02 · WebSocket 接入层

## 目标
将旧 `src/connection/webSocket.ts`（280+ 行单文件）拆分为：
- `connection/ws/client.ts` —— 单连接生命周期（连接、心跳、Resume、关闭）
- `connection/ws/intents.ts` —— intents 计算与探测回退
- `connection/ws/manager.ts` —— 多 bot 连接缓存
- `connection/transport.ts` —— 事件总线层（emit appId → 业务）

并修复 1.x 已知问题：
- 重连未携带 session_id / seq（不能 Resume，只能重新 Identify）。
- Intents 探测日志混乱，多 bot 时容易交叉。
- `setTimeout` 重连无 jitter，断网时多个 bot 同步雪崩。

## 改动文件

| 文件 | 操作 |
| --- | --- |
| `src/connection/webSocket.ts` | 删除 |
| `src/connection/ws/client.ts` | 新增 |
| `src/connection/ws/intents.ts` | 新增 |
| `src/connection/ws/manager.ts` | 新增 |
| `src/connection/transport.ts` | 新增（也可保留在 utils/common.ts，但建议独立） |
| `src/core/index.ts` | 替换为新 manager API |
| `src/utils/config.ts` | 删除对 `stopWebSocketConnection` 的旧导入 |

## 接口契约

```ts
// connection/ws/client.ts
export interface WSClientOptions {
  appId: string
  apiBase: string                 // prodApi / sandboxApi
  accessTokenProvider: () => string
  intents: number
  onEvent: (raw: unknown) => void
  onClose: (reason: 'normal' | 'reconnect' | 'auth_fail' | 'error') => void
}
export interface WSClient {
  start (): Promise<void>
  stop (): void
  /** 用于 Resume 恢复 */
  snapshot (): { sessionId: string; seq: number }
}
```

```ts
// connection/ws/intents.ts
export const ALL_INTENTS = [/* bit 列表 */]
export const computeMax = (): number
export const computeFallback = (curr: number): number
export const formatIntentNames = (intents: number): string
```

```ts
// connection/ws/manager.ts
export const start (cfg: QQBotConfig): Promise<void>
export const stop (appId: string): boolean
export const reload (cfg: QQBotConfig): Promise<void>   // stop then start
```

```ts
// connection/transport.ts
export const bus = new EventEmitter()
export const dispatch (appId: string, ev: GatewayEvent): void
```

## 实现步骤

1. **拆 client.ts**
   - 把 `socket.on('open' / 'message' / 'close' / 'error')` 全部封装到一个 `WSClient` 类里。
   - `Hello (op:10)` → 启心跳，发 `Identify(op:2)`；首次 Resume 时改发 `Resume(op:6)`。
   - 用 `setTimeout` 重连改为「指数回退 + jitter」，上限 30s。
   - 关闭时通过 `onClose(reason)` 把原因告知 manager，由 manager 决定要不要重连。
2. **拆 intents.ts**
   - 把 `intentBitMap` / `formatIntentNames` / `computeIntents` / `computeFallbackIntents` 抽到这里；
   - 探测日志只在 Manager 调用层打印一次（避免每个 client 重复打）。
3. **manager.ts**
   - 缓存 `Map<appId, { client: WSClient; cfg: QQBotConfig; intents: number }>`；
   - `start(cfg)`：构造 `accessTokenProvider`、解析 `prodApi/sandboxApi`，第一次用 max intents；
     收到 `auth_fail` 后逐级 fallback，达到 0 时报错；
   - `stop(appId)`：标记 `manual=true`，调用 `client.stop()`，并禁止重连；
   - `reload(cfg)`：先 stop 再 start，复用旧 sessionId 以便走 Resume。
4. **transport.ts**
   - 全局 `EventEmitter`，业务层（core/event/dispatcher.ts）`bus.on(appId, handler)`；
   - 替换旧 `utils/common.ts` 的 `event` 导出（保留兼容别名 1 个版本后删除）。
5. **core/index.ts**：把直连 `createWebSocketConnection` 改为 `ws.start(cfg)`。

## Resume 流程（新增）

```
Hello → Identify → READY (记录 session_id, seq)
                ↓
            正常事件
                ↓
   断开（非主动） → 重连 → Hello → Resume(op:6, session_id, seq) → 服务端补发 → RESUMED
                                                            ↘ 服务端拒绝 → InvalidSession → 回退为 Identify
```

## 验收点

- 单 bot 在 sandbox 上完成一次主动断网（kill 网络 10s）后能自动 Resume 成功；
- 多 bot intents 探测日志互不交叉，每个 bot 仅一条汇总；
- 关闭某 bot 配置（type=0）后，相应连接立即停止且不重连；
- `manager.reload` 触发后日志显示 stop → start 顺序，新连接拿到 READY。

## 风险与缓解

- **Resume 不可用时**：服务端可能直接踢 session，需要兼容 InvalidSession 时全新 Identify。
- **JWT/accessToken 过期 1 分钟内会自动刷新**：保持原 `getAccessToken` 行为，但 client 中通过 `accessTokenProvider()` 每次读取最新值，避免使用旧 token Identify。

## 下一步
进入 [S03 · Webhook 接入层](./03-connection-webhook.md)。
