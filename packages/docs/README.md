# @karinjs/adapter-qqbot-docs

Karin QQBot 适配器的开发者文档站，基于 [Fumadocs](https://fumadocs.dev/)（Next.js + MDX），构建为静态站点并部署到 GitHub Pages。

## 开发

在仓库根目录执行：

```bash
pnpm docs:dev     # http://localhost:3000
pnpm docs:build   # 本地构建，导出到 packages/docs/out
pnpm docs:start   # serve out
pnpm --filter @karinjs/adapter-qqbot-docs typecheck
```

`next start` 不支持 `output: 'export'`，所以 `start` 直接跑 `serve out`。本地构建默认不带前缀，启动后访问 `http://localhost:3000/` 即可。换端口用 `pnpm --filter @karinjs/adapter-qqbot-docs exec serve out -p 3001`。

## 内容结构

- `content/docs/deploy/`：部署方需要看的安装、配置和排障。
- `content/docs/develop/`：插件开发者需要了解的事件、消息、媒体、官方 API 和能力边界。
- `content/docs/index.mdx`：文档入口。

## Twoslash

`source.config.ts` 给代码块启用了 Twoslash。`ts twoslash` 代码块会直接引用 `packages/adapter/src` 的类型，改完适配器类型后文档构建能立刻发现示例失效，不需要先构建适配器。

## 静态部署

`next.config.mjs` 使用 `output: 'export'`。本地构建默认不带前缀，方便 `serve out` 预览。

GitHub Actions 的 `docs.yml` 会从 `configure-pages` 拿到站点前缀并注入 `NEXT_PUBLIC_BASE_PATH`，所以部署产物带 `/karin-plugin-adapter-qqbot`。手动构建部署产物时自己设置：

```bash
NEXT_PUBLIC_BASE_PATH=/karin-plugin-adapter-qqbot pnpm docs:build
NEXT_PUBLIC_SITE_URL=https://karinjs.github.io
```

自定义域名或用户站点不需要前缀，保持默认或显式设为空字符串。部署流程见 `.github/workflows/docs.yml`，仓库的 Pages Source 需要设为 GitHub Actions。
