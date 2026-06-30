import { dirPath } from '@/root'
import { requireFileSync } from 'node-karin'

/**
 * 读取当前插件的 package.json。
 *
 * @returns package.json 内容。
 */
export const pkg = () => requireFileSync(`${dirPath}/package.json`)

/** 当前插件 npm 包名，如 @karinjs/adapter-qqbot。 */
export const pluginName: string = pkg().name

/** 文件系统目录名：把 npm 包名里的 `/` 规范化为 `-`，与 Karin 框架对齐。 */
export const pluginDirName: string = pluginName.replace(/\//g, '-')
