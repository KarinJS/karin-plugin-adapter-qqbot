import querystring from 'node:querystring'
import { SQL } from './sql'
import type { ElementTypes } from 'node-karin'
import type { GetRows, RunSql, StoredElementRow } from './types'

/** 接收侧当前会缓存的 Karin 消息段类型。 */
const storableTypes = new Set<ElementTypes['type']>([
  'text',
  'at',
  'reply',
  'face',
  'image',
  'video',
  'record',
  'file',
  'markdown',
])

/**
 * 保存一个消息段。
 *
 * 只写 `element_type + value`，避免稀疏宽表产生大量 NULL，也避免每个消息段
 * 再额外写详情表。
 *
 * @param run SQL 执行函数，通常绑定到当前 MessageStore 的 SQLite 连接。
 * @param messageRef `qqbot_messages.id`，用于关联所属消息。
 * @param index 消息段在 Karin elements 中的原始顺序。
 * @param element 需要缓存的 Karin 消息段。
 */
export const saveElement = async (
  run: RunSql,
  messageRef: number,
  index: number,
  element: ElementTypes
): Promise<void> => {
  const value = elementValue(element)
  if (value === undefined) return
  await run(SQL.insertElement, [messageRef, index, element.type, value])
}

/**
 * 读取并还原消息段。
 *
 * @param getRows SQL 多行查询函数。
 * @param messageRef `qqbot_messages.id`，用于读取该消息的全部消息段。
 * @returns 按 `element_index` 排序后的 Karin 消息段数组。
 */
export const loadElements = async (
  getRows: GetRows,
  messageRef: number
): Promise<ElementTypes[]> => {
  const rows = await getRows<StoredElementRow>(SQL.selectElements, [messageRef])
  return rows.flatMap(elementFromRow)
}

/**
 * 将数据库中的单 value 消息段还原为 Karin 消息段。
 *
 * @param row `qqbot_message_elements` 查询行。
 * @returns 可还原的 Karin 消息段；未知类型返回空数组。
 */
const elementFromRow = (row: StoredElementRow): ElementTypes[] => {
  const value = parseElementValue(row.value)

  switch (row.element_type) {
    case 'text': return [{ type: 'text', text: stringValue(value, 'text') }]
    case 'at': return [{
      type: 'at',
      targetId: stringValue(value, 'targetId'),
    }]
    case 'reply': return [{
      type: 'reply',
      messageId: stringValue(value, 'messageId'),
    }]
    case 'face': return [{
      type: 'face',
      id: numberValue(value, 'id') || 0,
    }]
    case 'image': return [{
      type: 'image',
      file: stringValue(value, 'file'),
      subType: stringValue(value, 'subType') || undefined,
      width: numberValue(value, 'width'),
      height: numberValue(value, 'height'),
    }]
    case 'video': return [{
      type: 'video',
      file: stringValue(value, 'file'),
    }]
    case 'record': return [{
      type: 'record',
      file: stringValue(value, 'file'),
      magic: false,
    }]
    case 'file': return [{
      type: 'file',
      file: stringValue(value, 'file'),
      name: stringValue(value, 'name') || undefined,
    }]
    case 'markdown': return [{
      type: 'markdown',
      markdown: stringValue(value, 'markdown'),
    }]
    default: return []
  }
}

/**
 * 提取并编码消息段缓存值。
 *
 * 数据库只保存 `element_type + value`，其中 value 统一为 querystring。每种消息段
 * 只保留 getMsg/getHistoryMsg 还原所需的最小字段。
 *
 * @param element Karin 消息段。
 * @returns querystring 编码后的最小字段；不支持缓存的类型返回 undefined。
 */
export const elementValue = (element: ElementTypes): string | undefined => {
  if (!storableTypes.has(element.type)) return undefined

  switch (element.type) {
    case 'text': return encodeElementValue({ text: element.text })
    case 'at': return encodeElementValue({ targetId: element.targetId })
    case 'reply': return replyElementValue(element.messageId)
    case 'face': return encodeElementValue({ id: element.id })
    case 'image': return encodeElementValue({
      file: element.file,
      subType: element.subType,
      width: element.width,
      height: element.height,
    })
    case 'video': return encodeElementValue({
      file: element.file,
    })
    case 'record': return encodeElementValue({
      file: element.file,
    })
    case 'file': return encodeElementValue({
      file: element.file,
      name: element.name,
    })
    case 'markdown': return encodeElementValue({ markdown: element.markdown })
  }
}

/**
 * 编码 reply 段的数据库 value。
 *
 * `hasReply` 查询需要和写入时使用完全一致的 querystring 格式，单独导出这个
 * helper 可以避免查询侧再手写一份 `messageId=...`。
 *
 * @param messageId 被引用的消息 ID。
 * @returns 可直接写入或查询 `qqbot_message_elements.value` 的编码值。
 */
export const replyElementValue = (messageId: string): string =>
  encodeElementValue({ messageId })

/**
 * 将消息段字段编码成数据库 value。
 *
 * 所有消息段都统一使用 querystring，避免不同类型混用裸字符串和结构化值。空值
 * 不写入，减少缓存字段噪声。
 *
 * @param data 需要保留的最小消息段字段。
 * @returns querystring 编码后的 value。
 */
const encodeElementValue = (data: Record<string, unknown>): string => {
  const value: Record<string, string> = {}
  for (const [key, item] of Object.entries(data)) {
    if (item === undefined || item === null || item === '') continue
    value[key] = String(item)
  }
  return querystring.stringify(value)
}

/**
 * 解析数据库中保存的消息段 value。
 *
 * 当前草案不兼容旧裸值格式，读取侧只按 querystring 解析。
 *
 * @param value `qqbot_message_elements.value` 原始字符串。
 * @returns querystring 解析后的字段表。
 */
const parseElementValue = (value: string): querystring.ParsedUrlQuery =>
  querystring.parse(value)

/**
 * 从解析后的 value 中读取字符串字段。
 *
 * querystring 允许重复 key，这里固定取首个值，保证还原结果稳定。
 *
 * @param value 已解析的 value。
 * @param key 字段名。
 * @returns 字符串字段；不存在时返回空字符串。
 */
const stringValue = (value: querystring.ParsedUrlQuery, key: string): string => {
  const item = value[key]
  if (Array.isArray(item)) return item[0] || ''
  if (typeof item === 'string') return item
  return ''
}

/**
 * 从解析后的 value 中读取正数字段。
 *
 * 宽高、表情 ID 等数值字段只有大于 0 时才还原，避免把空值或异常值写回消息段。
 *
 * @param value 已解析的 value。
 * @param key 字段名。
 * @returns 正数值；不存在或非法时返回 undefined。
 */
const numberValue = (value: querystring.ParsedUrlQuery, key: string): number | undefined => {
  const num = Number(stringValue(value, key))
  return Number.isFinite(num) && num > 0 ? num : undefined
}
