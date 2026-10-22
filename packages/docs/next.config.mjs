import { createMDX } from 'fumadocs-mdx/next'
import { resolveBasePath } from './base-path.mjs'

const withMDX = createMDX()

/**
 * 本地构建不带前缀，pnpm start 用 serve out 直接预览。
 * GitHub Actions 或显式设置 NEXT_PUBLIC_BASE_PATH 时带 Pages 前缀。
 */
const basePath = resolveBasePath()

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath || undefined,
  /**
   * 让应用代码里的 process.env.NEXT_PUBLIC_BASE_PATH 与 Next 的 basePath 保持一致。
   * 否则默认前缀只在路由层生效，搜索接口、OG 图片和 llms 链接仍会漏掉前缀。
   */
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

export default withMDX(config)
