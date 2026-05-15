# S11 · 清理与迁移

## 目标
- 在功能实现完成后，做一次全仓的清理；
- 删除被新结构替代的所有死代码、过期 TODO、被官方弃用的 1.x 协议遗留；
- 整理 `package.json` 与 `version` 信息。

## 清理清单（grep 检查后逐项处理）

| 关键字 | 处理 |
| --- | --- |
| `RawMarkdown` / `rawMarkdown` | 删除（S06 已移除） |
| `markdown:mode` / `markdown.mode` | 仅保留迁移逻辑里的 1 处 |
| `AdapterQQBotNormal` / `AdapterQQBotMarkdown` | 删除（S06） |
| `event.wsUrl` / `event.wsToken` | 删除（S01） |
| `@everyone`（输出端） | 输出统一改为 `<qqbot-at-everyone />`；输入端容错保留 |
| `<@!\d+>`（输入端） | 容错保留（旧消息体可能仍下发） |
| `<@user_id>` 描述（注释里的旧协议） | 修订注释 |
| 模板 markdown 注释（`custom_template_id`） | 删除或加 `@deprecated` 标记 |
| 全部 `console.log(v)`（conver.ts 内 file 处理处） | 改为 `logger.debug` |

## package.json

```jsonc
{
  "name": "@karinjs/adapter-qqbot",
  "version": "2.0.0",
  "description": "karin adapter for QQ Official Bot (2.0)",
  ...
}
```

- `CHANGELOG.md`：新增 2.0.0 段落，列出所有破坏式变更与迁移指引；
- README 局部更新：删除模板 markdown 的 FAQ；新增「自动 Markdown 化」开关介绍。

## 测试 / 烟测路径

1. 启动 dev：`pnpm dev`；
2. 配置一个真实测试 bot，event.type=2；
3. 在群里发普通消息（验证 `GROUP_MESSAGE_CREATE` + mentions）；
4. 在群里 @ 机器人（验证 `GROUP_AT_MESSAGE_CREATE`）；
5. 私聊机器人发消息（验证 C2C）；
6. 让机器人发：
   - 仅文本 → 经典通道；
   - 文本 + 按钮 → markdown 通道；
   - 文本 + 视频 → 经典通道 + media；
7. 点击按钮 → 收到 INTERACTION_CREATE，client loading 消失；
8. 重新加载配置文件（修改 markdown.enable）→ watch 触发 reload，无重复消息；
9. 杀网测试 WS Resume。

## 验收点

- `grep -R "markdown.mode\|RawMarkdown\|AdapterQQBotNormal\|AdapterQQBotMarkdown" src`：仅迁移代码 1 处命中；
- `pnpm build` 全量通过；
- README 与 CHANGELOG 同步。

## 风险与缓解

- 仅一名维护者推进；建议每阶段独立 PR，便于回滚。

## 下一步
进入 [S12 · 发版自检](./12-release-checklist.md)。
