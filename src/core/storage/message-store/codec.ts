import { ELEMENT_TEXT_LIMIT } from './constants'
import { fromStoredFilePath, toStoredFilePath } from './media'
import type { ElementTypes } from 'node-karin'
import type { MessageCacheLevel } from '@/types/config'

/**
 * 消息段的紧凑存储形态。
 *
 * 字段名刻意压缩到 1 个字符：十万级消息量下，每条消息省下的几十字节
 * 直接决定 db 文件体积。字段含义由本文件的 encode/decode 对偶保证。
 */
interface StoredElement {
  /** 消息段类型编码：t=text a=at r=reply f=face i=image v=video s=record d=file m=markdown。 */
  c: string
  /** 主值：文本内容 / 目标 ID / 媒体路径等。 */
  v?: string | number
  /** 图片 subType。 */
  s?: string
  /** 图片宽度。 */
  w?: number
  /** 图片高度。 */
  h?: number
  /** 文件名。 */
  n?: string
  /** 语音是否变声（magic），1 表示 true；缺省为 false。 */
  g?: number
}

/** 编码结果：JSON 串 + 从消息段提取出的可索引字段。 */
export interface EncodedElements {
  /** 紧凑 JSON 数组，直接写入 `qqbot_messages.elements`。 */
  json: string
  /** 第一个 reply 段引用的消息 ID；没有 reply 段时为 null。 */
  replyTo: string | null
}

/** 各存储分级允许落库的消息段类型；full 不过滤（encode 自身会跳过不支持的类型）。 */
const LEVEL_ALLOWED: Record<Exclude<MessageCacheLevel, 'full'>, Set<ElementTypes['type']>> = {
  minimal: new Set<ElementTypes['type']>(['reply']),
  standard: new Set<ElementTypes['type']>([
    'text', 'at', 'reply', 'face', 'image', 'video', 'record', 'file',
  ]),
}

/**
 * 按存储分级过滤消息段。
 *
 * minimal 只保留 reply 段（引用链解析所需）；standard 丢弃 markdown 原文；
 * full 原样返回。消息主记录（ID 映射、is_self）不受分级影响，始终落库。
 *
 * @param elements Karin 消息段数组。
 * @param level 存储分级；缺省按 standard 处理。
 * @returns 过滤后的消息段数组。
 */
export const filterElementsByLevel = (
  elements: ElementTypes[],
  level: MessageCacheLevel = 'standard'
): ElementTypes[] => {
  if (level === 'full') return elements
  const allowed = LEVEL_ALLOWED[level] || LEVEL_ALLOWED.standard
  return elements.filter(element => allowed.has(element.type))
}

/**
 * 将 Karin 消息段编码为紧凑 JSON。
 *
 * 每种消息段只保留 getMsg/getHistoryMsg 还原所需的最小字段；text/markdown
 * 超过 `ELEMENT_TEXT_LIMIT` 截断；本地媒体路径转为相对形式存储。
 * 不支持缓存的类型直接跳过。
 *
 * @param elements Karin 消息段数组。
 * @returns JSON 串和可索引字段。
 */
export const encodeElements = (elements: ElementTypes[]): EncodedElements => {
  const stored: StoredElement[] = []
  let replyTo: string | null = null

  for (const element of elements) {
    const item = encodeElement(element)
    if (!item) continue
    stored.push(item)
    if (element.type === 'reply' && !replyTo) replyTo = element.messageId
  }

  return { json: JSON.stringify(stored), replyTo }
}

/**
 * 将数据库中的紧凑 JSON 还原为 Karin 消息段。
 *
 * @param json `qqbot_messages.elements` 列内容。
 * @returns Karin 消息段数组；JSON 非法或含未知编码时跳过对应消息段。
 */
export const decodeElements = (json: string): ElementTypes[] => {
  let stored: StoredElement[]
  try {
    stored = JSON.parse(json)
  } catch {
    return []
  }
  if (!Array.isArray(stored)) return []
  return stored.flatMap(decodeElement)
}

/**
 * 编码单个消息段。
 *
 * @param element Karin 消息段。
 * @returns 紧凑存储对象；不支持缓存的类型返回 null。
 */
const encodeElement = (element: ElementTypes): StoredElement | null => {
  switch (element.type) {
    case 'text':
      return { c: 't', v: truncateText(element.text) }
    case 'at':
      return { c: 'a', v: element.targetId }
    case 'reply':
      return { c: 'r', v: element.messageId }
    case 'face':
      return { c: 'f', v: element.id }
    case 'image':
      return {
        c: 'i',
        v: toStoredFilePath(element.file),
        ...(element.subType ? { s: element.subType } : {}),
        ...(element.width ? { w: element.width } : {}),
        ...(element.height ? { h: element.height } : {}),
      }
    case 'video':
      return { c: 'v', v: toStoredFilePath(element.file) }
    case 'record':
      return {
        c: 's',
        v: toStoredFilePath(element.file),
        ...(element.magic ? { g: 1 } : {}),
      }
    case 'file':
      return {
        c: 'd',
        v: toStoredFilePath(element.file),
        ...(element.name ? { n: element.name } : {}),
      }
    case 'markdown':
      return { c: 'm', v: truncateText(element.markdown) }
    default:
      return null
  }
}

/**
 * 还原单个消息段。
 *
 * @param item 紧凑存储对象。
 * @returns Karin 消息段；未知编码返回空数组。
 */
const decodeElement = (item: StoredElement): ElementTypes[] => {
  switch (item.c) {
    case 't': return [{ type: 'text', text: stringValue(item.v) }]
    case 'a': return [{ type: 'at', targetId: stringValue(item.v) }]
    case 'r': return [{ type: 'reply', messageId: stringValue(item.v) }]
    case 'f': return [{ type: 'face', id: numberValue(item.v) || 0 }]
    case 'i': return [{
      type: 'image',
      file: fromStoredFilePath(stringValue(item.v)),
      subType: item.s || undefined,
      width: positiveNumber(item.w),
      height: positiveNumber(item.h),
    }]
    case 'v': return [{ type: 'video', file: fromStoredFilePath(stringValue(item.v)) }]
    case 's': return [{
      type: 'record',
      file: fromStoredFilePath(stringValue(item.v)),
      magic: item.g === 1,
    }]
    case 'd': return [{
      type: 'file',
      file: fromStoredFilePath(stringValue(item.v)),
      name: item.n || undefined,
    }]
    case 'm': return [{ type: 'markdown', markdown: stringValue(item.v) }]
    default: return []
  }
}

/**
 * 截断超长文本，控制单条消息的缓存体积。
 *
 * @param text 原始文本。
 * @returns 截断后的文本。
 */
const truncateText = (text: string): string => {
  return text.length > ELEMENT_TEXT_LIMIT ? text.slice(0, ELEMENT_TEXT_LIMIT) : text
}

/**
 * 读取字符串字段。
 *
 * @param value 存储值。
 * @returns 字符串；缺失时返回空字符串。
 */
const stringValue = (value: string | number | undefined): string => {
  return value === undefined ? '' : String(value)
}

/**
 * 读取数值字段。
 *
 * @param value 存储值。
 * @returns 有限数值；缺失或非法时返回 undefined。
 */
const numberValue = (value: string | number | undefined): number | undefined => {
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

/**
 * 读取正数字段，宽高等字段只有大于 0 时才还原。
 *
 * @param value 存储值。
 * @returns 正数值；不存在或非法时返回 undefined。
 */
const positiveNumber = (value: number | undefined): number | undefined => {
  const num = numberValue(value)
  return num && num > 0 ? num : undefined
}
