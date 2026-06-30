import crypto from 'node:crypto'
import { createWriteStream } from 'node:fs'
import type { Dirent } from 'node:fs'
import { mkdir, readdir, rename, rm, stat, utimes } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { Transform, type Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { imageSizeFromFile } from 'image-size/fromFile'
import { karinPathTemp } from 'node-karin'
import axios from 'node-karin/axios'
import { pluginDirName } from '@/utils/plugin'
import { CLEANUP_INTERVAL, MESSAGE_TTL } from './constants'
import type { ElementTypes } from 'node-karin'

/** Karin 中通过 `file` 字段承载远程资源、需要本地缓存的消息段类型。 */
export type FileElementType = Extract<ElementTypes['type'], 'image' | 'video' | 'record' | 'file'>

/** 带有 `file` 字段的媒体/文件消息段联合类型。 */
export type FileBackedElement = Extract<ElementTypes, { type: FileElementType }>

/** 消息媒体缓存根目录：${karinPathTemp}/${pluginDirName}/message-media。 */
const MEDIA_CACHE_DIR = join(karinPathTemp, pluginDirName, 'message-media')

/** 单个媒体下载请求的超时时间。 */
const FETCH_TIMEOUT = 5 * 60 * 1000

/** 各类型允许缓存的最大体积，防止短期 URL 下载拖垮磁盘或内存。 */
const MAX_CACHE_BYTES: Record<FileElementType, number> = {
  image: 30 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  record: 20 * 1024 * 1024,
  file: 100 * 1024 * 1024,
}

/** 无法从消息段或响应头判断格式时使用的兜底扩展名。 */
const EXTENSIONS_BY_TYPE: Record<FileElementType, string> = {
  image: '.jpg',
  video: '.mp4',
  record: '.mp3',
  file: '.bin',
}

/** 常见 content-type 到本地文件扩展名的映射。 */
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'video/mp4': '.mp4',
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/amr': '.amr',
}

/** 图片 subType 到扩展名的映射，优先级高于响应头和 URL 后缀。 */
const SUBTYPE_EXTENSIONS: Record<string, string> = {
  jpg: '.jpg',
  jpeg: '.jpg',
  png: '.png',
  gif: '.gif',
  webp: '.webp',
  bmp: '.bmp',
  mp4: '.mp4',
  silk: '.silk',
  amr: '.amr',
  wav: '.wav',
  mp3: '.mp3',
}

/** 上次清理本地媒体缓存的时间戳。 */
let lastCleanup = 0

/** 媒体本地化批处理结果。 */
export interface LocalizeFileElementsResult {
  /** 本地化后的消息段数组；失败的单个消息段会保留原始 URL。 */
  elements: ElementTypes[]
  /** 是否至少有一个消息段的 file 从远程 URL 变成本地路径。 */
  changed: boolean
  /** 单个媒体下载失败的错误信息列表。 */
  failures: string[]
}

/** 远程文件下载完成后的本地文件信息。 */
interface StreamDownloadResult {
  /** 写入成功后的本地绝对路径。 */
  file: string
  /** 响应头中的 content-type，缺失时为空字符串。 */
  contentType: string
  /** 从最终扩展名推导出的图片格式。 */
  subType?: string
}

/** 下载流进度，用于限制实际读取的字节数。 */
interface StreamProgress {
  /** 已通过限制流的字节数。 */
  bytes: number
}

/**
 * 判断 elements 中是否存在需要本地化缓存的远程 file 字段。
 *
 * @param elements Karin 消息段数组。
 * @returns true 表示至少有一个 image/video/record/file 使用远程 URL。
 */
export const hasRemoteFileElement = (elements: ElementTypes[]): boolean => {
  return elements.some(element => isFileBackedElement(element) && isRemoteUrl(element.file))
}

/**
 * 将接收侧短期媒体 URL 缓存到本地 temp 目录。
 *
 * Karin 的 image/video/record/file 段都通过 `file` 字段承载资源。这里优先保存
 * 本地路径，避免每条入站媒体都转存到图床；失败时保留原 URL，让缓存尽量完整。
 *
 * @param elements 原始 Karin 消息段数组。
 * @returns 本地化后的消息段、是否变化、以及单段失败信息。
 */
