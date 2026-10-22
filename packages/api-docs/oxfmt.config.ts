import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'oxfmt'

const rootConfigPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../.oxfmtrc.json')
const rootConfig = JSON.parse(readFileSync(rootConfigPath, 'utf8')) as Parameters<typeof defineConfig>[0]

export default defineConfig({
  ...rootConfig,
  // ignorePatterns 相对当前配置文件解析；这里补上本子包的抓取产物与官方文档副本。
  ignorePatterns: [...(rootConfig.ignorePatterns ?? []), 'docs/**', 'html/**', 'wiki/**'],
})
