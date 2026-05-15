# S05 · 报文 → karin 转换

## 目标
- 重写 `core/event/conver.ts`，对齐新版 `GROUP_MESSAGE_CREATE` / `C2C_MESSAGE_CREATE` 报文；
- 正确解析 `mentions` 数组（含 `is_you` / `scope` / `username`）；
- 正确处理 `message_scene.ext.msg_idx`（用于撤回 / 引用，先存进 rawEvent，业务侧可访问）；
- 完善 `attachments` 处理（含 `voice` 的 `voice_wav_url`、`file` 类型先 fallback 为 `segment.json` 留扩展位）。
- 删除已被官方弃用的 `@everyone` / `<@userid>` 旧协议字符串渲染（仅保留新协议 `<qqbot-at-everyone />` / `<qqbot-at-user />`）；输入侧保留兼容。

## 改动文件

| 文件 | 操作 |
| --- | --- |
| `src/core/event/conver.ts` | 重写 |
| `src/core/event/message.ts` | onGroupMsg / onFriendMsg 跟随调整 |

## 关键逻辑

```ts
export interface ConvertOptions {
  /** GROUP_AT_MESSAGE_CREATE 时由 dispatcher 传入；GROUP_MESSAGE_CREATE 时按 mentions.is_you 自动判断 */
  forceAtSelf?: boolean
}

export const convertToKarin = (
  appid: string,
  selfSubId: string,
  ev: GroupMsgEvent | C2CMsgEvent | GuildMsgEvent | DirectMsgEvent,
  options: ConvertOptions = {}
): ElementTypes[]
```

处理顺序：

1. **mentions 索引**（兼容三类事件）：
   - guild 事件：`ev.d.mentions: GuildUser[]`
   - group 新事件：`ev.d.mentions: QQMention[]`
   - 建立 `Map<id, displayName>` 供后续渲染。

2. **附件**：
   - `content_type.startsWith('image/')` → `segment.image(url, { width, height, name, subType })`
   - `content_type === 'video/mp4'` → `segment.video(url)`
   - `content_type === 'voice'` → `segment.record(voice_wav_url || url)`
   - `content_type === 'file'` → **TODO 占位**：karin 暂无 file segment，写入 `segment.json({ type: 'file', file: v })` 透传给业务层。

3. **content 解析**（核心改造点）：
   - 用正则一次切分：`<faceType=\d+,faceId="\d+",ext="[^"]+">` | `<@!\d+>` | `<qqbot-at-user id="..." />` | `<qqbot-at-everyone />` | `[^<]+`
   - `<faceType=...>` → `segment.face(faceId)`
   - `<@!id>` → `segment.at(id===self ? appid : id, mentionsMap.get(id) || '')`
   - `<qqbot-at-user id="..." />` → `segment.at(id, mentionsMap.get(id) || '')`
   - `<qqbot-at-everyone />` → `segment.at('all')`
   - 文本块：先 unescape HTML 实体，再过 `cfg.regex` 替换。

4. **群消息 @自己 的判断**（决定是否头部补 `segment.at(appid)`）：
   - `forceAtSelf===true`（dispatcher 传入，对应 `GROUP_AT_MESSAGE_CREATE`）→ 补；
   - 否则若 `ev.d.mentions?.some(m => m.is_you)` → 补；
   - 否则不补。
   - 补 at 时使用 mentions 里 `is_you=true` 项的 `username` 作为显示名。

5. **`message_scene.ext` 记录**：把 `msg_idx`、`source` 全部存在 `rawEvent` 上即可，无需对 karin 暴露。

6. **`author.username`**：
   - 旧实现里 `groupSender(userId, 'unknown')`。
   - 新实现：`groupSender(userId, 'unknown', ev.d.author.username || undefined)`，让 karin 端展示昵称。
   - C2C 同理 `friendSender(userId, ev.d.author.username || '')`。

## 验收点

- 投入用户提供的真实 `GROUP_MESSAGE_CREATE` JSON：
  - 因 `mentions[0].is_you=true`，elements 头部存在 `segment.at(appid)`；
  - text 段为 `/分布`（带前后空格的处理由 `cfg.regex` 或默认 trim 决定）；
  - sender.nick === `小布丁qwq`。
- 模拟无 mentions 的 `GROUP_MESSAGE_CREATE`：elements 头部不带 at。
- 模拟带图片附件的事件：image segment 含 width/height。
- 模拟语音附件：record segment URL 优先 wav。

## 风险与缓解

- **`scope` 字段未在官方文档明示**：先存为字符串，业务层做 in 比较即可。
- **mentions 字段在 `GROUP_AT_MESSAGE_CREATE` 中是否一定存在不确定**：保留 `forceAtSelf` 兜底，避免漏 at。

## 下一步
进入 [S06 · 适配器重写](./06-adapter-rewrite.md)。
