# S08 · API 层

## 目标
- 把 1.x 380 行的 `core/api/index.ts` 拆分到 `messages.ts` / `media.ts` / `interaction.ts` / `sign.ts`；
- 类型按职能聚合，避免 `types.ts` 单文件 290 行；
- 明确 `QQBotApi` 仅做「请求 + 错误归一化」，发送参数构造移交给 pipeline。

## 改动文件

| 文件 | 操作 |
| --- | --- |
| `src/core/api/index.ts` | 重写为「门面 + axios 错误归一化」 |
| `src/core/api/messages.ts` | 新增 |
| `src/core/api/media.ts` | 新增 |
| `src/core/api/interaction.ts` | 新增 |
| `src/core/api/sign.ts` | 保留 + 增 `verifySignature` |
| `src/core/api/types.ts` | 拆分到对应模块下的 `types.ts` 或 `*.d.ts` 之中 |

## QQBotApi 门面

```ts
export class QQBotApi {
  axios: AxiosInstance
  messages: MessagesApi      // sendFriendMsg / sendGroupMsg / sendChannelMsg / sendDmsMsg / recallMsg
  media: MediaApi            // uploadMedia
  interaction: InteractionApi // ack
  meta: MetaApi              // getMe / dms / gateway

  constructor (axios: AxiosInstance) { ... }
}
```

每个子模块都依赖同一个 axios 实例。

## 关键新增

```ts
// core/api/interaction.ts
export class InteractionApi {
  /**
   * 回应按钮回调
   * @param interactionId 事件 ID
   * @param code 0 成功 / 1 失败 / 2 频繁 / 3 重复 / 4 无权限 / 5 仅管理员
   */
  ack (interactionId: string, code: 0 | 1 | 2 | 3 | 4 | 5 = 0): Promise<void>
}
```

```ts
// core/api/messages.ts
export class MessagesApi {
  sendFriendMsg (openid: string, body: SendQQMsg): Promise<SendQQMsgResponse>
  sendGroupMsg (groupOpenid: string, body: SendQQMsg): Promise<SendQQMsgResponse>
  sendChannelMsg (channelId: string, body: SendGuildMsg | FormData): Promise<SendGuildResponse>
  sendDmsMsg (...): Promise<SendGuildResponse>     // 两个重载保留
  recallMsg (scene, peer, messageId, hidetip?): Promise<boolean>
  QQOpts (...): SendQQMsg                          // 等同旧 QQdMsgOptions
  GuildOpts (...): SendGuildMsg                    // 等同旧 GuildMsgOptions
}
```

## 实现步骤

1. 抽出旧 `index.ts` 中 `get/post/put/delete/handleError` 公共方法到 `messages.ts` 不合适，
   因此放回 `index.ts`（门面）的 protected 方法上，子 Api 通过 `super.post(...)` 间接复用，
   或者直接传 axios 实例。
   **推荐方案**：每个子 Api 接受 `axios` 注入，自行实现极薄的 axios 调用，不再共享父类方法 —— 减少耦合。
2. 重写 `types.ts`，按子模块拆分到 `messages/types.ts` / `media/types.ts` / `interaction/types.ts`，
   `core/api/types.ts` 仅做 re-export。
3. 增加 `interaction.ack` 用于 S09。
4. `core/internal/axios.ts` 中 `Authorization` 拦截器保持不变。

## 验收点

- 编译通过；
- pipeline 内只 import `messages`、`media`、`interaction` 子模块，不再 import 单一 `QQBotApi`；
- 错误时统一抛出 `[axios] 请求失败 ...` 多行 message。

## 风险与缓解

- 重构后第三方 import 路径变化：本插件未对外暴露 api 模块，无破坏面。

## 下一步
进入 [S09 · INTERACTION_CREATE](./09-interaction-create.md)。
