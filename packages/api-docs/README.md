# @karinjs/adapter-qqbot-api-docs

QQ 机器人开放平台文档的抓取、转换与仓库副本同步工具。这个子包承接原 QQBot-Docs
项目的逻辑，产物存放在 `docs/`，供适配器开发时查阅。

## 命令

```bash
# 从 https://bot.q.qq.com/wiki/develop/api-v2/ 抓取 HTML
pnpm crawl

# 把 HTML 转换为 Markdown，输出到 wiki/
pnpm convert

# 抓取 + 转换 + 同步到 docs/
pnpm sync
```

`html/` 与 `wiki/` 是中间产物，已被 Git 忽略；`docs/` 是仓库中跟踪的官方文档副本。

## 目录

| 路径             | 说明                         |
| ---------------- | ---------------------------- |
| `src/crawl.ts`   | 从官方 wiki 抓取 api-v2 页面 |
| `src/convert.ts` | 提取正文并转换为 Markdown    |
| `src/sync.ts`    | 把 wiki 产物镜像到 `docs/`   |
| `docs/`          | 适配器仓库使用的官方文档副本 |
