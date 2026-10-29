import { stableStringify } from './stableStringify'
import type {
  CreatePanelRequest,
  GetMenuResponse,
  Menu,
  MenuItem,
  MenuItemType,
  Panel,
  PanelItem,
  PanelItemType,
  PanelRecord,
  PanelScene,
  PanelTargetType,
  SubMenuItem,
} from './menuPanelTypes'

export const MAX_PANEL_ITEMS = 20
export const MAX_MENU_ITEMS = 10
export const MAX_SUB_MENU_ITEMS = 5
export const MAX_PANELS = 20
export const MAX_CREATE_OPENIDS = 20
export const MAX_PANEL_OPENIDS = 1000
export const MAX_PANEL_TARGET_BATCH = 20

export interface PanelItemDraft {
  key: string
  type: PanelItemType
  name: string
  desc: string
  onlyAdmin: boolean
  link: string
}

export interface PanelSavedSnapshot {
  panel: Panel
  userOpenids: string[]
  groupOpenids: string[]
  version: number | null
}

export interface PanelDraft {
  key: string
  panelId: string | null
  scope: PanelScene
  targetType: PanelTargetType
  userOpenids: string[]
  groupOpenids: string[]
  remark: string
  items: PanelItemDraft[]
  version: number | null
  createdAt?: string
  updatedAt?: string
  /** 指定生效面板的关联对象是否已经从详情接口拉回来。 */
  targetLoaded: boolean
  /** 读取生效对象失败的原因；非空时禁止保存，避免误删服务端的关联对象。 */
  targetError: string | null
  saved: PanelSavedSnapshot | null
  baseline: string
}

export interface MenuSubItemDraft {
  key: string
  type: Extract<MenuItemType, 'send_message' | 'link'>
  name: string
  sendMessage: string
  link: string
}

export interface MenuItemDraft {
  key: string
  type: MenuItemType
  name: string
  sendMessage: string
  link: string
  switchId: string
  switchDefault: boolean
  subItems: MenuSubItemDraft[]
}

export interface MenuDraft {
  items: MenuItemDraft[]
  savedItems: MenuItemDraft[]
  version: number | null
  baseline: string
}

let keySeed = 0

export const nextDraftKey = (prefix: string) => `${prefix}-${++keySeed}`

/** 中文按 2 个字符计算，和 QQ 开放平台的计数方式保持一致。 */
export const charUnits = (value: string): number => {
  let units = 0
  for (const char of value) units += (char.codePointAt(0) ?? 0) > 0x2e80 ? 2 : 1
  return units
}

