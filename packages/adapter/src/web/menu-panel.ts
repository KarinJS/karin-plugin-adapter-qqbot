import {
  createBadRequestResponse,
  createServerErrorResponse,
  createSuccessResponse,
  getBot,
  logger,
  router,
} from 'node-karin'
import type { Request, Response } from 'node-karin/express'
import { QQBotApi } from '@/core/api'
import type { Menu, MenuItem, Panel, PanelItem, PanelTargetType, SubMenuItem } from '@/core/api/types'
import { createAxiosInstance, getAccessToken, getBotAccessToken } from '@/core/internal/axios'
import { readConfigFile } from '@/utils/config'

const PANEL_SCOPES = ['c2c', 'group', 'channel', 'dm'] as const
const PANEL_TARGET_TYPES = ['all', 'specific'] as const
const PANEL_ITEM_TYPES = ['command', 'link'] as const
const MENU_ITEM_TYPES = ['switch', 'send_message', 'link', 'menu'] as const
const SUB_MENU_ITEM_TYPES = ['send_message', 'link'] as const
const TARGET_OPS = ['add', 'del'] as const

const MAX_PANEL_ITEMS = 20
const MAX_MENU_ITEMS = 10
const MAX_SUB_MENU_ITEMS = 5
/** 创建面板时一次最多携带 20 个关联对象。 */
const MAX_CREATE_OPENIDS = 20
/** 修改关联对象接口单次最多操作 20 个。 */
const MAX_TARGET_OPENIDS = 20

class ValidationError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * QQ 开放平台按「字符」计数，一个中文汉字算 2 个字符。
 * 这里用 Unicode 区间近似：CJK 统一表意文字及更靠后的字符按 2 计。
 */
const charUnits = (value: string): number => {
  let units = 0
  for (const char of value) units += (char.codePointAt(0) ?? 0) > 0x2e80 ? 2 : 1
  return units
}

interface StringRule {
  max?: number
  maxUnits?: number
  required?: boolean
}

const readString = (value: unknown, field: string, rule: StringRule = {}): string => {
  if (value === undefined || value === null) {
    if (rule.required) throw new ValidationError(`请填写${field}`)
    return ''
  }
  if (typeof value !== 'string') throw new ValidationError(`${field}必须是字符串`)

  const result = value.trim()
  if (rule.required && !result) throw new ValidationError(`请填写${field}`)
  if (rule.max !== undefined && result.length > rule.max) {
    throw new ValidationError(`${field}不能超过 ${rule.max} 个字符`)
  }
  if (rule.maxUnits !== undefined && charUnits(result) > rule.maxUnits) {
    throw new ValidationError(`${field}不能超过 ${rule.maxUnits} 个字符（中文按 2 个字符计算）`)
  }
  return result
}

const readEnum = <T extends string>(value: unknown, field: string, values: readonly T[], fallback?: T): T => {
  if ((value === undefined || value === null || value === '') && fallback !== undefined) return fallback
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new ValidationError(`${field}只能是 ${values.join('、')}`)
  }
  return value as T
}

const readBoolean = (value: unknown, field: string, fallback: boolean): boolean => {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'boolean') return value
  if (value === 0 || value === 1) return value === 1
  throw new ValidationError(`${field}必须是布尔值`)
}

const readInteger = (value: unknown, field: string, min: number, max: number, fallback: number): number => {
  if (value === undefined || value === null || value === '') return fallback
  const result = Number(value)
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new ValidationError(`${field}必须是 ${min} 到 ${max} 之间的整数`)
  }
  return result
}

/** 可选整数：字段缺省时返回 undefined，而不是回退到某个值。 */
const readOptionalInteger = (value: unknown, field: string, min: number, max: number): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  return readInteger(value, field, min, max, min)
}

const readArray = (value: unknown, field: string): unknown[] => {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new ValidationError(`${field}必须是数组`)
  return value
}

const readLink = (value: unknown, field: string): string => {
  const link = readString(value, field, { max: 2048, required: true })
  if (!link.startsWith('https://')) throw new ValidationError(`${field}必须以 https:// 开头`)

  try {
    const url = new URL(link)
    if (url.protocol !== 'https:') throw new Error('protocol')
  } catch {
    throw new ValidationError(`${field}不是有效的 https 链接`)
  }
  return link
}

