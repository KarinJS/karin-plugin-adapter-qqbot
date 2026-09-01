import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    /** 源码内部用 `@/` 引用自身，测试直接 import 源码时需要同一套别名。 */
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    /**
     * 必须是子进程池：
     * - store / config 测试要用 process.chdir 把 karinPathBase 指到临时沙箱，
     *   worker_threads 里没有 chdir；
     * - node-karin/sqlite3 是原生模块，跑在独立子进程里更稳。
     */
    pool: 'forks',
    /** 真实建库 + v1 迁移比纯函数慢，默认 5s 偏紧。 */
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})
