# S07 · 发送管线

## 目标
- 集中实现两条发送管线 `pipeline-qq` / `pipeline-guild`；
- 在管线内完成被动消息组装、引用回复、富媒体上传、markdown+keyboard 构造；
- 删除 1.x 在 normal/markdown 双份实现里的重复代码。

## 改动文件

| 文件 | 操作 |
| --- | --- |
| `src/core/adapter/pipeline-qq.ts` | 新增 |
| `src/core/adapter/pipeline-guild.ts` | 新增 |
| `src/core/api/messages.ts` | 提取 `QQdMsgOptions` / `GuildMsgOptions` 至此 |
| `src/core/api/types.ts` | 同步重命名 |

## 公共抽象

```ts
interface PassiveMsgBuilder {
  apply (item: SendQQMsg | SendGuildMsg | FormData): void
}

const buildPassive = <T extends 'qq' | 'guild'> (
  scene: Contact['scene'],
  pas: Grouping<T>['pasmsg'],
  whitelist: { msg: boolean; event: boolean }
): PassiveMsgBuilder
```

被动 ID 白名单按 send.md：
- 单聊 event_id：`INTERACTION_CREATE` / `C2C_MSG_RECEIVE` / `FRIEND_ADD`
- 群聊 event_id：`INTERACTION_CREATE` / `GROUP_ADD_ROBOT` / `GROUP_MSG_RECEIVE`
- 任意场景 `msg_id` 都可用。

## pipeline-qq（单聊 + 群聊）

```ts
export const sendQQ = async (
  ctx: AdapterQQBot,
  contact: Contact<'friend' | 'group'>,
  elements: ElementTypes[]
): Promise<SendMsgResults> => {
  const grouping = group<'qq'>(contact.scene, elements)
  const items: SendQQMsg[] = await build(grouping, ctx, contact)
  const passive = buildPassive(contact.scene, grouping.pasmsg, qqWhitelist)
  const send = contact.scene === 'friend'
    ? ctx.super.sendFriendMsg.bind(ctx.super)
    : ctx.super.sendGroupMsg.bind(ctx.super)

  const result = ctx.initSendMsgResults()
  let replyHandled = false
  for (const item of items) {
    passive.apply(item)
    if (!replyHandled && grouping.reply.messageId) {
      item.message_reference = { message_id: grouping.reply.messageId }
      replyHandled = true
    }
    result.rawData.push(await send(contact.peer, item))
  }
  return ctx.handleResponse(result)
}
```

`build`：
1. text 段：转 URL→ QR（仅 `keyboard.enable=false` 时；启用时由 textToMd 接管）；
2. 图片：`uploadMedia` → `msg_type=7 media`；
3. video/record：fileToUrl → uploadMedia → `msg_type=7 media`；
4. markdown：直接 `msg_type=2 markdown` + keyboard 行组合；
5. file（单聊）：`uploadMedia('user', peer, 'file', url)` → `msg_type=7 media`。

## pipeline-guild（子频道 + 私信）

逻辑同 1.x normal.ts 的 `sendGuildMsg`，但拆出：
- `composeFirstItem`：把 content + imageUrls.shift() / imageFiles.shift() 合并为首条；
- `composeRest`：其余 imageUrls/imageFiles 单条发送；
- `composeMarkdown`：仅在 markdowns 非空时构造一条 markdown。

## 实现步骤

1. 把现有 normal.ts 的 sendQQMsg / sendGuildMsg 大段逻辑搬过来，拆解出可复用的 helper：
   - `await uploadAll(target, peer, items: string[]): Promise<UploadMediaResponse[]>`；
   - `await collectTextAsQR(text: string): { text, qr? }`（仅经典通道用）。
2. markdown 路径：抽离 `composeMarkdownPayload(grouping, type)`，生成单条 `SendQQMsg` / `SendGuildMsg`：
   - 把 `image` → `![alt #wpx #hpx](url)` 拼到 markdown content；
   - 把 buttons + keyboards → `karinToQQBot` 转 rows → `keyboard.content.rows`。
3. 校验 `markdown` 与 `keyboard` 互斥规则：keyboard 必须挂在 markdown 消息上。
4. 删除旧 normal/markdown/handler.ts。

## 验收点

- 单聊纯文本：1 次 POST `/v2/users/{openid}/messages`，body `msg_type=0`，被动 msg_id 携带；
- 群聊文本+图片+按钮：
  - 经典通道：2 次 POST（text、media），keyboard 因为无 markdown 不发送，logger.debug 给出 warning「button 必须依附 markdown」；
  - markdown 通道：1 次 POST，msg_type=2，含 markdown + keyboard；
- 子频道 file_image 上传仍走 FormData；
- 引用回复：仅第一条消息携带 `message_reference`，后续不重复。

## 风险与缓解

- 富媒体上传失败时旧实现直接抛出，新实现保持同样行为；CHANGELOG 注明重试策略后续接入。
- markdown 中的图片如果 URL 不可达，QQ 客户端可能渲染不出，需在发送日志中提示开发者保留可达资源。

## 下一步
进入 [S08 · API 层](./08-api-layer.md)。
