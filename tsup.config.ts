import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/web.config.ts'], // 入口文件
  format: ['esm'], // 输出格式
  target: 'node16', // 目标环境
  splitting: true, // 是否拆分文件
  sourcemap: false, // 是否生成 sourcemap
  clean: false, // 是否清理输出目录
  dts: true,
  outDir: 'dist', // 输出目录
  treeshake: false, // 树摇优化
  minify: false, // 压缩代码
  external: ['node-karin'],
  ignoreWatch: [],
  shims: true,
})
