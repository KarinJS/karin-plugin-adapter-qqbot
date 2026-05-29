import fs from 'node:fs'
import { dirPath } from '@/root'
import {
  watch,
  basePath,
  requireFileSync,
  common,
  logger,
} from 'node-karin'
import type { Config, QQBotConfig } from '@/types/config'

let cache: Config | undefined
const cacheMap: Record<string, QQBotConfig> = {}

/** 延迟注入，避免与 core/index.ts 循环依赖 */
let _createBot: ((cfg: QQBotConfig) => Promise<void>) | undefined
let _destroyBot: ((appId: string) => void) | undefined

export const bindHandlers = (
  createBot: (cfg: QQBotConfig) => Promise<void>,
  destroyBot: (appId: string) => void
) => {
  _createBot = createBot
  _destroyBot = destroyBot
}

/** package.json */
export const pkg = () => requireFileSync(`${dirPath}/package.json`)

/** npm 包名，如 @karinjs/adapter-qqbot */
const pluginName: string = pkg().name
/** 文件系统目录名：把 npm 包名里的 `/` 规范化为 `-`，与 karin 框架对齐 */
const pluginDirName: string = pluginName.replace(/\//g, '-')
/** 配置目录：${basePath}/@karinjs-adapter-qqbot/config */
const dirConfig = `${basePath}/${pluginDirName}/config`

/**
 * 读取配置
 */
export const config = (): Config => {
  const cfgPath = `${dirConfig}/config.json`
  if (!fs.existsSync(cfgPath)) {
    fs.mkdirSync(dirConfig, { recursive: true })
    fs.writeFileSync(cfgPath, JSON.stringify([], null, 2))
  }
  if (cache) return cache
  const user = requireFileSync<Config>(cfgPath)
  const result = formatConfig(user)
  cache = result
  result.forEach(v => { cacheMap[v.appId] = v })
  return result
}

/**
 * 获取单 bot 配置
 */
export const getConfig = (appid: string) => cacheMap[appid]

/**
 * 写入配置
 */
export const writeConfig = (data: Config) => {
  fs.mkdirSync(dirConfig, { recursive: true })
  fs.writeFileSync(`${dirConfig}/config.json`, JSON.stringify(data, null, 2))
}

/**
 * 用默认值补齐用户配置
 */
export const formatConfig = (user: Config): Config => {
  const def = getDefaultConfig()[0]
  return user.map(item => ({
    ...def,
    ...item,
    keyboard: { ...def.keyboard, ...item.keyboard },
    event: { ...def.event, ...item.event },
  }))
}

/**
 * 默认配置
 */
export const getDefaultConfig = (): Config => [
  {
    name: '',
    appId: '',
    secret: '',
    prodApi: 'https://api.sgroup.qq.com',
    sandboxApi: 'https://sandbox.api.sgroup.qq.com',
    tokenApi: 'https://bots.qq.com/app/getAppAccessToken',
    sandbox: false,
    qqEnable: true,
    guildEnable: true,
    guildMode: 0,
    regex: [
      { reg: '^/', rep: '#' },
    ],
    keyboard: { enable: true },
    event: { type: 2 },
  },
]

/**
 * 监听配置文件，比较前后差异决定重建 / 销毁 bot
 */
setTimeout(() => {
  watch<Config>(`${dirConfig}/config.json`, (old, now) => {
    cache = formatConfig(now)
    cache.forEach(v => { cacheMap[v.appId] = v })

    const diff = common.diffArray(old, now)

    diff.removed.forEach(v => _destroyBot?.(v.appId))

    if (diff.added.length > 0) {
      const ids = new Set(diff.added.map(v => v.appId))
      cache.forEach(v => {
        if (!ids.has(v.appId)) return
        if (v.event.type === 0) return
        _createBot?.(v)
      })
    }

    diff.common.forEach(curr => {
      const prev = old.find(c => c.appId === curr.appId)
      if (!prev) return
      if (JSON.stringify(prev) === JSON.stringify(curr)) return
      logger.info(`[QQ Official Bot][配置监听] 配置已变更: ${curr.appId}，重新初始化`)
      _destroyBot?.(prev.appId)
      if (curr.event.type !== 0) _createBot?.(curr)
    })
  })
}, 2000)
