import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** api-docs 子包根目录。 */
export const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** 爬取到的原始 HTML。 */
export const htmlDir = resolve(packageRoot, 'html')

/** 转换后的完整 wiki Markdown。 */
export const wikiDir = resolve(packageRoot, 'wiki')

/** 仓库中实际使用的官方文档副本。 */
export const docsDir = resolve(packageRoot, 'docs')

/** wiki 输出中对应的 api-v2 文档根目录。 */
export const wikiApiRoot = resolve(wikiDir, 'wiki/develop/api-v2')
