# S09 · INTERACTION_CREATE 按钮回调

## 目标
- 接收并解析 `INTERACTION_CREATE` 事件，调用 `PUT /interactions/{interaction_id}` 回应；
- 将按钮点击事件落到 karin —— 1.x 是 TODO 状态；2.0 至少做一种「能用」的对接方案；
- 对接策略：转成一条「群消息 / 单聊消息 / 频道消息」事件投递，使用 `segment.button` 触发的 data 作为 content，附带 `event_id` 便于业务侧 srcReply 时构造被动消息。

## 改动文件

| 文件 | 操作 |
| --- | --- |
| `src/core/event/interaction.ts` | 新增 |
| `src/core/event/dispatcher.ts` | 接入 |
| `src/core/api/interaction.ts` | ack 调用 |

## 行为细节

```
INTERACTION_CREATE
  │
  ▼
解析 scene/chat_type 取得 contact:
   chat_type === 0 → guild       → karin.contact('guild', guild_id, channel_id)
   chat_type === 1 → group       → karin.contactGroup(group_openid)
   chat_type === 2 → c2c         → karin.contactFriend(user_openid)
  │
  ▼
立即 ack(interactionId, 0)  ← 必须早，避免客户端 loading 超时
  │
  ▼
构造 elements:
  [
    segment.at(self),                                  // 仅群 / 单聊；guild 不补
    segment.text(button_data || ''),                   // 主体
    segment.json({ tag: 'qqbot-button-click',          // 元信息
                   button_id, feature_id, version }),
    segment.pasmsg(interactionId, 'event'),            // 被动事件 ID
  ]
  │
  ▼
按 scene 走 createGroupMessage / createFriendMessage / createGuildMessage
```

> 备注：karin 暂无「按钮点击」专属事件类型，借用消息事件是当前最低代价的做法。
> 业务层可通过 `e.rawEvent.t === 'INTERACTION_CREATE'` 区分。

## 实现步骤

1. `onInteraction(client, ev)`：
   - 立刻 `client.super.interaction.ack(ev.d.id, 0).catch(...)`；
   - 按 chat_type 路由到对应 createXxxMessage；
   - `srcReply` 走 `client.sendMsg(contact, [...elements, segment.pasmsg(ev.id, 'event')])`。
2. dispatcher 增加 `case INTERACTION_CREATE: return onInteraction(client, ev)`。
3. interaction.ack 实现：
   ```ts
   return this.axios.put(`/interactions/${id}`, { code }).then(() => undefined)
   ```

## 验收点

- 用户点击 markdown 消息的按钮 → 服务端推 `INTERACTION_CREATE`；
- 控制台打 debug：`[INTERACTION] button=21 data='回调按钮' from group=xxx`；
- 业务层在 karin 中可用 `e.elements[0]` 取到 at，`e.elements[1].text` 取到按钮 data；
- 客户端 loading 在 3s 内消失（ack 调用成功）。

## 风险与缓解

- ack 失败时仍要继续投递事件，避免业务层永远收不到；ack 错误仅 warn。
- guild 场景按 user_id 字段，需要额外 fallback 到 chat_type=0 的 sender 构造。

## 下一步
进入 [S10 · 扫码与面板](./10-onboard-and-web.md)。
