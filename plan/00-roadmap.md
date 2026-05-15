# karin-plugin-adapter-qqbot · 2.0 重写路线图

> 文档基准：`D:/Github/bot-docs`（参考用，部分内容已与官方现状脱节，遇冲突以最新官方推送/真实抓包为准）
> 当前仓库版本：1.3.1 · 目标版本：2.0.0
> 触发：QQ 开放平台已全量开放 `markdown` / `keyboard` 字段；新增 `GROUP_MESSAGE_CREATE` 群聊全量消息事件，
> 报文新增 `author.username` / `author.bot` / `author.union_openid` / `mentions[].is_you` /
> `mentions[].scope` / `message_scene` / `message_type` 等字段。

---

## 一、目标与非目标

### 目标（必须达成）

1. **完整支持新版 `GROUP_MESSAGE_CREATE` 事件**：包含 `author.username`、`mentions`、`message_scene`、
   `message_type` 等新字段，事件流可生成正常的 `karin` 群消息事件。
2. **彻底移除模板 Markdown / 模板 keyboard 相关代码**：因官方已全量开放原生 Markdown、自定义 Keyboard，
   不再需要 `custom_template_id` + `params` 这套模板机制，也不再保留 1.x 中 `markdown.mode` 模式 2/3/4/5 等历史包袱。
3. **重新设计适配器分层**：不再用 `AdapterQQBotNormal` / `AdapterQQBotMarkdown` 二选一，
   改为单一适配器 + 可选「自动 Markdown 化」开关，按消息内容动态决定走文本/富媒体/Markdown 通道。
4. **更准确的 `mentions` 解析**：群聊事件 `mentions[].is_you=true` 时，等价于 1.x 的 `GROUP_AT_MESSAGE_CREATE`
   语义；将 `mentions` 数组映射为 `karin` 的 `segment.at`，附带 `username`。
5. **interaction（按钮回调）事件接入**：必须能收到、能调用 `PUT /interactions/{interaction_id}` 回调，
   并以 `karin` 的某种通用 notice/message 事件投递给业务层。
6. **被动消息发送链路统一**：`msg_id` / `event_id` / `msg_seq` 的拼装收敛到一处，避免 normal/markdown
   两份重复实现；并按官方文档把支持事件 ID 的事件类型列表化、白名单化。
7. **配置项瘦身**：去除 `markdown.mode` 模板模式；保留 `markdown.enable`（是否自动转 markdown）
   与 `keyboard.enable`（是否自动把 URL 转为 keyboard 按钮）两个能力开关。
8. **代码风格与目录结构整理**：把 `connection / core / event / api / utils` 重新切分，
   保证一个文件只做一件事；删除大量历史 TODO 与已弃用的 `@everyone` / `<@userid>` 旧协议遗留。

### 非目标（本期不做）

- 不替换 `node-karin` 框架；适配器仍依赖框架的 `AdapterBase` / `createGroupMessage` 等。
- 不引入 QQ 频道（guild）相关新接口，仅做必要的兼容（频道接口官方在 2025-04 之后投入逐步减少，本期保
  持现状即可）。
- 不实现「主动消息」相关新策略 —— 因为官方已下线主动消息推送接口（参考 send.md 中红色警告）。
- 不重写 `web.config.ts` 的 UI 逻辑，仅根据配置项删减做最小化同步。

---

## 二、整体架构（2.0）