export const isHttpsLink = (value: string): boolean => {
  if (!value.startsWith('https://')) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export const emptyPanelItem = (type: PanelItemType = 'command'): PanelItemDraft => ({
  key: nextDraftKey('panel-item'),
  type,
  name: '',
  desc: '',
  onlyAdmin: false,
  link: '',
})

export const emptyMenuSubItem = (): MenuSubItemDraft => ({
  key: nextDraftKey('menu-sub'),
  type: 'send_message',
  name: '',
  sendMessage: '',
  link: '',
})

export const emptyMenuItem = (): MenuItemDraft => ({
  key: nextDraftKey('menu-item'),
  type: 'send_message',
  name: '',
  sendMessage: '',
  link: '',
  switchId: '',
  switchDefault: false,
  subItems: [],
})

export const emptyPanelDraft = (scope: PanelScene): PanelDraft => ({
  key: nextDraftKey('panel'),
  panelId: null,
  scope,
  targetType: 'all',
  userOpenids: [],
  groupOpenids: [],
  remark: '',
  items: [],
  version: null,
  targetLoaded: true,
  targetError: null,
  saved: null,
  baseline: '',
})

export const emptyMenuDraft = (): MenuDraft => {
  const items: MenuItemDraft[] = []
  return {
    items,
    savedItems: [],
    version: null,
    baseline: stableStringify({ items: menuContentItems(items) }),
  }
}

const panelItemToDraft = (item: PanelItem): PanelItemDraft => ({
  key: nextDraftKey('panel-item'),
  type: item.type === 'link' ? 'link' : 'command',
  name: item.name ?? '',
  desc: item.desc ?? '',
  onlyAdmin: item.only_admin ?? false,
  link: item.link ?? '',
})

const subMenuItemToDraft = (item: SubMenuItem): MenuSubItemDraft => ({
  key: nextDraftKey('menu-sub'),
  type: item.type === 'link' ? 'link' : 'send_message',
  name: item.name ?? '',
  sendMessage: item.send_message ?? '',
  link: item.link ?? '',
})

const menuItemToDraft = (item: MenuItem): MenuItemDraft => ({
  key: nextDraftKey('menu-item'),
  type: item.type ?? 'send_message',
  name: item.name ?? '',
  sendMessage: item.send_message ?? '',
  link: item.link ?? '',
  switchId: item.switch?.switch_id ?? '',
  switchDefault: item.switch?.default ?? false,
  subItems: (item.sub_menu_items ?? []).map(subMenuItemToDraft),
})

const cloneMenuItems = (items: MenuItemDraft[]): MenuItemDraft[] =>
  items.map((item) => ({
    ...item,
    subItems: item.subItems.map((sub) => ({ ...sub })),
  }))

export const panelRecordToDraft = (record: PanelRecord): PanelDraft => {
  const draft: PanelDraft = {
    key: nextDraftKey('panel'),
    panelId: record.panel_id,
    scope: record.scope as PanelScene,
    targetType: record.target_type,
    userOpenids: [],
    groupOpenids: [],
    remark: record.panel.remark ?? '',
    items: (record.panel.items ?? []).map(panelItemToDraft),
    version: record.version ?? record.panel.version ?? null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    targetLoaded: record.target_type === 'all',
    targetError: null,
    saved: null,
    baseline: '',
  }
  // 详情接口会在 panel 里带上 version 等只读字段，统一存归一化后的内容，
  // 否则基线会把只读字段也算进去，面板一打开就是 dirty。
  draft.saved = {
    panel: panelContentPayload(draft),
    userOpenids: [],
    groupOpenids: [],
    version: draft.version,
  }
  draft.baseline = stableStringify(panelSignature(draft))
  return draft
}

export const menuResponseToDraft = (response: GetMenuResponse): MenuDraft => {
  const items = (response.menu?.items ?? []).map(menuItemToDraft)
  return {
    items,
    savedItems: cloneMenuItems(items),
    version: response.version,
    baseline: stableStringify({ items: menuContentItems(items) }),
  }
}

const panelContentPayload = (draft: PanelDraft): Panel => {
  const items = draft.items.map((item) => {
    const name = item.name.trim()
    const desc = item.desc.trim()
    const next: PanelItem = {
      type: item.type,
      name,
      only_admin: item.onlyAdmin,
    }
    if (desc) next.desc = desc
    if (item.type === 'link') next.link = item.link.trim()
    return next
  })

  const panel: Panel = { items }
  const remark = draft.remark.trim()
  if (remark) panel.remark = remark
  return panel
}

export const panelSignature = (draft: PanelDraft): unknown => {
  const signature: Record<string, unknown> = {
    scope: draft.scope,
    targetType: draft.targetType,
    panel: panelContentPayload(draft),
  }
  if (draft.targetType === 'specific') {
    signature.userOpenids = draft.scope === 'c2c' ? draft.userOpenids : []
    signature.groupOpenids = draft.scope === 'group' ? draft.groupOpenids : []
  }
  return signature
}

/**
 * 已经发出去的请求体对应的签名。
 *
 * 保存期间用户可能继续编辑，草稿会和请求体不一致；
 * 基线必须按请求体算，否则保存成功后会把这段编辑误判成已保存。
 */
export const panelSignatureOf = (params: {
  scope: PanelScene
  targetType: PanelTargetType
  panel: Panel
  userOpenids: string[]
  groupOpenids: string[]
}): string => {
  const signature: Record<string, unknown> = {
    scope: params.scope,
    targetType: params.targetType,
    panel: params.panel,
  }
  if (params.targetType === 'specific') {
    signature.userOpenids = params.scope === 'c2c' ? params.userOpenids : []
    signature.groupOpenids = params.scope === 'group' ? params.groupOpenids : []
  }
  return stableStringify(signature)
}

export const panelCreateRequest = (draft: PanelDraft): CreatePanelRequest => ({
  scope: draft.scope,
  target_type: draft.targetType,
  panel: panelContentPayload(draft),
  ...(draft.targetType === 'specific' && draft.scope === 'c2c'
    ? { user_openids: [...draft.userOpenids] }
    : {}),
  ...(draft.targetType === 'specific' && draft.scope === 'group'
    ? { group_openids: [...draft.groupOpenids] }
    : {}),
})

export const panelContent = panelContentPayload

export const panelTargetDiff = (draft: PanelDraft) => {
  const saved = draft.saved
  if (!saved) return { added: [] as string[], removed: [] as string[] }

  const next = draft.scope === 'c2c' ? draft.userOpenids : draft.groupOpenids
  const original = draft.scope === 'c2c' ? saved.userOpenids : saved.groupOpenids
  const nextSet = new Set(next)
  const originalSet = new Set(original)

  return {
    added: next.filter((id) => !originalSet.has(id)),
    removed: original.filter((id) => !nextSet.has(id)),
  }
}

const menuContentItems = (items: MenuItemDraft[]): MenuItem[] =>
  items.map((item) => {
    const name = item.name.trim()
    const next: MenuItem = { type: item.type, name }

    if (item.type === 'switch') {
      next.switch = {
        switch_id: item.switchId.trim(),
        default: item.switchDefault,
      }
    } else if (item.type === 'send_message') {
      next.send_message = item.sendMessage.trim()
    } else if (item.type === 'link') {
      next.link = item.link.trim()
    } else {
      next.sub_menu_items = item.subItems.map((sub) => {
        const subName = sub.name.trim()
        const subNext: SubMenuItem = { type: sub.type, name: subName }
        if (sub.type === 'send_message') subNext.send_message = sub.sendMessage.trim()
        else subNext.link = sub.link.trim()
        return subNext
      })
    }

    return next
  })

export const menuContent = (draft: MenuDraft): Menu => ({
  items: menuContentItems(draft.items),
})

export const menuSignature = (draft: MenuDraft): unknown => ({
  items: menuContentItems(draft.items),
})

/** 已发出的菜单请求体对应的签名，用法同 panelSignatureOf。 */
export const menuSignatureOf = (menu: Menu): string => stableStringify({ items: menu.items ?? [] })

export const isPanelDirty = (draft: PanelDraft): boolean => {
  if (!draft.panelId) return true
  return stableStringify(panelSignature(draft)) !== draft.baseline
}

export const isMenuDirty = (draft: MenuDraft): boolean =>
  stableStringify(menuSignature(draft)) !== draft.baseline

export const resetPanelDraft = (draft: PanelDraft): PanelDraft | null => {
  if (!draft.saved) return null
  if (draft.targetType === 'specific' && !draft.targetLoaded) return draft

  const next: PanelDraft = {
    ...draft,
    remark: draft.saved.panel.remark ?? '',
    items: (draft.saved.panel.items ?? []).map(panelItemToDraft),
    // 关联对象没读回来时保留现状，避免用空列表覆盖服务端数据。
    userOpenids: draft.targetError ? [...draft.userOpenids] : [...draft.saved.userOpenids],
    groupOpenids: draft.targetError ? [...draft.groupOpenids] : [...draft.saved.groupOpenids],
    version: draft.saved.version,
    targetLoaded: true,
    targetError: draft.targetError,
  }
  next.baseline = stableStringify(panelSignature(next))
  return next
}

export const resetMenuDraft = (draft: MenuDraft): MenuDraft => {
  const items = cloneMenuItems(draft.savedItems)
  const next = { ...draft, items }
  next.baseline = stableStringify(menuSignature(next))
  return next
}

export const validatePanelDraft = (draft: PanelDraft): Record<string, string> => {
  const errors: Record<string, string> = {}

  const remark = draft.remark.trim()
  if (charUnits(remark) > 255) {
    errors.remark = '备注最多 255 个字符（中文按 2 个字符计算）'
  }

  if (draft.items.length === 0) {
    errors.items = '至少添加一个面板元素'
  } else if (draft.items.length > MAX_PANEL_ITEMS) {
    errors.items = `一个面板最多 ${MAX_PANEL_ITEMS} 个元素`
  }

  if (draft.targetType === 'specific' && draft.targetLoaded) {
    const openids = draft.scope === 'c2c' ? draft.userOpenids : draft.groupOpenids
    const max = draft.panelId ? MAX_PANEL_OPENIDS : MAX_CREATE_OPENIDS
    if (openids.length === 0) errors.openids = '指定生效至少需要一个 openid'
    else if (openids.length > max) errors.openids = `最多 ${max} 个 openid`
    else if (openids.some((id) => !id.trim())) errors.openids = 'openid 不能为空'
  }

  draft.items.forEach((item) => {
    const name = item.name.trim()
    if (!name) errors[`items.${item.key}.name`] = '请填写名称'
    else if (charUnits(name) > 14) errors[`items.${item.key}.name`] = '名称最多 14 个字符'

    if (charUnits(item.desc.trim()) > 30) {
      errors[`items.${item.key}.desc`] = '描述最多 30 个字符'
    }

    if (item.type === 'link') {
      const link = item.link.trim()
      if (!link) errors[`items.${item.key}.link`] = '请填写链接'
      else if (!isHttpsLink(link)) errors[`items.${item.key}.link`] = '链接必须以 https:// 开头'
    }
  })

  return errors
}

export const validateMenuDraft = (draft: MenuDraft): Record<string, string> => {
  const errors: Record<string, string> = {}

  if (draft.items.length > MAX_MENU_ITEMS) {
    errors.items = `自定义菜单最多 ${MAX_MENU_ITEMS} 个一级菜单`
  }

  draft.items.forEach((item) => {
    const name = item.name.trim()
    if (!name) errors[`items.${item.key}.name`] = '请填写名称'
    else if (charUnits(name) > 10) errors[`items.${item.key}.name`] = '名称最多 10 个字符'

    if (item.type === 'switch') {
      const switchId = item.switchId.trim()
      if (!switchId) errors[`items.${item.key}.switchId`] = '请填写开关标识'
      else if (switchId.length > 64) errors[`items.${item.key}.switchId`] = '开关标识最多 64 个字符'
    } else if (item.type === 'send_message') {
      const message = item.sendMessage.trim()
      if (!message) errors[`items.${item.key}.sendMessage`] = '请填写发送内容'
      else if (message.length > 512) errors[`items.${item.key}.sendMessage`] = '发送内容最多 512 个字符'
    } else if (item.type === 'link') {
      const link = item.link.trim()
      if (!link) errors[`items.${item.key}.link`] = '请填写链接'
      else if (!isHttpsLink(link)) errors[`items.${item.key}.link`] = '链接必须以 https:// 开头'
    } else {
      if (item.subItems.length === 0) {
        errors[`items.${item.key}.subItems`] = '至少添加一个子菜单项'
      } else if (item.subItems.length > MAX_SUB_MENU_ITEMS) {
        errors[`items.${item.key}.subItems`] = `最多 ${MAX_SUB_MENU_ITEMS} 个子菜单项`
      }

      item.subItems.forEach((sub) => {
        const subName = sub.name.trim()
        const key = `items.${item.key}.sub.${sub.key}`
        if (!subName) errors[`${key}.name`] = '请填写名称'
        else if (charUnits(subName) > 14) errors[`${key}.name`] = '名称最多 14 个字符'

        if (sub.type === 'send_message') {
          const message = sub.sendMessage.trim()
          if (!message) errors[`${key}.sendMessage`] = '请填写发送内容'
          else if (message.length > 512) errors[`${key}.sendMessage`] = '发送内容最多 512 个字符'
        } else {
          const link = sub.link.trim()
          if (!link) errors[`${key}.link`] = '请填写链接'
          else if (!isHttpsLink(link)) errors[`${key}.link`] = '链接必须以 https:// 开头'
        }
      })
    }
  })

  return errors
}
