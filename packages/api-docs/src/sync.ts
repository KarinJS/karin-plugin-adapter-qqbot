import fs from 'fs-extra'
import { docsDir, wikiApiRoot } from './paths'

/**
 * 把 wiki 产物同步到 docs/。
 *
 * 官方文档站更新后执行 `pnpm sync`：crawl -> convert -> sync，
 * 这里会把 `wiki/wiki/develop/api-v2` 的内容镜像到 `docs/`，
 * 保持仓库内文档副本与 QQBot-Docs 的产出完全一致。
 */
const main = async (): Promise<void> => {
  if (!(await fs.pathExists(wikiApiRoot))) {
    console.error(`[ERROR] 未找到 ${wikiApiRoot}，请先运行 pnpm convert`)
    process.exitCode = 1
    return
  }

  await fs.emptyDir(docsDir)
  await fs.copy(wikiApiRoot, docsDir)
  console.log(`[SYNC] ${wikiApiRoot} -> ${docsDir}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
