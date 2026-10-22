import path from 'node:path'
import { defineConfig } from 'fumadocs-mdx/config'
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins/rehype-code'
import { transformerTwoslash } from 'fumadocs-twoslash'
import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs'

/**
 * 代码块直接引用工作区里的适配器源码，不依赖 packages/adapter/dist 是否已经构建。
 * Next 的构建目录是 packages/docs，所以 baseUrl 指向 packages/。
 */
const workspaceRoot = path.resolve(process.cwd(), '..')
const defaultTransformers = rehypeCodeDefaultOptions.transformers ?? []

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
              baseUrl: workspaceRoot,
              paths: {
                '@karinjs/adapter-qqbot': ['adapter/src/index.ts'],
                '@/*': ['adapter/src/*'],
              },
            },
          },
        }),
      ],
    },
  },
})
