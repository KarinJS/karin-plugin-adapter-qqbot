import path from 'node:path'
import { defineConfig } from 'fumadocs-mdx/config'
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins/rehype-code'
import { transformerTwoslash } from 'fumadocs-twoslash'
import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs'

/**
 * 代码块直接引用工作区里的适配器源码，不依赖 packages/adapter/dist 是否已经构建。
 * TypeScript 7 不再可靠地按 baseUrl 解析 paths，这里直接用绝对路径。
 */
const workspaceRoot = path.resolve(process.cwd(), '..')
const defaultTransformers = rehypeCodeDefaultOptions.transformers ?? []
const adapterEntry = path.resolve(workspaceRoot, 'adapter/src/index.ts').replaceAll('\\', '/')
const adapterSource = path.resolve(workspaceRoot, 'adapter/src/*').replaceAll('\\', '/')

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      ...rehypeCodeDefaultOptions,
      transformers: [
        ...defaultTransformers,
        transformerTwoslash({
          typesCache: createFileSystemTypesCache(),
          twoslashOptions: {
            compilerOptions: {
              paths: {
                '@karinjs/adapter-qqbot': [adapterEntry],
                '@/*': [adapterSource],
              },
            },
          },
        }),
      ],
    },
  },
})
