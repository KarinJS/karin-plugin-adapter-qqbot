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
  switch (row.element_type) {
    case 'text': return [{ type: 'text', text: row.value }]
    case 'at': return [{
      type: 'at',
      targetId: row.value,
    }]
    case 'reply': return [{
      type: 'reply',
      messageId: row.value,
    }]
    case 'face': return [{
      type: 'face',
      id: Number(row.value) || 0,
    }]
    case 'image': return [{
      type: 'image',
      file: row.value,
    }]
    case 'video': return [{
      type: 'video',
      file: row.value,
    }]
    case 'record': return [{
      type: 'record',
      file: row.value,
      magic: false,
    }]
    case 'file': return [{
      type: 'file',
      file: row.value,
    }]
    case 'markdown': return [{
      type: 'markdown',
      markdown: row.value,
    }]
    default: return []
  }
}

/**
 * 提取消息段缓存值。
 *
 * @param element Karin 消息段。
 * @returns 当前接收侧需要持久化的核心字段；不支持缓存的类型返回 undefined。
 */
export const elementValue = (element: ElementTypes): string | undefined => {
  if (!storableTypes.has(element.type)) return undefined

  switch (element.type) {
    case 'text': return element.text
    case 'at': return element.targetId
    case 'reply': return element.messageId
    case 'face': return String(element.id)
    case 'image':
    case 'video':
    case 'record':
    case 'file':
      return element.file
    case 'markdown': return element.markdown
  }
}