export const localizeFileElements = async (
  elements: ElementTypes[]
): Promise<LocalizeFileElementsResult> => {
  await cleanupMessageMediaCacheIfDue()

  let changed = false
  const failures: string[] = []
  const localized: ElementTypes[] = []

  for (const element of elements) {
    if (!isFileBackedElement(element) || !isRemoteUrl(element.file)) {
      localized.push({ ...element } as ElementTypes)
      continue
    }

    try {
      const cached = await cacheFileElement(element)
      changed ||= cached.file !== element.file
      localized.push(cached)
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err))
      localized.push({ ...element } as ElementTypes)
    }
  }

  return { elements: localized, changed, failures }
}

/**
 * 清理超过消息缓存 TTL 的本地媒体文件。
 *
 * @returns 清理完成 Promise。
 */
export const cleanupMessageMediaCache = async (): Promise<void> => {
  lastCleanup = Date.now()
  const deadline = Date.now() - MESSAGE_TTL
  await cleanupDir(MEDIA_CACHE_DIR, deadline)
}

/**
 * 到达清理间隔时清理本地媒体文件。
 *
 * @returns 清理完成 Promise；未到间隔时立即返回。
 */
export const cleanupMessageMediaCacheIfDue = async (): Promise<void> => {
  if (Date.now() - lastCleanup < CLEANUP_INTERVAL) return
  await cleanupMessageMediaCache()
}

/**
 * 缓存单个媒体消息段的远程文件。
 *
 * 图片会在下载后补充 subType、width、height；其他类型只替换 file 为本地路径。
 *
 * @param element 需要本地化的 image/video/record/file 消息段。
 * @returns 替换 file 字段后的消息段。
 */
const cacheFileElement = async (element: FileBackedElement): Promise<FileBackedElement> => {
  const source = normalizeRemoteUrl(element.file)
  const dir = join(MEDIA_CACHE_DIR, element.type)
  await mkdir(dir, { recursive: true })

  const downloaded = await downloadRemoteFile({
    url: source,
    dir,
    element,
    maxBytes: MAX_CACHE_BYTES[element.type],
  })
  const result = {
    ...element,
    file: downloaded.file,
  } as FileBackedElement

  if (element.type === 'image') {
    const dimensions = await imageSizeFromFile(downloaded.file).catch(() => undefined)
    return {
      ...result,
      subType: downloaded.subType || element.subType,
      width: dimensions?.width || element.width,
      height: dimensions?.height || element.height,
    } as FileBackedElement
  }

  return result
}

/**
 * 使用 node-karin/axios 以流方式下载远程媒体到本地文件。
 *
 * 先写入 `.part` 临时文件，完整下载后再 rename，避免半文件被后续读取。
 *
 * @param params 下载参数。
 * @param params.url 规范化后的远程 URL。
 * @param params.dir 当前媒体类型的缓存目录。
 * @param params.element 原始媒体消息段，用于命名和扩展名推断。
 * @param params.maxBytes 当前类型允许的最大下载体积。
 * @returns 下载后的本地文件路径和格式信息。
 */
