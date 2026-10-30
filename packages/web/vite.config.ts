import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/qqbot/web/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      // Karin 默认监听 0.0.0.0（IPv4）。Windows 上 localhost 可能优先解析到 ::1，
      // 固定用 127.0.0.1，避免命中同端口的其它 IPv6 服务。
      '/api/v1': {
        target: 'http://127.0.0.1:7777',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, '../adapter/dist/web'),
    emptyOutDir: true,
    sourcemap: false,
  },
})
