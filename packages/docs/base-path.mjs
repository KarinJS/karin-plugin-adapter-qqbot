/**
 * GitHub Pages 项目站点挂在仓库名下面。
 * 部署由 Actions 注入前缀；本地构建默认不带，方便 serve out 直接预览。
 * 手动构建 Pages 产物时设置 NEXT_PUBLIC_BASE_PATH。
 */
export const GITHUB_PAGES_BASE_PATH = '/karin-plugin-adapter-qqbot'

function normalizeBasePath(value) {
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '/') return ''
  return (trimmed.startsWith('/') ? trimmed : `/${trimmed}`).replace(/\/+$/, '')
}

export function resolveBasePath() {
  const configured = process.env.NEXT_PUBLIC_BASE_PATH

  if (configured !== undefined) return normalizeBasePath(configured)

  return process.env.GITHUB_ACTIONS ? GITHUB_PAGES_BASE_PATH : ''
}