```
src/
├── app.ts                   # tsx watch 启动入口（保持）
├── index.ts                 # 插件入口，引导扫码 + 注册路由 + 初始化 Bot
├── root.ts                  # 插件路径
├── web.config.ts            # 前端配置面板（同步删除 markdown.mode）
│
├── types/
│   ├── config.ts            # ✦ 配置类型（移除 markdown.mode，新增 markdown.enable / keyboard.enable）
│   ├── event.ts             # ✦ 事件类型（重写 GroupMsgEvent，新增 mentions / message_scene / message_type）
│   ├── opcode.ts            # 新文件：opcode + websocket payload 类型抽离
│   └── index.ts
│
├── connection/
│   ├── routing.ts           # express 路由聚合
│   ├── webhook.ts           # webhook 接收 + 签名校验
│   ├── ws/
│   │   ├── client.ts        # 单连接生命周期 + 心跳
│   │   ├── intents.ts       # intents 探测与回退
│   │   └── manager.ts       # 多 bot 连接缓存
│   └── transport.ts         # 事件分发到业务层（emit/listener）
│
├── core/
│   ├── index.ts             # initAdapter / createBot / destroyBot
│   ├── onboard.ts           # 扫码授权（保留）
│   ├── api/
│   │   ├── index.ts         # QQBotApi 主类
│   │   ├── messages.ts      # 发送消息相关 path 与请求体
│   │   ├── media.ts         # 富媒体上传
│   │   ├── interaction.ts   # 新：PUT /interactions/{id}
│   │   ├── types.ts         # 请求/响应类型
│   │   └── sign.ts          # ed25519 签名
│   ├── internal/
│   │   ├── axios.ts         # axios 实例 + token 刷新
│   │   └── token.ts         # access_token 管理（单独抽出便于测试）
│   ├── adapter/
│   │   ├── base.ts          # AdapterQQBot（合并旧 adapter.ts/normal.ts/markdown.ts）
│   │   ├── grouping.ts      # 消息归类器（文本/图片/按钮/markdown 同一处）
│   │   ├── pipeline-qq.ts   # 群聊 + 单聊发送管线
│   │   ├── pipeline-guild.ts# 子频道 + 私信发送管线
│   │   └── text-to-md.ts    # 文本 → markdown / URL→ keyboard 的可选转换
│   └── event/
│       ├── dispatcher.ts    # createEvent + 事件名映射
│       ├── message.ts       # group / friend / channel / direct
│       ├── notice.ts        # add/del robot, msg-receive/reject, friend add/del
│       └── interaction.ts   # 新：INTERACTION_CREATE 解析 + 回调
│
└── utils/
    ├── common.ts            # 事件总线、二维码、url 提取、silk
    ├── config.ts            # 配置读写 + watch
    ├── logger.ts            # 统一前缀
    └── index.ts
```

---

## 三、路线图（按阶段顺序）

| 阶段 | 文件 | 主题 | 主要修改 |
| --- | --- | --- | --- |
| **S01** | [01-types-and-config.md](./01-types-and-config.md) | 类型 & 配置瘦身 | 重写 event/config 类型，删除 `markdown.mode` 模板模式 |
| **S02** | [02-connection-ws.md](./02-connection-ws.md) | WebSocket 接入层 | 拆分 `client.ts` / `intents.ts` / `manager.ts`，规范化重连 |
| **S03** | [03-connection-webhook.md](./03-connection-webhook.md) | Webhook 接入层 | 鉴权与签名验证落到 utils，统一进入 dispatcher |
| **S04** | [04-event-dispatcher.md](./04-event-dispatcher.md) | 事件分发器 | `createEvent` 重写，支持新事件名 + 区分 GROUP_AT / GROUP_MESSAGE |
| **S05** | [05-message-conversion.md](./05-message-conversion.md) | 报文 → karin 转换 | 解析新版 GROUP_MESSAGE_CREATE 报文，处理 mentions / message_scene |
| **S06** | [06-adapter-rewrite.md](./06-adapter-rewrite.md) | 适配器重写 | 合并 normal/markdown，单一适配器 + 可选自动 Markdown |
| **S07** | [07-send-pipelines.md](./07-send-pipelines.md) | 发送管线 | `pipeline-qq` / `pipeline-guild` 拆分，消除重复 |
| **S08** | [08-api-layer.md](./08-api-layer.md) | API 层 | 按 messages/media/interaction 拆分，明确返回类型 |
| **S09** | [09-interaction-create.md](./09-interaction-create.md) | INTERACTION_CREATE | 解析按钮回调事件，回调 PUT 接口，落到 karin |
| **S10** | [10-onboard-and-web.md](./10-onboard-and-web.md) | 扫码与面板 | onboard 流程不变，web 面板同步配置项删减 |
| **S11** | [11-cleanup-migration.md](./11-cleanup-migration.md) | 清理与迁移 | 删除老 TODO / @everyone 旧协议 / 模板代码 / 版本号 2.0.0 |
| **S12** | [12-release-checklist.md](./12-release-checklist.md) | 发版自检 | 编译、烟测、CHANGELOG、release 流程 |

---

## 四、关键设计决策

### 4.1 不再区分 normal / markdown adapter
旧实现里 `markdown.mode === 1` 强行把所有文本转成 markdown，导致：
- 文本中 URL 被强制转按钮，体验割裂；
- 富媒体在 markdown 通道里只能内嵌图片，视频/语音/file 走不通；
- normal.ts 与 markdown.ts 各 300 行，逻辑高度重复。