const downloadRemoteFile = async (params: {
  url: string
  dir: string
  element: FileBackedElement
  maxBytes: number
}): Promise<StreamDownloadResult> => {
  const { url, dir, element, maxBytes } = params
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    timeout: FETCH_TIMEOUT,
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    validateStatus: () => true,
  })
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`下载媒体失败: HTTP ${response.status}`)
  }
  const body = response.data as Readable | undefined
  if (!body) {
    throw new Error('下载媒体失败: 响应体为空')
  }

  const contentType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase()
  validateContentType(element.type, contentType)

  const contentLength = Number(response.headers['content-length'] || 0)
  if (contentLength > maxBytes) {
    throw new Error(`下载媒体失败: 文件过大 ${contentLength} bytes`)
  }

  const tempFile = join(dir, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.part`)
  const progress: StreamProgress = {
    bytes: 0,
  }

  try {
    await pipeline(
      body,
      createLimitStream(progress, maxBytes),
      createWriteStream(tempFile)
    )

    const filename = getLocalFilename(element, url, contentType)
    const finalFile = join(dir, filename)
    const now = new Date()
    const exists = await stat(finalFile).then(() => true).catch(() => false)
    if (exists) {
      await rm(tempFile, { force: true }).catch(() => undefined)
      await utimes(finalFile, now, now).catch(() => undefined)
    } else {
      await rename(tempFile, finalFile)
    }
    return {
      file: finalFile,
      contentType,
      subType: element.type === 'image' ? extensionToSubType(extname(filename)) : undefined,
    }
  } catch (err) {
    await rm(tempFile, { force: true }).catch(() => undefined)
    throw err
  }
}

/**
 * 创建限制下载体积的 Transform 流。
 *
 * axios 的 content-length 可能缺失或不可信，这里按实际流经字节再次限制。
 *
 * @param progress 下载进度对象。
 * @param maxBytes 允许通过的最大字节数。
 * @returns 可插入 pipeline 的 Transform 流。
 */
const createLimitStream = (
  progress: StreamProgress,
  maxBytes: number
): Transform => {
  return new Transform({
    transform (chunk: Buffer, _encoding, callback) {
      progress.bytes += chunk.length
      if (progress.bytes > maxBytes) {
        callback(new Error(`下载媒体失败: 文件过大 ${progress.bytes} bytes`))
        return
      }
      callback(null, chunk)
    },
  })
}

/**
 * 递归清理过期缓存文件。
 *
 * 目录本身会保留，只删除超过 deadline 的普通文件。
 *
 * @param dir 需要扫描的目录。
 * @param deadline 过期时间戳，小于等于该时间的文件会被删除。
 * @returns 清理完成 Promise。
 */
const cleanupDir = async (dir: string, deadline: number): Promise<void> => {
  let entries: Array<Dirent<string>>
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
    throw err
  }

  await Promise.all(entries.map(async entry => {
    const file = join(dir, entry.name)
    if (entry.isDirectory()) {
      await cleanupDir(file, deadline)
      return
    }
    if (!entry.isFile()) return
    const info = await stat(file).catch(() => undefined)
    if (!info || info.mtimeMs > deadline) return
    await rm(file, { force: true }).catch(() => undefined)
  }))
}

/**
 * 生成本地缓存文件名。
 *
 * 文件名使用原始 name 的主文件名加 UUID，既保留可读性，也避免同名文件冲突。
 *
 * @param element 媒体消息段。
 * @param source 远程 URL。
 * @param contentType 响应 content-type。
 * @returns 不含目录的本地文件名。
 */
const getLocalFilename = (
  element: FileBackedElement,
  source: string,
  contentType: string
): string => {
  const ext = getFileExtension(element, source, contentType)
  const base = getFileBaseName(element) || element.type
  return `${base}-${crypto.randomUUID()}${ext}`
}

/**
 * 推断本地缓存文件扩展名。
 *
 * 优先级：
 * 1. 图片 subType；
 * 2. 文件消息段自带 name 后缀；
 * 3. 语音固定 .mp3；
 * 4. content-type、name、URL 后缀；
 * 5. 类型默认扩展名。
 *
 * @param element 媒体消息段。
 * @param source 远程 URL。
 * @param contentType 响应 content-type。
 * @returns 带点号的扩展名。
 */
const getFileExtension = (
  element: FileBackedElement,
  source: string,
  contentType: string
): string => {
  if (element.type === 'image') {
    const subtype = element.subType?.toLowerCase()
    if (subtype && SUBTYPE_EXTENSIONS[subtype]) return SUBTYPE_EXTENSIONS[subtype]
  }

  if (element.type === 'file') {
    const fileNameExt = normalizeExtension(extname(element.name || ''))
    if (fileNameExt) return fileNameExt
  }

  if (element.type === 'record') return EXTENSIONS_BY_TYPE.record

  const byType = CONTENT_TYPE_EXTENSIONS[contentType]
  if (byType) return byType

  const byName = normalizeExtension(extname(element.name || ''))
  if (byName) return byName

  const byUrl = normalizeExtension(extname(new URL(source).pathname))
  return byUrl || EXTENSIONS_BY_TYPE[element.type]
}

/**
 * 规范化并校验扩展名。
 *
 * 只允许短的字母数字扩展名，避免 URL 或文件名中的异常内容进入本地路径。
 *
 * @param ext 原始扩展名。
 * @returns 合法扩展名；非法时返回空字符串。
 */
const normalizeExtension = (ext: string): string => {
  const normalized = ext.toLowerCase()
  if (!normalized || normalized.length > 16) return ''
  if (!/^\.[a-z0-9]+$/.test(normalized)) return ''
  return normalized === '.jpeg' ? '.jpg' : normalized
}

/**
 * 获取用于本地文件名的主文件名。
 *
 * 只有 file 消息段通常会带业务文件名；其他媒体没有 name 时由类型名兜底。
 *
 * @param element 媒体消息段。
 * @returns 已清理的主文件名，不包含扩展名。
 */
const getFileBaseName = (element: FileBackedElement): string => {
  const raw = element.name || ''
  const withoutExt = raw ? raw.slice(0, raw.length - extname(raw).length) : ''
  return sanitizeFilename(withoutExt)
}

/**
 * 清理文件名中的危险字符。
 *
 * @param name 原始文件名。
 * @returns 可安全拼接到本地路径中的文件名片段。
 */
const sanitizeFilename = (name: string): string => {
  return name
    .split('')
    .map(char => isUnsafeFilenameChar(char) ? '_' : char)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/**
 * 判断字符是否不适合出现在 Windows/Unix 文件名中。
 *
 * @param char 单个字符。
 * @returns true 表示需要替换。
 */
const isUnsafeFilenameChar = (char: string): boolean => {
  return char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char)
}

/**
 * 将图片扩展名转换为 Karin image.subType。
 *
 * @param ext 带点号的扩展名。
 * @returns Karin 使用的图片格式名。
 */
const extensionToSubType = (ext: string): string => {
  const normalized = ext.replace(/^\./, '').toLowerCase()
  return normalized === 'jpg' ? 'jpeg' : normalized
}

/**
 * 校验响应 content-type 是否和消息段类型相容。
 *
 * 当前只严格校验图片，其他媒体平台可能返回 octet-stream 或不完整类型。
 *
 * @param type 消息段类型。
 * @param contentType 响应 content-type。
 */
const validateContentType = (type: FileElementType, contentType: string): void => {
  if (!contentType) return
  if (
    type === 'image' &&
    !contentType.startsWith('image/') &&
    contentType !== 'application/octet-stream'
  ) {
    throw new Error(`下载媒体失败: 非图片类型 ${contentType}`)
  }
}

/**
 * 判断消息段是否带有可本地化的 file 字段。
 *
 * @param element Karin 消息段。
 * @returns true 表示该消息段可以进行媒体本地化。
 */
const isFileBackedElement = (element: ElementTypes): element is FileBackedElement => {
  return element.type === 'image' || element.type === 'video' || element.type === 'record' || element.type === 'file'
}

/**
 * 判断 file 字段是否是远程 URL。
 *
 * @param value file 字段值。
 * @returns true 表示需要下载到本地缓存。
 */
const isRemoteUrl = (value: string): boolean => {
  return /^https?:\/\//i.test(value) || value.startsWith('//')
}

/**
 * 规范化远程 URL。
 *
 * QQ 下发的资源有时是协议相对 URL，这里默认补全为 https。
 *
 * @param value 原始 URL。
 * @returns 可交给 axios 请求的完整 URL。
 */
const normalizeRemoteUrl = (value: string): string => {
  return value.startsWith('//') ? `https:${value}` : value
}