const readOpenids = (value: unknown, field: string, max: number): string[] => {
  const list = readArray(value, field)
  if (list.length > max) throw new ValidationError(`${field}一次最多 ${max} 个`)

  const result: string[] = []
  const seen = new Set<string>()
  list.forEach((item, index) => {
    const openid = readString(item, `${field}第 ${index + 1} 项`, { max: 128, required: true })
    if (seen.has(openid)) return
    seen.add(openid)
    result.push(openid)
  })
  return result
}

const sanitizePanelItem = (raw: unknown, index: number): PanelItem => {
  if (!isRecord(raw)) throw new ValidationError(`第 ${index + 1} 个面板元素格式不正确`)

  const label = `第 ${index + 1} 个面板元素`
  const type = readEnum(raw.type, `${label}的类型`, PANEL_ITEM_TYPES)
  const name = readString(raw.name, `${label}的名称`, { maxUnits: 14, required: true })
  const desc = readString(raw.desc, `${label}的描述`, { maxUnits: 30 })
  const onlyAdmin = readBoolean(raw.only_admin, `${label}的管理员限制`, false)

  const item: PanelItem = { type, name, only_admin: onlyAdmin }
  if (desc) item.desc = desc
  if (type === 'link') item.link = readLink(raw.link, `${label}的链接`)
  return item
}

const sanitizePanel = (raw: unknown): Panel => {
  if (!isRecord(raw)) throw new ValidationError('面板配置格式不正确')

  const items = readArray(raw.items, '面板元素列表')
  if (items.length === 0) throw new ValidationError('面板至少需要一个元素')
  if (items.length > MAX_PANEL_ITEMS) {
    throw new ValidationError(`一个面板最多 ${MAX_PANEL_ITEMS} 个元素`)
  }

  const remark = readString(raw.remark, '面板备注', { maxUnits: 255 })
  const version = readOptionalInteger(raw.version, '面板版本号', 0, Number.MAX_SAFE_INTEGER)
  const panel: Panel = { items: items.map(sanitizePanelItem) }
  if (remark) panel.remark = remark
  if (version !== undefined) panel.version = version
  return panel
}

const sanitizeSubMenuItem = (raw: unknown, index: number): SubMenuItem => {
  if (!isRecord(raw)) throw new ValidationError(`第 ${index + 1} 个子菜单项格式不正确`)

  const label = `第 ${index + 1} 个子菜单项`
  const type = readEnum(raw.type, `${label}的类型`, SUB_MENU_ITEM_TYPES)
  const name = readString(raw.name, `${label}的名称`, { maxUnits: 14, required: true })

  const item: SubMenuItem = { type, name }
  if (type === 'send_message') {
    item.send_message = readString(raw.send_message, `${label}的发送内容`, { max: 512, required: true })
  } else {
    item.link = readLink(raw.link, `${label}的链接`)
  }
  return item
}

const sanitizeMenuItem = (raw: unknown, index: number): MenuItem => {
  if (!isRecord(raw)) throw new ValidationError(`第 ${index + 1} 个菜单项格式不正确`)

  const label = `第 ${index + 1} 个菜单项`
  const type = readEnum(raw.type, `${label}的类型`, MENU_ITEM_TYPES)
  const name = readString(raw.name, `${label}的名称`, { maxUnits: 10, required: true })

  const item: MenuItem = { type, name }
  if (type === 'switch') {
    if (!isRecord(raw.switch)) throw new ValidationError(`${label}缺少开关配置`)
    item.switch = {
      switch_id: readString(raw.switch.switch_id, `${label}的开关标识`, { max: 64, required: true }),
      default: readBoolean(raw.switch.default, `${label}的默认状态`, false),
    }
  } else if (type === 'send_message') {
    item.send_message = readString(raw.send_message, `${label}的发送内容`, { max: 512, required: true })
  } else if (type === 'link') {
    item.link = readLink(raw.link, `${label}的链接`)
  } else {
    const subItems = readArray(raw.sub_menu_items, `${label}的子菜单`)
    if (subItems.length === 0) throw new ValidationError(`${label}至少需要一个子菜单项`)
    if (subItems.length > MAX_SUB_MENU_ITEMS) {
      throw new ValidationError(`${label}最多 ${MAX_SUB_MENU_ITEMS} 个子菜单项`)
    }
    item.sub_menu_items = subItems.map(sanitizeSubMenuItem)
  }
  return item
}

