import { getBot, router } from 'node-karin'
import type { Request, Response } from 'node-karin/express'
import { getDefaultConfig, formatConfig, pkg, readConfigFile, writeConfig } from '@/utils/config'
import type { Config, MessageCacheLevel, QQBotConfig } from '@/types/config'

const MAX_BOTS = 50
const MAX_REGEX_RULES = 50
const EVENT_TYPES = [0, 1, 2] as const
const MESSAGE_CACHE_LEVELS: MessageCacheLevel[] = ['minimal', 'standard', 'full']

class ValidationError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const readString = (value: unknown, field: string, maxLength = 4096): string => {
  if (typeof value !== 'string') throw new ValidationError(`${field} 必须是字符串`)
  const result = value.trim()
  if (result.length > maxLength) throw new ValidationError(`${field} 长度不能超过 ${maxLength} 个字符`)
  return result
}

const readBoolean = (value: unknown, field: string, fallback: boolean): boolean => {
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  if (value === 0 || value === 1) return value === 1
  throw new ValidationError(`${field} 必须是布尔值`)
}

const readInteger = (value: unknown, field: string, min: number, max: number, fallback: number): number => {
  if (value === undefined || value === null || value === '') return fallback
  const result = Number(value)
  if (!Number.isInteger(result)) throw new ValidationError(`${field} 必须是整数`)
  if (result < min || result > max) throw new ValidationError(`${field} 必须在 ${min} 到 ${max} 之间`)
  return result
}

const readEventType = (value: unknown, field: string): 0 | 1 | 2 => {
  const result = readInteger(value, field, 0, 2, 2)
  if (!EVENT_TYPES.includes(result as 0 | 1 | 2)) throw new ValidationError(`${field} 只能是 0、1 或 2`)
  return result as 0 | 1 | 2
}

const readGuildMode = (value: unknown, field: string): 0 | 1 => {
  const result = readInteger(value, field, 0, 1, 0)
  return result === 1 ? 1 : 0
}

const readMessageCacheLevel = (value: unknown, field: string): MessageCacheLevel => {
  if (value === undefined || value === null || value === '') return 'standard'
  if (typeof value !== 'string' || !MESSAGE_CACHE_LEVELS.includes(value as MessageCacheLevel)) {
    throw new ValidationError(`${field} 只能是 minimal、standard 或 full`)
  }
  return value as MessageCacheLevel
}

/**
 * 把前端提交的 JSON 解析成受信任的机器人配置。
 *
 * `formatConfig` 只负责补默认值和清理历史字段，不校验类型；写盘前的类型边界必须在这里收住。
 */
