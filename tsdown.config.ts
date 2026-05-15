import { builtinModules } from 'node:module'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/web.config.ts', 'src/apps/*.ts'],
  format: ['esm'],
  target: 'node22',
  sourcemap: false,
  clean: true,
  dts: true,
  outDir: 'dist',
  treeshake: true,
  minify: false,
  ignoreWatch: [],
  deps: {
    onlyBundle: false,
    neverBundle: [
      ...builtinModules,
      ...builtinModules.map((mod) => `node:${mod}`),
      ...[/^node-karin/],
      ...[/^@karinjs\//],
      '@karinjs/geturls',
      'form-data',
      'image-size',
      'qrcode',
      'silk-wasm',
    ]
  },
})
