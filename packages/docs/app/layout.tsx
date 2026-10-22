import { RootProvider } from 'fumadocs-ui/provider/next'
import './global.css'
import 'fumadocs-twoslash/twoslash.css'
import type { Metadata } from 'next'
import { basePath } from '@/lib/shared'

/**
 * metadataBase 只取源站。站点路径由 basePath 负责，
 * 否则 openGraph 图片地址会重复带上仓库前缀。
 */
const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl.origin),
  title: {
    default: 'Karin QQBot 适配器文档',
    template: '%s | Karin QQBot 适配器文档',
  },
  description: '给 Karin 部署方与插件开发者看的 QQ 官方机器人适配器文档：部署、配置、事件映射、消息能力与官方 API。',
}

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <body className='flex flex-col min-h-screen'>
        <RootProvider
          search={{
            options: {
              type: 'static',
              api: `${basePath}/api/search`,
            },
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  )
}
