# S10 · 扫码授权与 Web 配置面板

## 目标
- `src/core/onboard.ts` 行为保持不变（最近 commit 才完成的扫码授权）；
- `src/web.config.ts` 同步删除 `markdown:mode` 字段，新增 `markdown:enable` / `keyboard:enable`；
- 默认值与 `getDefaultConfig` 保持一致。

## 改动文件

| 文件 | 操作 |
| --- | --- |
| `src/core/onboard.ts` | 微调：写入新配置默认值时遵循 S01 的新结构 |
| `src/web.config.ts` | 重写 components 列表与 save 函数 |

## components 变更

| 旧组件 key | 新组件 key | 说明 |
| --- | --- | --- |
| `markdown:mode` (radio) | `markdown:enable` (switch) | true = 自动 markdown 化；false = 经典通道 |
| —— | `keyboard:enable` (switch) | true = 文本中 URL 自动转 keyboard 按钮 |

其他组件保持不变（name / appId / secret / prodApi / sandboxApi / tokenApi / sandbox /
qqEnable / guildEnable / guildMode / regex / event:type）。

## save 函数变更

```ts
data.push({
  ...common,
  markdown: { enable: !!item['markdown:enable'] },
  keyboard: { enable: item['keyboard:enable'] !== false },  // 默认 true
  event: { type: Number(item['event:type'] ?? 0) as 0 | 1 | 2 },
  // 不再写 event.wsUrl / event.wsToken
})
```

## onboard 同步

`runQrOnboard` 中 `newConfig` 构造继承 `getDefaultConfig()[0]`，
S01 已统一字段，因此本阶段只需要把 `cfg[existingIndex].secret = result.secret` 等更新继续保留即可。

## 验收点

- 前端面板加载已有 1.x 配置：自动迁移 `markdown.mode=1` → `markdown:enable=true`，UI 显示已开启；
- 保存后写入新结构 config.json，不再含 `mode` 字段；
- 扫码授权后 watch 重新初始化 bot 正常。

## 风险与缓解

- 前端组件 ID 修改可能与已有用户的本地缓存冲突，需要在 README / CHANGELOG 明确说明：
  「保存一次新配置即可」。

## 下一步
进入 [S11 · 清理与迁移](./11-cleanup-migration.md)。
