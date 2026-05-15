# S01 · 类型 & 配置瘦身

## 目标
- 把 `src/types/event.ts` 重写为「真实报文驱动」的事件类型，对齐新版 `GROUP_MESSAGE_CREATE` 报文。
- 拆出 `src/types/opcode.ts`，专门承载 WebSocket payload（Hello / Identify / Resume / Heartbeat / Dispatch / Reconnect / Invalid / HTTPCallbackACK）。
- `src/types/config.ts` 移除 `markdown.mode`，新增 `markdown.enable` / `keyboard.enable`，删除已废弃的 `event.wsUrl` / `event.wsToken`。

## 改动文件

| 文件 | 操作 |
| --- | --- |
| `src/types/event.ts` | 重写 |
| `src/types/config.ts` | 重写 |
| `src/types/opcode.ts` | 新增 |
| `src/types/index.ts` | 重新汇出 |
| `src/utils/config.ts` | `getDefaultConfig` 与 `formatConfig` 跟随调整，加旧字段迁移 |

## 类型契约（关键片段）

```ts
// src/types/opcode.ts
export const enum Opcode {
  Dispatch = 0, Heartbeat = 1, Identify = 2,
  Resume = 6, Reconnect = 7, InvalidSession = 9,
  Hello = 10, HeartbeatACK = 11, HTTPCallbackACK = 12,
  WebhookValidation = 13, // webhook 鉴权回调
}

export interface IdentifyPayload {
  op: Opcode.Identify
  d: {
    token: string
    intents: number
    shard: [number, number]
    properties: { $os: string; $browser: string; $device: string }
  }
}
export interface ResumePayload { ... }
export interface HeartbeatPayload { ... }
```

```ts
// src/types/event.ts —— 核心新增
export interface Author {
  id: string
  /** 群聊：member_openid；单聊：user_openid。新版报文里两者都会出现 */
  member_openid?: string
  user_openid?: string
  /** 新：互联 openid，未授权时为空字符串 */
  union_openid?: string
  /** 新：群/QQ 昵称 */
  username?: string
  /** 新：发送者是否为 bot */
  bot?: boolean
}

export interface QQMention {
  bot: boolean
  id: string
  member_openid: string
  is_you: boolean
  /** 'single' | 'everyone'（按观察填充） */
  scope: string
  username: string
}

export interface MessageScene {
  /** 形如 ['msg_idx=REFIDX_xxx'] */
  ext?: string[]
  /** 'default' | 其他 */
  source?: string
}

export interface GroupMsgEvent extends BaseEvent {
  t: EventEnum.GROUP_AT_MESSAGE_CREATE | EventEnum.GROUP_MESSAGE_CREATE
  id: string
  d: {
    author: Author
    content: string
    group_id: string
    group_openid: string
    id: string                        // 消息 ID
    timestamp: string
    attachments?: Attachment[]
    /** 新：mentions（GROUP_MESSAGE_CREATE 必带；GROUP_AT_MESSAGE_CREATE 也开始下发） */
    mentions?: QQMention[]
    /** 新 */
    message_scene?: MessageScene
    /** 新：消息子类型，0=普通 */
    message_type?: number
  }
}

export interface C2CMsgEvent extends BaseEvent {
  t: EventEnum.C2C_MESSAGE_CREATE
  id: string
  d: {
    author: Author                    // 同步含 username / bot / union_openid
    content: string
    id: string
    timestamp: string
    attachments?: Attachment[]
    message_scene?: MessageScene
    message_type?: number
  }
}
```

```ts
// src/types/config.ts
export interface QQBotConfig {
  name: string
  appId: string
  secret: string
  prodApi: string
  sandboxApi: string
  tokenApi: string
  sandbox: boolean
  qqEnable: boolean
  guildEnable: boolean
  guildMode: 0 | 1
  regex: { reg: string | RegExp; rep: string }[]
  /** ★ 新：是否启用「自动 Markdown 化」 */
  markdown: { enable: boolean }
  /** ★ 新：是否启用「文本中 URL 自动转 keyboard 按钮」 */
  keyboard: { enable: boolean }
  event: {
    /** 0 关闭 / 1 webhook / 2 ws */
    type: 0 | 1 | 2
  }
}
```

## 实现步骤

1. 新建 `src/types/opcode.ts`，从旧 `event.ts` 抽离 `Opcode` / `HeartbeatEvent` / `HeartbeatACKEvent` / `Identify` / `Resume` payload。
2. 重写 `src/types/event.ts`：
   - 抽取 `Author`、`QQMention`、`MessageScene` 公共接口；
   - 修改 `GroupMsgEvent` 与 `C2CMsgEvent` 加入新字段；
   - 移除事件枚举里完全不用的 forum/audio 字段（保留以备扩展也可，按需选择）。
3. 重写 `src/types/config.ts`：移除 `markdown.mode`，加入 `markdown.enable` / `keyboard.enable`，
   删除 `event.wsUrl` / `event.wsToken`。
4. `src/utils/config.ts`：
   - `getDefaultConfig` 更新；
   - `formatConfig` 增加迁移逻辑：
     ```ts
     // 兼容 1.x 旧字段
     if ('mode' in (item.markdown ?? {})) {
       const legacyMode = (item.markdown as any).mode
       item.markdown = { enable: legacyMode !== 0 }
     }
     if (!item.keyboard) item.keyboard = { enable: true }
     ```
   - 写入旧配置时备份一份 `config.json.bak.1x`，避免数据丢失。
5. `src/types/index.ts` 重新汇出。

## 验收点

- `tsc --noEmit` 全量通过；
- 旧 `config.json` 读入后 watch 回调能跑通迁移，控制台一条 `info` 级别迁移日志；
- 单测：手工构造 `GROUP_MESSAGE_CREATE` 样本（用户给出的 JSON）解析为新类型不报错；
- `markdown.mode` 在仓库内 grep 后 0 处引用（除迁移逻辑外）。

## 风险与缓解

- **缓解 1**：旧配置可能由前端 web.config 持续生成；S10 阶段同步更新前端组件移除 mode radio。
- **缓解 2**：第三方插件不会直接消费这些类型；若有，CHANGELOG 中明确写 breaking。

## 下一步
进入 [S02 · WebSocket 接入层](./02-connection-ws.md)。