const parseConfig = (input: unknown): Config => {
  if (!Array.isArray(input)) throw new ValidationError('配置必须是机器人数组')
  if (input.length > MAX_BOTS) throw new ValidationError(`最多只能配置 ${MAX_BOTS} 个机器人`)

  const defaults = getDefaultConfig()[0]
  const seen = new Set<string>()

  const config = input.map((raw, index) => {
    if (!isRecord(raw)) throw new ValidationError(`第 ${index + 1} 个机器人配置格式不正确`)

    const label = `第 ${index + 1} 个机器人`
    const appId = readString(raw.appId, `${label}的 appId`, 128)
    if (!appId) throw new ValidationError(`${label}缺少 appId`)
    if (/\s/.test(appId)) throw new ValidationError(`${label}的 appId 不能包含空白字符`)
    if (seen.has(appId)) throw new ValidationError(`appId ${appId} 重复`)
    seen.add(appId)

    const secret = readString(raw.secret ?? '', `${label}的 secret`, 4096)
    const event = isRecord(raw.event) ? raw.event : {}
    const messageCache = isRecord(raw.messageCache) ? raw.messageCache : {}

    const regex = Array.isArray(raw.regex)
      ? raw.regex
          .slice(0, MAX_REGEX_RULES)
          .map((rule, ruleIndex) => {
            if (!isRecord(rule)) throw new ValidationError(`${label}的第 ${ruleIndex + 1} 条正则格式不正确`)
            return {
              reg: readString(rule.reg, `${label}的第 ${ruleIndex + 1} 条正则表达式`, 512),
              rep: readString(rule.rep ?? '', `${label}的第 ${ruleIndex + 1} 条替换文本`, 512),
            }
          })
          .filter((rule) => rule.reg.length > 0)
      : []

    // 保留适配器历史版本写入的额外字段（例如 name、proxy），避免 Web 保存时静默丢配置。
    const extra = { ...raw }
    for (const key of [
      'appId',
      'secret',
      'qqEnable',
      'guildEnable',
      'guildMode',
      'regex',
      'messageCache',
      'event',
      'markdown',
    ]) {
      delete extra[key]
    }

    const bot: QQBotConfig = {
      ...extra,
      appId,
      secret,
      qqEnable: readBoolean(raw.qqEnable, `${label}的 QQ 场景开关`, true),
      guildEnable: readBoolean(raw.guildEnable, `${label}的频道场景开关`, true),
      guildMode: readGuildMode(raw.guildMode, `${label}的频道模式`),
      regex,
      messageCache: {
        enable: readBoolean(messageCache.enable, `${label}的消息缓存开关`, defaults.messageCache.enable),
        self: readBoolean(messageCache.self, `${label}的自身消息缓存开关`, defaults.messageCache.self),
        level: readMessageCacheLevel(messageCache.level, `${label}的消息缓存级别`),
        ttlHours: readInteger(
          messageCache.ttlHours,
          `${label}的缓存保留小时数`,
          1,
          720,
          defaults.messageCache.ttlHours
        ),
        maxRows: readInteger(
          messageCache.maxRows,
          `${label}的缓存最大行数`,
          1000,
          5_000_000,
          defaults.messageCache.maxRows
        ),
      },
      event: { type: readEventType(event.type, `${label}的事件接收方式`) },
    } as QQBotConfig

    return bot
  })

  return formatConfig(config)
}

const success = (res: Response, data: unknown) => {
  res.json({ success: true, data })
}

const failure = (res: Response, status: number, message: string) => {
  res.status(status).json({ success: false, message })
}

const handleError = (res: Response, error: unknown) => {
  if (error instanceof ValidationError) {
    failure(res, 400, error.message)
    return
  }
  failure(res, 500, error instanceof Error ? error.message : '服务器内部错误')
}

const readBodyConfig = (req: Request): unknown => {
  const body = req.body as unknown
  if (isRecord(body) && 'config' in body) return body.config
  return body
}

/**
 * 注册插件自己的配置与运行状态接口。
 *
 * 这些路由挂在 Karin 的 `/api/v1` 路由上，因此自动继承 Karin 的 JWT / HTTP_AUTH_KEY 鉴权。
 */
export const registerConfigRoutes = () => {
  router.get('/qqbot/config', (_req, res) => {
    try {
      success(res, {
        config: readConfigFile(),
        defaults: getDefaultConfig()[0],
        version: pkg().version,
      })
    } catch (error) {
      handleError(res, error)
    }
  })

  router.post('/qqbot/config', (req, res) => {
    try {
      const config = parseConfig(readBodyConfig(req))
      writeConfig(config)
      success(res, { config: readConfigFile() })
    } catch (error) {
      handleError(res, error)
    }
  })

  router.get('/qqbot/status', (_req, res) => {
    try {
      const config = readConfigFile()
      const bots = config.map((item) => {
        let bot: ReturnType<typeof getBot> = null
        try {
          bot = getBot(item.appId)
        } catch {
          bot = null
        }

        return {
          appId: item.appId,
          online: Boolean(bot),
          name: bot?.account?.name || '',
          avatar: bot?.account?.avatar || '',
          eventType: item.event.type,
        }
      })

      success(res, {
        bots,
        uptime: Math.round(process.uptime()),
        version: pkg().version,
      })
    } catch (error) {
      handleError(res, error)
    }
  })
}