const sanitizeMenu = (raw: unknown): Menu => {
  if (!isRecord(raw)) throw new ValidationError('菜单配置格式不正确')

  const items = readArray(raw.items, '菜单项列表')
  if (items.length > MAX_MENU_ITEMS) {
    throw new ValidationError(`自定义菜单最多 ${MAX_MENU_ITEMS} 个一级菜单`)
  }
  return { items: items.map(sanitizeMenuItem) }
}

const readAppId = (value: unknown): string => {
  const appId = readString(value, 'appId', { max: 128, required: true })
  if (!readConfigFile().some((item) => item.appId === appId)) {
    throw new ValidationError(`找不到 AppID 为 ${appId} 的机器人配置`)
  }
  return appId
}

/**
 * 取得某个机器人的官方 API 门面。
 *
 * 优先复用适配器里已经注册的实例；机器人停用或尚未连接时，用配置里的
 * AppSecret 临时取一次 access_token，让菜单/面板仍然可以管理。
 */
const resolveApi = async (appId: string): Promise<QQBotApi> => {
  let bot: { super?: QQBotApi } | null = null
  try {
    bot = getBot(appId) as unknown as { super?: QQBotApi } | null
  } catch {
    bot = null
  }
  if (bot?.super) return bot.super

  const config = readConfigFile().find((item) => item.appId === appId)
  if (!config) throw new ValidationError(`找不到 AppID 为 ${appId} 的机器人配置`)
  if (!config.secret) throw new ValidationError(`机器人 ${appId} 缺少 AppSecret，请先完成扫码授权`)

  if (!getBotAccessToken(appId)) {
    try {
      await getAccessToken(appId, config.secret)
    } catch {
      throw new ValidationError(`无法获取机器人 ${appId} 的 access_token，请检查 AppSecret 或网络`)
    }
  }

  return new QQBotApi(createAxiosInstance(appId))
}

/** 把官方接口的多行错误压成前端能直接展示的一句话。 */
const publicMessage = (error: unknown): string => {
  if (error instanceof ValidationError) return error.message
  if (error instanceof Error) {
    const detail = error.message.split('\n').find((line) => line.startsWith('错误详情:'))
    if (detail) return detail.replace(/^错误详情:\s*/, '')
    return error.message.split('\n')[0] || '服务器内部错误'
  }
  return '服务器内部错误'
}

const handleError = (res: Response, error: unknown) => {
  if (error instanceof ValidationError) {
    createBadRequestResponse(res, error.message)
    return
  }

  logger.error('[QQBot Web] 菜单面板接口失败:', error)
  createServerErrorResponse(res, publicMessage(error))
}

const handleAsync = (handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response) => {
  void handler(req, res).catch((error) => handleError(res, error))
}

/**
 * 注册自定义菜单与指令面板接口。
 *
 * 这些路由挂在 Karin 的 `/api/v1` 下，和配置接口一样继承主 WebUI 的鉴权。
 * 菜单是全局单例；指令面板按 `scope` 查询，创建、修改、删除都需要 `panel_id`。
 *
 * 注意：Karin 的鉴权中间件只放行 GET / POST，PUT / DELETE 会在进入路由前
 * 直接返回 405「方法不允许」。所以写操作统一用 POST，删除用 `/delete` 子路径。
 */
