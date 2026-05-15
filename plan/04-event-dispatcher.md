# S04 · 事件分发器

## 目标
- 把 1.x `core/index.ts` 内的 `createEvent` + `eventNameMap` 拆到 `core/event/dispatcher.ts`；
- 明确支持新事件名 `GROUP_MESSAGE_CREATE`（与 `GROUP_AT_MESSAGE_CREATE` 走同一个 handler）；
- 把 `READY` 中拿到的 `session_id` 上交给 `ws/client.ts`，使后续支持 Resume；
- 未识别事件不 `error` 打印整段 JSON（隐私 + 体积），改为 `debug` + 事件名。

## 改动文件

| 文件 | 操作 |
| --- | --- |
| `src/core/event/dispatcher.ts` | 新增 |
| `src/core/index.ts` | 删除 createEvent 部分 |
| `src/core/event/message.ts` | 仅做 handler 输出 |
| `src/core/event/notice.ts` | 同上 |
| `src/core/event/interaction.ts` | 新增（详见 S09） |

## 接口契约

```ts
// core/event/dispatcher.ts
export const dispatch = (
  client: AdapterQQBot,
  ev: GatewayEvent
): void
```

## 事件 → handler 路由表

| EventEnum | Handler | 备注 |
| --- | --- | --- |
| `READY` | `logger.info` + 上交 sessionId | client 监听 |
| `RESUMED` | `logger.info` | |
| `GROUP_AT_MESSAGE_CREATE` | `onGroupMsg(client, ev, { atSelf: true })` | 头部自动补 self at |
| `GROUP_MESSAGE_CREATE` | `onGroupMsg(client, ev, { atSelf: false })` | 根据 mentions.is_you 决定是否补 at |
| `C2C_MESSAGE_CREATE` | `onFriendMsg` | |
| `MESSAGE_CREATE` / `AT_MESSAGE_CREATE` | `onChannelMsg` | |
| `DIRECT_MESSAGE_CREATE` | `onDirectMsg` | |
| `GROUP_ADD_ROBOT` / `GROUP_DEL_ROBOT` | notice handler | |
| `GROUP_MSG_RECEIVE` / `GROUP_MSG_REJECT` | notice handler | |
| `FRIEND_ADD` / `FRIEND_DEL` | notice handler | |
| `C2C_MSG_RECEIVE` / `C2C_MSG_REJECT` | notice handler | |
| `INTERACTION_CREATE` | `onInteraction` | S09 |
| `MESSAGE_AUDIT_PASS` / `MESSAGE_AUDIT_REJECT` | `client.logger('debug', ...)` | 后续接 karin 审核事件 |
| 其他 | `client.logger('debug', '未处理事件: ${ev.t}')` | 不打印 payload |

## 实现步骤

1. 抽 `eventNameMap` 为 const 对象，导出 `eventLabel(t)` 工具。
2. `dispatch(client, ev)` 内：
   - `client.logger('debug', '[事件][${label}]')`；
   - switch 路由到 handler；
   - 对 `READY`：从 `ev.d.session_id` 取出 sessionId 调 `client.adapter.session?.setSessionId(id)`；
     这里给 `AdapterQQBot` 增加一个轻量 `session` 暴露槽位。
3. 修改 `core/index.ts`：
   - `event.on(appId, ev => dispatch(client, ev))` → 改为 `bus.on(appId, ev => dispatch(client, ev))`。

## 验收点

- 用户提供的真实 `GROUP_MESSAGE_CREATE` JSON 投入 `dispatch` 后，调用了 `onGroupMsg`；
- `MESSAGE_AUDIT_*` 走 debug，不再 error 红字；
- 未知事件不再打整段 payload。

## 风险与缓解

- karin 框架是否支持 `MESSAGE_AUDIT_*` 事件类型：如不支持，先 debug 日志，预留 TODO 注释。

## 下一步
进入 [S05 · 报文 → karin 转换](./05-message-conversion.md)。
