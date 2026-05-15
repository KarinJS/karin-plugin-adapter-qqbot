# S06 · 适配器重写（合并 normal + markdown）

## 目标
- 移除 `AdapterQQBotNormal` / `AdapterQQBotMarkdown` 二选一类，合并为一个 `AdapterQQBot`；
- 内部用「**消息归类器 (Grouping)** + **发送管线 (Pipeline)**」做职责分离；
- 通过配置 `markdown.enable` / `keyboard.enable` 与元素层面的 `segment.markdown(...)` 决策发送路径；
- 删除模板 markdown 相关分支与 `RawMarkdown` 函数式钩子。

## 改动文件

| 文件 | 操作 |
| --- | --- |
| `src/core/adapter/adapter.ts` | 重命名为 `base.ts`，移除 markdownToButton 直接拼装的耦合 |
| `src/core/adapter/normal.ts` | 删除 |
| `src/core/adapter/markdown.ts` | 删除 |
| `src/core/adapter/handler.ts` | 删除（rawMarkdown 钩子取消） |
| `src/core/adapter/grouping.ts` | 新增（消息归类器） |
| `src/core/adapter/pipeline-qq.ts` | 新增（S07 详述） |
| `src/core/adapter/pipeline-guild.ts` | 新增（S07 详述） |
| `src/core/adapter/text-to-md.ts` | 新增（按需 markdown 化 + URL 转 keyboard） |
| `src/core/index.ts` | `createClient` 不再做 markdown/normal 分支 |

## AdapterQQBot 接口

```ts
export class AdapterQQBot extends AdapterBase {
  public super: QQBotApi
  public cfg: QQBotConfig

  constructor (cfg: QQBotConfig, api: QQBotApi) { ... }

  async sendMsg (contact, elements, retryCount?) {
    if (contact.scene === 'group' || contact.scene === 'friend') return sendQQ(this, contact, elements)
    if (contact.scene === 'guild' || contact.scene === 'direct') return sendGuild(this, contact, elements)
    throw new Error('不支持的消息类型')
  }

  async srcReply (e: Message, elements: ElementTypes[]) {
    const list = this.cfg.keyboard.enable
      ? await buttonHandle(e.msg, { e })   // 仅在开启时让框架自动挂载 keyboard
      : []
    return this.sendMsg(e.contact, [...elements, ...list, segment.pasmsg(e.messageId)])
  }

  async recallMsg (contact, messageId) { ... }   // 同 1.x
}
```

## Grouping（消息归类器）

```ts
export interface Grouping<T extends 'qq' | 'guild'> {
  text: string[]                         // 文本片段
  faces: number[]                        // 表情 id（仅 guild 用 <emoji:id>）
  images: string[]                       // 待上传/url 图片
  imageUrls: string[]                    // 仅 guild
  imageFiles: string[]                   // 仅 guild（FormData）
  buttons: ButtonElement[]
  keyboards: KeyboardElement[]
  markdowns: MarkdownElement[]
  media: Array<{ kind: 'video' | 'record' | 'file', source: string }>
  reply: { messageId?: string }
  pasmsg: { type: 'msg' | 'event', msgId: string, msgSeq: number }
  ats: string[]                          // 渲染好的 at 字符串片段
}

export const group = <T extends 'qq' | 'guild'> (
  scene: 'group' | 'friend' | 'guild' | 'direct',
  elements: ElementTypes[]
): Grouping<T>
```

只做「分类」，不做任何发送、不依赖 `QQBotApi`。

## 发送决策（伪代码）

```
const grouping = group(scene, elements)

// 1) 强制有 markdown 元素 → 走 markdown 通道
if (grouping.markdowns.length) {
  return pipeline.markdown(grouping)
}

// 2) 配置 markdown.enable=true & 仅含文本 / 图片 → 转 markdown
if (cfg.markdown.enable && hasOnlyTextAndImage(grouping)) {
  const md = textToMarkdown(grouping, { keyboard: cfg.keyboard.enable })
  grouping.markdowns.push(md.markdown)
  if (md.keyboard) grouping.buttons.push(...md.buttons)
  return pipeline.markdown(grouping)
}

// 3) 其他 → 原始通道（msg_type=0 文本 + msg_type=7 富媒体）
return pipeline.classic(grouping)
```

## 实现步骤

1. 新建 `core/adapter/base.ts`，从旧 `adapter.ts` 抽出：
   - `pasmsg<T>(type)`、`initSendMsgResults`、`handleResponse`、`recallMsg`；
   - 删除 `markdownToButton`（迁到 pipeline.markdown 内）。
2. 新建 `core/adapter/grouping.ts`，从 normal.ts / markdown.ts 抽公共归类逻辑。
3. 新建 `core/adapter/text-to-md.ts`：
   - 输入 `Grouping`，输出 `{ markdown: MarkdownElement, buttons: ButtonElement[] }`；
   - 内部使用旧 `textToButton` 与 `escapeMarkdown` 的核心算法；
   - URL→ keyboard 按钮的逻辑仅在 `keyboard.enable=true` 时启用。
4. 删除 `core/adapter/normal.ts` / `markdown.ts` / `handler.ts`。
5. `core/index.ts` 中 `createClient` 简化为 `return new AdapterQQBot(cfg, api)`。

## 验收点

- 一段「纯文本 + 1 图」消息：
  - `markdown.enable=false`：走经典通道，看到 1 条 `msg_type=0` + 1 条 `msg_type=7`；
  - `markdown.enable=true`：合成一条 `msg_type=2` markdown，图片用 `![](url)` 内嵌。
- 一段「`segment.markdown(...)` + `segment.button(...)`」：始终走 markdown 通道。
- 一段「文本 + 视频」：必须走经典通道，因为 markdown 不支持视频。
- 撤回消息接口不受影响。

## 风险与缓解

- **karin `buttonHandle`** 行为：在 srcReply 中开启 keyboard 时会自动追加 keyboard 元素，需在 grouping 中接住。已经在 1.x 验证过，保留即可。

## 下一步
进入 [S07 · 发送管线](./07-send-pipelines.md)。