export const registerMenuPanelRoutes = () => {
  router.get(
    '/qqbot/menu',
    handleAsync(async (req, res) => {
      const appId = readAppId(req.query.appId)
      const api = await resolveApi(appId)
      createSuccessResponse(res, await api.menu.getMenu())
    })
  )

  router.post(
    '/qqbot/menu',
    handleAsync(async (req, res) => {
      const body = isRecord(req.body) ? req.body : {}
      const appId = readAppId(body.appId)
      const api = await resolveApi(appId)

      // 不传 menu 或传入空列表都表示清空菜单。
      if (body.menu === undefined || body.menu === null) {
        createSuccessResponse(res, await api.menu.updateMenu())
        return
      }

      const menu = sanitizeMenu(body.menu)
      createSuccessResponse(res, await api.menu.updateMenu(menu.items?.length ? menu : undefined))
    })
  )

  router.get(
    '/qqbot/panels',
    handleAsync(async (req, res) => {
      const appId = readAppId(req.query.appId)
      const scope = readEnum(req.query.scope, 'scope', PANEL_SCOPES)
      const cursor = readString(req.query.cursor, 'cursor', { max: 256 })
      const limit = readInteger(req.query.limit, 'limit', 1, 50, 50)

      const api = await resolveApi(appId)
      createSuccessResponse(res, await api.panels.getPanelList({ scope, cursor: cursor || undefined, limit }))
    })
  )

  router.post(
    '/qqbot/panels',
    handleAsync(async (req, res) => {
      const body = isRecord(req.body) ? req.body : {}
      const appId = readAppId(body.appId)
      const scope = readEnum(body.scope, 'scope', PANEL_SCOPES)
      const targetType: PanelTargetType = readEnum(body.target_type, 'target_type', PANEL_TARGET_TYPES, 'all')

      if ((scope === 'channel' || scope === 'dm') && targetType !== 'all') {
        throw new ValidationError('channel / dm 场景只支持全局面板')
      }

      const userOpenids = readOpenids(body.user_openids, 'user_openids', MAX_CREATE_OPENIDS)
      const groupOpenids = readOpenids(body.group_openids, 'group_openids', MAX_CREATE_OPENIDS)

      if (targetType === 'specific') {
        if (scope === 'c2c' && userOpenids.length === 0) {
          throw new ValidationError('指定用户生效时至少需要一个 user_openid')
        }
        if (scope === 'group' && groupOpenids.length === 0) {
          throw new ValidationError('指定群生效时至少需要一个 group_openid')
        }
      }

      const panel = sanitizePanel(body.panel)
      const api = await resolveApi(appId)
      createSuccessResponse(
        res,
        await api.panels.createPanel({
          scope,
          target_type: targetType,
          panel,
          ...(targetType === 'specific' && scope === 'c2c' ? { user_openids: userOpenids } : {}),
          ...(targetType === 'specific' && scope === 'group' ? { group_openids: groupOpenids } : {}),
        })
      )
    })
  )

  router.get(
    '/qqbot/panels/:panelId',
    handleAsync(async (req, res) => {
      const appId = readAppId(req.query.appId)
      const panelId = readString(req.params.panelId, 'panelId', { max: 128, required: true })
      const api = await resolveApi(appId)
      createSuccessResponse(res, await api.panels.getPanel(panelId))
    })
  )

  router.post(
    '/qqbot/panels/:panelId',
    handleAsync(async (req, res) => {
      const body = isRecord(req.body) ? req.body : {}
      const appId = readAppId(body.appId)
      const panelId = readString(req.params.panelId, 'panelId', { max: 128, required: true })
      const panel = sanitizePanel(body.panel)
      const api = await resolveApi(appId)
      createSuccessResponse(res, await api.panels.updatePanel(panelId, panel))
    })
  )

  router.post(
    '/qqbot/panels/:panelId/delete',
    handleAsync(async (req, res) => {
      const body = isRecord(req.body) ? req.body : {}
      const appId = readAppId(body.appId)
      const panelId = readString(req.params.panelId, 'panelId', { max: 128, required: true })
      const api = await resolveApi(appId)
      createSuccessResponse(res, await api.panels.deletePanel(panelId))
    })
  )

  router.post(
    '/qqbot/panels/:panelId/target',
    handleAsync(async (req, res) => {
      const body = isRecord(req.body) ? req.body : {}
      const appId = readAppId(body.appId)
      const panelId = readString(req.params.panelId, 'panelId', { max: 128, required: true })
      const op = readEnum(body.op, 'op', TARGET_OPS)
      const userOpenids = readOpenids(body.user_openids, 'user_openids', MAX_TARGET_OPENIDS)
      const groupOpenids = readOpenids(body.group_openids, 'group_openids', MAX_TARGET_OPENIDS)

      if (userOpenids.length === 0 && groupOpenids.length === 0) {
        throw new ValidationError('至少需要一个 user_openid 或 group_openid')
      }
      if (userOpenids.length > 0 && groupOpenids.length > 0) {
        throw new ValidationError('一次只能操作一种关联对象')
      }

      const api = await resolveApi(appId)
      createSuccessResponse(
        res,
        await api.panels.updatePanelTarget(panelId, {
          op,
          ...(userOpenids.length > 0 ? { user_openids: userOpenids } : {}),
          ...(groupOpenids.length > 0 ? { group_openids: groupOpenids } : {}),
        })
      )
    })
  )
}
