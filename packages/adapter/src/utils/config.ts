import fs from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { watch, karinPathBase, requireFileSync, logger } from 'node-karin'
import { pluginDirName } from '@/utils/plugin'
import type { Config, MessageCacheLevel, QQBotConfig } from '@/types/config'

export { pkg, pluginDirName } from '@/utils/plugin'

let cache: Config | undefined
const cacheMap: Record<string, QQBotConfig> = {}

/**
 * 运行时已经应用的配置快照。
 *
 * `config()` 返回的是内存缓存，调用方（例如扫码登录）可能原地修改它，
 * 因此不能拿缓存本身当作 diff 的基准，必须单独保存一份快照。
 */
let appliedConfig: Config | undefined

/** 串行应用配置差异，避免连续保存时销毁 / 重建交错。 */
let applyQueue: Promise<void> = Promise.resolve()

/** 延迟注入，避免与 core/index.ts 循环依赖 */
let _createBot: ((cfg: QQBotConfig) => Promise<void>) | undefined
let _destroyBot: ((appId: string) => void) | undefined

export const bindHandlers = (createBot: (cfg: QQBotConfig) => Promise<void>, destroyBot: (appId: string) => void) => {
  _createBot = createBot
  _destroyBot = destroyBot
}

const cloneConfig = (data: Config): Config => structuredClone(data)

/** 取运行时快照；首次调用时用当前缓存或磁盘配置初始化。 */
const getAppliedConfig = (): Config => {
  if (!appliedConfig) appliedConfig = cloneConfig(cache ?? readConfigFile())
  return appliedConfig
}

/** 配置目录：${karinPathBase}/@karinjs-adapter-qqbot/config */
const dirConfig = `${karinPathBase}/${pluginDirName}/config`
const configPath = `${dirConfig}/config.json`

const syncCache = (data: Config): void => {
  cache = data
  Object.keys(cacheMap).forEach((key) => delete cacheMap[key])
  data.forEach((v) => {
    cacheMap[v.appId] = v
  })
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
  appliedConfig ??= cloneConfig(result)
  return result
}

/**
 * 直接从磁盘读取配置，不使用内存缓存。
 *
 * `requireFileSync` 自身还有一层 300 秒文件缓存，写盘后必须强制重读，
 * 否则 Web 端保存后拿到的仍是旧配置。
 */
export const readConfigFile = (): Config => {
  if (!fs.existsSync(configPath)) return config()
  return formatConfig(requireFileSync<Config>(configPath, { force: true }))
}

/**
 * 获取单 bot 配置
 */
export const getConfig = (appid: string) => cacheMap[appid]

/**
 * 判断两个机器人配置是否完全一致。
 */
const isSameBotConfig = (prev: QQBotConfig, next: QQBotConfig): boolean => {
  return isDeepStrictEqual(prev, next)
}

/**
 * 销毁单个机器人；单个失败不能影响同一批里的其他机器人。
 */
const destroy = (appId: string): void => {
  try {
    _destroyBot?.(appId)
  } catch (error) {
    logger.error(`[QQ Official Bot][配置监听] 销毁机器人失败 ${appId}:`, error)
  }
}

/**
 * 应用一批配置差异。
 *
 * 以 appId 为单位比较，只销毁 / 重建真正变化的机器人；
 * 未变化的机器人保持现有连接不动。
 */
const applyConfigDiff = async (previous: Config, next: Config): Promise<void> => {
  const previousMap = new Map(previous.map((item) => [item.appId, item]))
  const nextMap = new Map(next.map((item) => [item.appId, item]))
  const creates: QQBotConfig[] = []

  previousMap.forEach((_bot, appId) => {
    if (nextMap.has(appId)) return
    logger.info(`[QQ Official Bot][配置监听] 移除机器人: ${appId}`)
    destroy(appId)
  })

  nextMap.forEach((bot, appId) => {
    const prev = previousMap.get(appId)
    if (!prev) {
      logger.info(`[QQ Official Bot][配置监听] 新增机器人: ${appId}`)
    } else {
      if (isSameBotConfig(prev, bot)) return
      logger.info(`[QQ Official Bot][配置监听] 配置已变更: ${appId}，重新初始化`)
      destroy(appId)
    }
    if (bot.event.type !== 0) creates.push(bot)
  })

  if (creates.length === 0) return

  await Promise.all(
    creates.map(async (bot) => {
      try {
        await _createBot?.(bot)
      } catch (error) {
        logger.error(`[QQ Official Bot][配置监听] 初始化机器人失败 ${bot.appId}:`, error)
      }
    })
  )
}

/**
 * 把一份新配置应用到运行时。
 *
 * 先固定旧快照，再同步更新缓存；随后串行执行差异。这样文件监听即使
 * 在写盘后触发，也会因为快照已经是最新配置而直接跳过，不会重复重建。
 */
export const applyConfigChange = async (data: Config): Promise<void> => {
  const previous = getAppliedConfig()
  const normalized = cloneConfig(formatConfig(data))
  syncCache(normalized)
  appliedConfig = cloneConfig(normalized)

  const task = applyQueue.then(() => applyConfigDiff(previous, normalized))
  applyQueue = task.catch(() => {})
  await task
}

/**
 * 写入配置并立即应用差异。
 *
 * Web 保存、扫码登录和文件监听最终都走这里；写盘后不再依赖
 * `requireFileSync` 的旧缓存判断变化，避免 Web 保存后不重连。
 */
export const writeConfig = (data: Config): Promise<void> => {
  /** 先固定旧快照，避免写盘后首次读取把新配置当成旧配置。 */
  getAppliedConfig()
  fs.mkdirSync(dirConfig, { recursive: true })
  const normalized = formatConfig(data)
  fs.writeFileSync(configPath, JSON.stringify(normalized, null, 2))
  return applyConfigChange(normalized)
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
  return user.map((item) => {
    /** markdown 是历史字段，解构出来即丢弃，见 {@link LegacyQQBotConfig}。 */
    const { markdown: _markdown, messageCache, event, ...rest } = item as LegacyQQBotConfig

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
    regex: [{ reg: '^/', rep: '#' }],
    messageCache: { enable: false, self: false, level: 'standard', ttlHours: 24, maxRows: 200_000 },
    event: { type: 2 },
  },
]

/**
 * 监听配置文件，应用外部修改。
 *
 * 这里不再使用 `watch` 回调里的旧值：node-karin 的 `requireFileSync`
 * 可能已被 Web 接口强制刷新过，旧值会和新值相同。统一以运行时快照为准。
 */
setTimeout(() => {
  watch<Config>(`${dirConfig}/config.json`, (_old, now) => {
    void applyConfigChange(now).catch((error) => {
      logger.error('[QQ Official Bot][配置监听] 应用配置失败:', error)
    })
  })
}, 2000)
