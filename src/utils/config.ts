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
import type { Config, MessageCacheLevel, QQBotConfig, RawConfig } from '@/types/config'

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
const configPath = `${dirConfig}/config.json`

const syncCache = (data: Config): void => {
  cache = data
  Object.keys(cacheMap).forEach(key => delete cacheMap[key])
  data.forEach(v => { cacheMap[v.appId] = v })
}

/**
 * 读取配置
 */
export const config = (): Config => {
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(dirConfig, { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify([], null, 2))
  }
  if (cache) return cache
  const user = requireFileSync<RawConfig>(configPath)
  const result = formatConfig(user)
  syncCache(result)
  return result
}

/**
 * 直接从磁盘读取配置，不使用内存缓存。
 */
export const readConfigFile = (): Config => {
  if (!fs.existsSync(configPath)) return config()
  return formatConfig(requireFileSync<RawConfig>(configPath))
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
  const normalized = formatConfig(data)
  fs.writeFileSync(configPath, JSON.stringify(normalized, null, 2))
  syncCache(normalized)
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
      messageCache: normalizeMessageCache(def.messageCache, messageCache),
      event: { ...def.event, ...event },
    }
  })
}

const MESSAGE_CACHE_LEVELS: MessageCacheLevel[] = ['minimal', 'standard', 'full']

/**
 * 规范化消息缓存配置，非法枚举与越界数值回落默认值。
 *
 * @param def 默认消息缓存配置。
 * @param user 用户消息缓存配置。
 * @returns 补齐并夹取后的消息缓存配置。
 */
const normalizeMessageCache = (
  def: QQBotConfig['messageCache'],
  user?: Partial<QQBotConfig['messageCache']>
): QQBotConfig['messageCache'] => {
  const merged = { ...def, ...user }
  return {
    enable: !!merged.enable,
    self: !!merged.self,
    level: MESSAGE_CACHE_LEVELS.includes(merged.level) ? merged.level : def.level,
    ttlHours: clampNumber(merged.ttlHours, 1, 720, def.ttlHours),
    maxRows: clampNumber(merged.maxRows, 1000, 5_000_000, def.maxRows),
  }
}

/**
 * 将数值夹取到闭区间；非法值返回 fallback。
 *
 * @param value 用户输入值。
 * @param min 最小值。
 * @param max 最大值。
 * @param fallback 非法时使用的默认值。
 * @returns 合法数值。
 */
const clampNumber = (value: unknown, min: number, max: number, fallback: number): number => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(Math.max(Math.trunc(num), min), max)
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
    messageCache: { enable: false, self: false, level: 'standard', ttlHours: 24, maxRows: 200_000 },
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
    syncCache(nowConfig)

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