2.0 用 **同一个适配器** + **Grouping + Pipeline** 架构：
- 收集到所有元素后，按「是否存在 markdown 元素 / 是否启用自动 Markdown」决定走哪条发送路径；
- 文本 + 图片走 `msg_type=0/7`；显式 `segment.markdown(...)` 或开关启用时才走 `msg_type=2` + keyboard。

### 4.2 `GROUP_MESSAGE_CREATE` vs `GROUP_AT_MESSAGE_CREATE`
- `GROUP_AT_MESSAGE_CREATE` 仍然存在（@机器人触发），其报文不含 `mentions` 时由分发器补一个 self at；
- `GROUP_MESSAGE_CREATE` 是「群里所有消息」，会自带 `mentions` 数组，通过 `is_you=true` 判断是否 at 自己；
- karin 侧统一走 `createGroupMessage`，差别仅在「是否在 elements 头部补 `segment.at(self)`」。

### 4.3 配置项变化（破坏式）

| 旧字段 | 处理 |
| --- | --- |
| `markdown.mode: 0` | 等价于新版 `markdown.enable=false`（不强制转） |
| `markdown.mode: 1` | 等价于新版 `markdown.enable=true` |
| `markdown.mode: 2/3/4/5`（模板模式） | **直接删除**，迁移时打 `warn` 后 fallback 到 `enable=true` |
| `event.wsUrl` / `event.wsToken` | 已不再使用（中转方案废弃），删除 |
| 新增 `keyboard.enable` | 控制是否自动把 URL 转为 keyboard 按钮 |

### 4.4 被动消息 ID 的事件类型白名单
按官方文档 send.md：
- 单聊 `event_id` 支持事件：`INTERACTION_CREATE` / `C2C_MSG_RECEIVE` / `FRIEND_ADD`
- 群聊 `event_id` 支持事件：`INTERACTION_CREATE` / `GROUP_ADD_ROBOT` / `GROUP_MSG_RECEIVE`

2.0 在 `pipeline-*.ts` 内做白名单校验：业务层传入了非白名单事件 ID 时降级为「主动消息」并打 warn。

---

## 五、风险与回滚

1. **配置兼容**：1.x 旧 `config.json` 中可能存在 `markdown.mode >= 2`。`formatConfig` 时做一次性迁移，
   写入 backup 后再写新结构。
2. **karin 框架版本**：依赖 `node-karin@^1.15`，新引入 `karinToQQBot` 的 keyboard 行为差异需在 S07 验证。
3. **`message_type` 含义未在文档明示**：先按 `0 = 普通消息` 处理，遇到非 0 时 fallback 走文本路径并打 debug。
4. **回退策略**：所有改动按阶段提交，每个阶段独立编译通过；CI 失败则 revert 当阶段 commit。

---

## 六、对照表 · 「旧报文 → 新报文」字段映射

> 以用户提供的真实 `GROUP_MESSAGE_CREATE` 报文为准

```jsonc
{
  "op": 0, "s": 5, "t": "GROUP_MESSAGE_CREATE", "id": "GROUP_MESSAGE_CREATE:...",
  "d": {
    "author": {
      "bot": false,                          // 新：发送者是否为 bot
      "id": "...",                           // 旧
      "member_openid": "...",                // 旧
      "union_openid": "",                    // 新：互联 openid
      "username": "小布丁qwq"                 // 新：群昵称/QQ昵称
    },
    "content": " /分布 ",                     // 旧
    "group_id": "...",                       // 旧
    "group_openid": "...",                   // 旧
    "id": "ROBOT1.0_...",                    // 旧
    "mentions": [                            // 新（与频道事件结构对齐）
      {
        "bot": true,
        "id": "...",
        "is_you": true,                      // 关键：用于判断是否 @ 自己
        "member_openid": "...",
        "scope": "single",                   // single / everyone（猜测）
        "username": " 方舟生存飞升"
      }
    ],
    "message_scene": {                       // 新：消息场景
      "ext": ["msg_idx=REFIDX_..."],
      "source": "default"                    // default / forward(?) 待观察
    },
    "message_type": 0,                       // 新：消息子类型，0=普通
    "timestamp": "2026-05-08T13:24:53+08:00" // 旧
  }
}
```

`C2CMsgEvent` 单聊报文官方也已对齐到包含 `username` / `union_openid` 等字段，
S05 同步处理。

---

每个阶段的「目标 / 改动文件 / 接口/类型契约 / 步骤 / 验收点 / 风险」全部在对应分文件中详细列出。
后续实现请严格按阶段顺序推进，**每完成一阶段提交一次 commit**。
