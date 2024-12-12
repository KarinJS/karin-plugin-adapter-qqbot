import { dirPath } from '@/utils'
import {
  watch,
  basePath,
  filesByExt,
  copyConfigSync,
  requireFileSync,
} from 'node-karin'
import type { Config } from '@/types/config'

let cache: Config

/**
 * @description package.json
 */
export const pkg = () => requireFileSync(`${dirPath}/package.json`)

/** 用户配置的插件名称 */
const pluginName = pkg().name.replace(/\//g, '-')
/** 用户配置 */
const dirConfig = `${basePath}/${pluginName}/config`
/** 默认配置 */
const defConfig = `${dirPath}/config/config`

/**
 * @description 初始化配置文件
 */
copyConfigSync(defConfig, dirConfig, ['.yaml'])

/**
 * @description 配置文件
 */
export const config = (): Config => {
  if (cache) return cache
  const user = requireFileSync(`${dirConfig}/config.yaml`)
  const def = requireFileSync(`${defConfig}/config.yaml`)
  const result: Config = {}
  for (const key in user) {
    result[key] = {
      ...def[key],
      ...user[key],
      event: {
        ...def.default.event,
        ...user?.[key].event
      }
    }
  }

  cache = result
  return result
}

/**
 * @description 监听配置文件
 */
setTimeout(() => {
  const list = filesByExt(dirConfig, '.yaml', 'abs')
  list.forEach(file => watch(file, (old, now) => {
    cache = {}
  }))
}, 2000)
