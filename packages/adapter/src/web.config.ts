import { defineConfig } from 'node-karin'
import { pkg } from '@/utils/plugin'

/**
 * 本地开发时把 iframe 指向 Vite dev server。
 *
 * 生产环境使用插件自己的同源路径，由 `src/web/static.ts` 提供构建产物。
 */
const devUrl = process.env.QQBOT_WEB_DEV_URL?.trim()

export default defineConfig({
  info: {
    id: pkg().name,
    name: 'QQBot 适配器',
    version: pkg().version,
    description: '为 karin 提供 QQ 官方 Bot 连接能力（2.0）',
    author: [
      {
        name: 'shijin',
        avatar: 'https://github.com/sj817.png',
      },
    ],
  },
  page: {
    url: devUrl || '/qqbot/web/',
    title: 'QQBot 适配器配置',
    description: '管理机器人连接、扫码授权与消息缓存',
  },
})
