import fs from 'node:fs'
import {
  watch,
  karinPathBase,
  requireFileSync,
  common,
  logger,
} from 'node-karin'
import { pluginDirName } from '@/utils/plugin'
import { normalizeProxyConfig } from '@/utils/proxy-url'
import type { Config, QQBotConfig, RawConfig } from '@/types/config'

export { pkg, pluginDirName } from '@/utils/plugin'

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

/** 配置目录：${karinPathBase}/@karinjs-adapter-qqbot/config */
const dirConfig = `${karinPathBase}/${pluginDirName}/config`

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
  const user = requireFileSync<RawConfig>(cfgPath)
  const result = formatConfig(user)
  cache = result
  Object.keys(cacheMap).forEach(key => delete cacheMap[key])
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
export const formatConfig = (user: RawConfig): Config => {
  const def = getDefaultConfig()[0]
  return user.map(item => {
    const {
      prodApi,
      sandboxApi,
      tokenApi,
      wsUrl,
      proxy,
      keyboard,
      markdown,
      messageCache,
      event,
      ...rest
    } = item

    return {
      ...def,
      ...rest,
      proxy: normalizeProxyConfig({
        ...def.proxy,
        ...proxy,
        prodApi: proxy?.prodApi || prodApi || def.proxy.prodApi,
        sandboxApi: proxy?.sandboxApi || sandboxApi || def.proxy.sandboxApi,
        tokenApi: proxy?.tokenApi || tokenApi || def.proxy.tokenApi,
        prodWs: proxy?.prodWs || proxy?.wsUrl || wsUrl || def.proxy.prodWs,
        sandboxWs: proxy?.sandboxWs || proxy?.wsUrl || wsUrl || def.proxy.sandboxWs,
      }),
      keyboard: { ...def.keyboard, ...keyboard },
      markdown: { ...def.markdown, ...markdown },
      messageCache: { ...def.messageCache, ...messageCache },
      event: { ...def.event, ...event },
    }
  })
}

/**
 * 默认配置
 */
export const getDefaultConfig = (): Config => [
  {
    name: '',
    appId: '',
    secret: '',
    proxy: {
      prodApi: 'https://api.sgroup.qq.com',
      sandboxApi: 'https://sandbox.api.sgroup.qq.com',
      tokenApi: 'https://bots.qq.com/app/getAppAccessToken',
      prodWs: 'wss://api.sgroup.qq.com/websocket/',
      sandboxWs: 'wss://sandbox.api.sgroup.qq.com/websocket/',
    },
    sandbox: false,
    qqEnable: true,
    guildEnable: true,
    guildMode: 0,
    regex: [
      { reg: '^/', rep: '#' },
    ],
    keyboard: { enable: true },
    markdown: { enable: true },
    messageCache: { enable: false, self: false },
    event: { type: 2 },
  },
]

/**
 * 监听配置文件，比较前后差异决定重建 / 销毁 bot
 */
setTimeout(() => {
  watch<RawConfig>(`${dirConfig}/config.json`, (old, now) => {
    const oldConfig = formatConfig(old)
    const nowConfig = formatConfig(now)
    cache = nowConfig
    Object.keys(cacheMap).forEach(key => delete cacheMap[key])
    cache.forEach(v => { cacheMap[v.appId] = v })

    const diff = common.diffArray(oldConfig, nowConfig)

    diff.removed.forEach(v => _destroyBot?.(v.appId))

    if (diff.added.length > 0) {
      const ids = new Set(diff.added.map(v => v.appId))
      nowConfig.forEach(v => {
        if (!ids.has(v.appId)) return
        if (v.event.type === 0) return
        _createBot?.(v)
      })
    }

    diff.common.forEach(curr => {
      const prev = oldConfig.find(c => c.appId === curr.appId)
      if (!prev) return
      if (JSON.stringify(prev) === JSON.stringify(curr)) return
      logger.info(`[QQ Official Bot][配置监听] 配置已变更: ${curr.appId}，重新初始化`)
      _destroyBot?.(prev.appId)
      if (curr.event.type !== 0) _createBot?.(curr)
    })
  })
}, 2000)
