import { createGetUrl } from 'fumadocs-core/source'

export const appName = 'Karin QQBot 适配器文档'
export const docsRoute = '/docs'
export const docsImageRoute = '/og/docs'
export const docsContentRoute = '/llms.mdx/docs'

export const gitConfig = {
  user: 'KarinJS',
  repo: 'karin-plugin-adapter-qqbot',
  branch: 'main',
}

/**
 * GitHub Pages 项目站点需要给所有绝对路径加上仓库前缀。
 * next.config.mjs 会把解析后的前缀注入 NEXT_PUBLIC_BASE_PATH，
 * 这里读到的值和 Next 的 basePath 一定一致；本地开发时为空字符串。
 */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function withBasePath(path: string) {
  return `${basePath}${path}`
}

/** 给 Markdown 里的站内绝对链接补上 basePath。 */
export function withBasePathInMarkdown(content: string) {
  if (!basePath) return content

  return content.replaceAll('](/', `](${basePath}/`)
}

const getContentUrl = createGetUrl(docsContentRoute)

export function getPageMarkdownUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'content.md']

  return { segments, url: withBasePath(getContentUrl(segments, page.locale)) }
}

const getImageUrl = createGetUrl(docsImageRoute)

export function getPageImageUrl(page: { slugs: string[]; locale?: string }) {
  const segments = [...page.slugs, 'image.png']

  return { segments, url: withBasePath(getImageUrl(segments, page.locale)) }
}
