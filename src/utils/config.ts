import fs from 'node:fs'
import {
  watch,
  karinPathBase,
  requireFileSync,
  common,
  logger,
} from 'node-karin'
import { pluginDirName } from '@/utils/plugin'
import type { Config, MessageCacheLevel, QQBotConfig } from '@/types/config'

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
  const user = requireFileSync<Config>(configPath)
  const result = formatConfig(user)
  syncCache(result)
  return result
}

/**
 * 直接从磁盘读取配置，不使用内存缓存。
 */
export const readConfigFile = (): Config => {
  if (!fs.existsSync(configPath)) return config()
  return formatConfig(requireFileSync<Config>(configPath))
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
 * 已废弃的历史配置字段。
 *
 * `markdown.enable` 在 2.0 之前默认为 false，2.0 把字段整个删除，2.1 又以默认 true
 * 重新引入——老配置里残留的 false 会静默覆盖新默认值，把用户按回已经不需要的经典
 * 通道，表现为"一部分消息走 Markdown 一部分不走"。现在通道由适配器自行决定
 * （QQ 单聊 / 群聊直接走 Markdown，频道按平台权限自动降级），因此读到这个字段
 * 就丢弃，下次写盘时它会自然从 config.json 里消失。
 */
type LegacyQQBotConfig = QQBotConfig & { markdown?: unknown }

/**
 * 用默认值补齐用户配置，并清理已废弃字段
 */
export const formatConfig = (user: Config): Config => {
  const def = getDefaultConfig()[0]
  return user.map(item => {
    /** markdown 是历史字段，解构出来即丢弃，见 {@link LegacyQQBotConfig}。 */
    const {
      markdown,
      messageCache,
      event,
      ...rest
    } = item as LegacyQQBotConfig

    return {
      ...def,
      ...rest,
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
    appId: '',
    secret: '',
    qqEnable: true,
    guildEnable: true,
    guildMode: 0,
    regex: [
      { reg: '^/', rep: '#' },
    ],
    messageCache: { enable: false, self: false, level: 'standard', ttlHours: 24, maxRows: 200_000 },
    event: { type: 2 },
  },
]

/**
 * 监听配置文件，比较前后差异决定重建 / 销毁 bot
 */
setTimeout(() => {
  watch<Config>(`${dirConfig}/config.json`, (old, now) => {
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
