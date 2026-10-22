import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packagePath = resolve(rootDir, 'packages/adapter/package.json')

/** 读取本次提交暂存的文件列表。 */
const stagedFiles = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMRD'], {
  cwd: rootDir,
  encoding: 'utf8',
})
  .split('\n')
  .map((file) => file.trim())
  .filter(Boolean)

/** 没有暂存内容（例如 --allow-empty）时不需要刷新。 */
if (stagedFiles.length === 0) process.exit(0)

const pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
pkg.time = new Date().toISOString()
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)
execFileSync('git', ['add', '--', 'packages/adapter/package.json'], { cwd: rootDir })
