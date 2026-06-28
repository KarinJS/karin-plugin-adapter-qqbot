import crypto from 'node:crypto'
import { createReadStream } from 'node:fs'
import { open, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import axios from 'node-karin/axios'
import { Http } from './http'
import { getCachedUpload, setCachedUpload } from './upload-cache'
import type { Scene, MediaType, UploadMediaResponse } from './types'
import type { FileHandle } from 'node:fs/promises'

const FILE_TYPE: Record<MediaType, number> = {
  image: 1,
  video: 2,
  record: 3,
  file: 4,
}

/** 各类资源的 QQ 上传上限。 */
const MAX_UPLOAD_SIZE: Record<MediaType, number> = {
  image: 30 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  record: 20 * 1024 * 1024,
  file: 100 * 1024 * 1024,
}

/** 上传错误中展示的资源类型名称。 */
const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  image: '图片',
  video: '视频',
  record: '语音',
  file: '文件',
}

/** fallback 上传超过该大小时走 QQ 分片上传。 */
const LARGE_UPLOAD_THRESHOLD = 5 * 1024 * 1024

/** QQ upload_prepare 需要的前 10,002,432 字节 MD5。 */
const MD5_10M_SIZE = 10_002_432

/** 分片上传时没有业务文件名的默认值。 */
const DEFAULT_FILENAME: Record<MediaType, string> = {
  image: 'image.jpg',
  video: 'video.mp4',
  record: 'record.mp3',
  file: 'file.bin',
}

/** 富媒体上传比普通接口慢，尤其本地视频会走 file_data。 */
const MEDIA_UPLOAD_TIMEOUT = 120_000

/** URL 回源下载兜底超时。 */
const MEDIA_DOWNLOAD_TIMEOUT = 120_000

/** 每个分片 PUT 到 QQ 临时地址的超时时间。 */
const PART_UPLOAD_TIMEOUT = 300_000

/** 每个分片 PUT 失败后的重试次数。 */
const PART_UPLOAD_RETRIES = 2

/** upload_part_finish 普通失败重试次数。 */
const PART_FINISH_RETRIES = 2

/** upload_part_finish 普通失败重试基础间隔。 */
const PART_FINISH_BASE_DELAY = 1000

/** upload_part_finish 命中这些业务码时，需要按服务端给出的窗口持续重试。 */
const PART_FINISH_RETRYABLE_CODES = new Set([40093001])

/** 服务端未返回 retry_timeout 时，持续重试的默认时间。 */
const PART_FINISH_DEFAULT_RETRY_TIMEOUT = 2 * 60 * 1000

/** 持续重试窗口上限，避免服务端返回异常值导致任务长时间占用。 */
const PART_FINISH_MAX_RETRY_TIMEOUT = 10 * 60 * 1000

/** 持续重试时的固定间隔。 */
const PART_FINISH_RETRY_INTERVAL = 1000

/** 分片完成接口失败重试次数。 */
const COMPLETE_UPLOAD_RETRIES = 2

/** 分片完成接口失败重试基础间隔。 */
const COMPLETE_UPLOAD_BASE_DELAY = 2000

/** upload_prepare 返回该业务码时表示大文件上传额度受限。 */
const UPLOAD_PREPARE_DAILY_LIMIT_CODE = 40093002

/** QQ 没返回建议并发数时的默认并发。 */
const DEFAULT_PART_CONCURRENCY = 1

/** 本地限制的最大分片并发，避免服务端返回过大值。 */
const MAX_PART_CONCURRENCY = 10

/** HTTP(S) URL 可直接交给 QQ 平台拉取。 */
const HTTP_URL_RE = /^https?:\/\//i

/** Karin 常见 base64 图片/媒体前缀。 */
const BASE64_PREFIX_RE = /^base64:\/\//i

/** 标准 data URL 的 base64 前缀。 */
const DATA_URL_BASE64_RE = /^data:[^;,]+;base64,/i

/** QQ 分片上传准备接口返回的单个分片信息。 */
interface UploadPart {
  /** 分片序号，QQ 使用从 1 开始的序号。 */
  index: number
  /** 当前分片需要 PUT 的临时地址。 */
  presigned_url: string
}

/** QQ 分片上传准备接口响应。 */
interface UploadPrepareResponse {
  /** 本次分片上传任务 ID。 */
  upload_id: string
  /** 服务端指定的分片大小。 */
  block_size: number
  /** 服务端返回的所有待上传分片。 */
  parts: UploadPart[]
  /** 服务端建议的分片上传并发。 */
  concurrency?: number
  /** 服务端建议的分片确认重试时间，当前只保留字段兼容。 */
  retry_timeout?: number
}

/** upload_prepare 所需的文件校验值。 */
interface UploadPrepareHashes {
  /** 完整文件 MD5。 */
  md5: string
  /** 完整文件 SHA1。 */
  sha1: string
  /** 前 10,002,432 字节的 MD5；小文件复用完整文件 MD5。 */
  md510m: string
}

/** fallback 分片上传支持的资源形态。 */
type ChunkableSource =
  | {
    kind: 'local'
    /** 本地文件路径。 */
    file: string
    /** 文件大小。 */
    size: number
    /** 传给 QQ 的文件名。 */
    fileName: string
  }
  | {
    kind: 'buffer'
    /** 已经在内存中的文件内容。 */
    buffer: Buffer
    /** 文件大小。 */
    size: number
    /** 传给 QQ 的文件名。 */
    fileName: string
  }

/**
 * 判断字符串是否明显是本地文件路径。
 * 不明显的字符串按裸 base64 兼容处理，避免破坏旧调用方式。
 */
const isLocalPathSource = (source: string): boolean => {
  return source.startsWith('file://') ||
    /^[a-zA-Z]:[\\/]/.test(source) ||
    source.startsWith('/') ||
    source.startsWith('\\') ||
    source.startsWith('./') ||
    source.startsWith('../') ||
    source.startsWith('.\\') ||
    source.startsWith('..\\')
}

/**
 * 将 file:// 或普通路径统一为本地文件系统路径。
 * @param source 本地路径或 file:// URL。
 * @returns 可直接传给 fs 的本地路径。
 */
const normalizeLocalPath = (source: string): string => {
  return source.startsWith('file://') ? fileURLToPath(source) : source
}

/**
 * 去掉 Karin/标准 data URL 的 base64 前缀。
 * @param source base64 字符串。
 * @returns QQ 上传接口需要的纯 base64 数据。
 */
const stripBase64Prefix = (source: string): string => {
  return source
    .replace(DATA_URL_BASE64_RE, '')
    .replace(BASE64_PREFIX_RE, '')
}

/**
 * 将文件大小格式化为便于阅读的字符串。
 * @param bytes 文件字节数。
 * @returns 格式化后的文件大小。
 */
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

/**
 * 规范化上传文件名，避免把路径当成文件名交给 QQ。
 * @param type 富媒体类型。
 * @param name 候选文件名。
 * @returns 安全的基础文件名。
 */
const normalizeUploadFileName = (type: MediaType, name?: string): string => {
  const value = name?.trim()
  if (!value) return DEFAULT_FILENAME[type]
  return path.basename(value) || DEFAULT_FILENAME[type]
}

/**
 * 检查 fallback 资源大小是否超过 QQ 对应类型上限。
 * @param type 富媒体类型。
 * @param size 文件大小。
 */
const assertUploadSize = (type: MediaType, size: number): void => {
  const limit = MAX_UPLOAD_SIZE[type]
  if (size <= limit) return
  throw new Error(`${MEDIA_TYPE_LABEL[type]}过大：${formatBytes(size)}，QQ 上传上限为 ${formatBytes(limit)}`)
}

/**
 * 读取本地媒体文件并转为 QQ 上传接口需要的 base64。
 * @param source 本地路径或 file:// URL。
 * @returns 文件内容的 base64 字符串。
 */
const readLocalFileAsBase64 = async (source: string): Promise<string> => {
  const file = normalizeLocalPath(source)
  return readFile(file, 'base64')
}

/**
 * 下载远程媒体并返回 Buffer。
 * @param url 远程媒体 URL。
 * @returns 文件内容。
 */
const downloadRemoteAsBuffer = async (url: string): Promise<Buffer> => {
  const { data } = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: MEDIA_DOWNLOAD_TIMEOUT,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  })
  return Buffer.from(data)
}

/**
 * 下载远程媒体并转为 QQ 上传接口需要的 base64。
 * @param url 远程媒体 URL。
 * @returns 文件内容的 base64 字符串。
 */
const downloadRemoteAsBase64 = async (url: string): Promise<string> => {
  return (await downloadRemoteAsBuffer(url)).toString('base64')
}

/**
 * 将 Karin 的 file 字段归一为 QQ 上传接口支持的 url / file_data。
 * @param source HTTP URL、本地路径、data URL、base64:// 或裸 base64。
 * @returns 可合并进上传请求体的来源字段。
 */
const buildUploadSource = async (source: string): Promise<{ url?: string; file_data?: string }> => {
  const value = source.trim()
  if (HTTP_URL_RE.test(value)) return { url: value }
  if (DATA_URL_BASE64_RE.test(value) || BASE64_PREFIX_RE.test(value)) {
    return { file_data: stripBase64Prefix(value) }
  }
  if (isLocalPathSource(value)) {
    return { file_data: await readLocalFileAsBase64(value) }
  }
  return { file_data: value }
}

/**
 * 将 fallback 来源归一为可判断大小、可分片读取的形式。
 *
 * @param type 富媒体类型。
 * @param source Karin 消息段里的 file 字段。
 * @param fileName 可选文件名。
 * @returns 可用于普通上传或分片上传的来源。
 */
const buildFallbackSource = async (
  type: MediaType,
  source: string,
  fileName?: string
): Promise<ChunkableSource> => {
  const value = source.trim()
  const normalizedName = normalizeUploadFileName(type, fileName)

  if (HTTP_URL_RE.test(value)) {
    const buffer = await downloadRemoteAsBuffer(value)
    return { kind: 'buffer', buffer, size: buffer.length, fileName: normalizedName }
  }

  if (DATA_URL_BASE64_RE.test(value) || BASE64_PREFIX_RE.test(value)) {
    const buffer = Buffer.from(stripBase64Prefix(value), 'base64')
    return { kind: 'buffer', buffer, size: buffer.length, fileName: normalizedName }
  }

  if (isLocalPathSource(value)) {
    const file = normalizeLocalPath(value)
    const info = await stat(file)
    const name = normalizeUploadFileName(type, fileName || path.basename(file))
    return { kind: 'local', file, size: info.size, fileName: name }
  }

  const buffer = Buffer.from(value, 'base64')
  return { kind: 'buffer', buffer, size: buffer.length, fileName: normalizedName }
}

/**
 * 读取 fallback 来源的小文件内容并转成 base64。
 * @param source fallback 来源。
 * @returns base64 字符串。
 */
const readFallbackSourceAsBase64 = async (source: ChunkableSource): Promise<string> => {
  if (source.kind === 'buffer') return source.buffer.toString('base64')
  return readFile(source.file, 'base64')
}

/**
 * 计算 QQ upload_prepare 所需的 hash。
 *
 * @param source fallback 来源。
 * @returns 完整 MD5、完整 SHA1 与前 10MB MD5。
 */
const computeUploadHashes = async (source: ChunkableSource): Promise<UploadPrepareHashes> => {
  if (source.kind === 'buffer') {
    const md5 = crypto.createHash('md5').update(source.buffer).digest('hex')
    const sha1 = crypto.createHash('sha1').update(source.buffer).digest('hex')
    const md510m = source.size > MD5_10M_SIZE
      ? crypto.createHash('md5').update(source.buffer.subarray(0, MD5_10M_SIZE)).digest('hex')
      : md5
    return { md5, sha1, md510m }
  }

  return new Promise((resolve, reject) => {
    const md5 = crypto.createHash('md5')
    const sha1 = crypto.createHash('sha1')
    const md510m = crypto.createHash('md5')
    const needsMd510m = source.size > MD5_10M_SIZE
    let consumed = 0

    const stream = createReadStream(source.file)
    stream.on('data', (chunk: Buffer | string) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      md5.update(buffer)
      sha1.update(buffer)

      if (needsMd510m) {
        const remaining = MD5_10M_SIZE - consumed
        if (remaining > 0) {
          md510m.update(remaining >= buffer.length ? buffer : buffer.subarray(0, remaining))
        }
      }

      consumed += buffer.length
    })
    stream.on('end', () => {
      const md5Hex = md5.digest('hex')
      const sha1Hex = sha1.digest('hex')
      resolve({
        md5: md5Hex,
        sha1: sha1Hex,
        md510m: needsMd510m ? md510m.digest('hex') : md5Hex,
      })
    })
    stream.on('error', reject)
  })
}

/**
 * 从 fallback 来源读取指定分片。
 * @param source fallback 来源。
 * @param handle 本地文件句柄，buffer 来源不需要。
 * @param offset 分片起始位置。
 * @param length 分片长度。
 * @returns 分片内容。
 */
const readPart = async (
  source: ChunkableSource,
  handle: FileHandle | undefined,
  offset: number,
  length: number
): Promise<Buffer> => {
  if (source.kind === 'buffer') return source.buffer.subarray(offset, offset + length)
  if (!handle) throw new Error('读取分片失败：文件句柄不存在')

  const buffer = Buffer.alloc(length)
  const { bytesRead } = await handle.read(buffer, 0, length, offset)
  return bytesRead === length ? buffer : buffer.subarray(0, bytesRead)
}

/**
 * 带有限重试地把单个分片 PUT 到 QQ 返回的临时地址。
 *
 * @param url QQ 返回的分片上传地址。
 * @param data 分片内容。
 * @param partIndex 分片序号。
 * @param totalParts 总分片数。
 */
const putPart = async (
  url: string,
  data: Buffer,
  partIndex: number,
  totalParts: number
): Promise<void> => {
  let lastError: unknown

  for (let attempt = 0; attempt <= PART_UPLOAD_RETRIES; attempt++) {
    try {
      await axios.put(url, data, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(data.length),
        },
        timeout: PART_UPLOAD_TIMEOUT,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      })
      return
    } catch (err) {
      lastError = err
      if (attempt < PART_UPLOAD_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
  }

  throw new Error(`上传分片失败：${partIndex}/${totalParts}，${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

/**
 * 使用固定并发执行异步任务。
 * @param tasks 待执行任务。
 * @param concurrency 最大并发。
 */
const runWithConcurrency = async (tasks: Array<() => Promise<void>>, concurrency: number): Promise<void> => {
  let index = 0
  const workerCount = Math.max(1, Math.min(concurrency, tasks.length))
  const workers = Array.from({ length: workerCount }, async () => {
    while (index < tasks.length) {
      const current = index
      index += 1
      await tasks[current]()
    }
  })
  await Promise.all(workers)
}

/**
 * 等待指定时间。
 * @param ms 毫秒数。
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 从 axios 原始错误或已格式化错误文本里提取 QQ 业务错误码。
 * @param err 待检查的错误。
 * @returns 业务错误码。
 */
const openApiCode = (err: unknown): number | undefined => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined
    const code = typeof data?.code === 'number'
      ? data.code
      : typeof data?.err_code === 'number'
        ? data.err_code
        : undefined
    if (code !== undefined) return code
  }

  if (err instanceof Error) {
    const match = err.message.match(/\[Code\s+(\d+)\]/)
    if (match) return Number(match[1])
  }

  return undefined
}

/**
 * 判断 upload_part_finish 是否命中需要持续重试的服务端状态。
 * @param err 请求错误。
 * @returns 是否需要持续重试。
 */
const shouldRetryPartFinishPersistently = (err: unknown): boolean => {
  const code = openApiCode(err)
  return code !== undefined && PART_FINISH_RETRYABLE_CODES.has(code)
}

/**
 * 将未知错误重新抛出为 Error。
 * @param err 原始错误。
 */
const throwError = (err: unknown): never => {
  if (err instanceof Error) throw err
  throw new Error(typeof err === 'string' ? err : JSON.stringify(err))
}

/**
 * 富媒体上传
 */
export class MediaApi extends Http {
  /**
   * @param scene user(单聊) / group(群聊)
   * @param peer openid 或 group_openid
   * @param type 文件类型
   * @param source http url、本地路径或 base64 字符串
   * @param srvSendMsg 上传后是否由服务端直接发送
   * @param fileName 文件消息的展示文件名
   */
  async upload (
    scene: Scene,
    peer: string,
    type: MediaType,
    source: string,
    srvSendMsg = false,
    fileName?: string
  ): Promise<UploadMediaResponse> {
    const sourceBody = await buildUploadSource(source)
    const body: Record<string, unknown> = {
      file_type: FILE_TYPE[type],
      srv_send_msg: srvSendMsg,
    }
    Object.assign(body, sourceBody)
    if (type === 'file' && fileName) {
      body.file_name = fileName
    }

    const path = `/v2/${scene}s/${peer}/files`
    try {
      return await this.post(path, body, undefined, MEDIA_UPLOAD_TIMEOUT)
    } catch (err) {
      if (!sourceBody.url) throw err

      const fallbackBody: Record<string, unknown> = {
        ...body,
        file_data: await downloadRemoteAsBase64(sourceBody.url),
      }
      delete fallbackBody.url
      return this.post(path, fallbackBody, undefined, MEDIA_UPLOAD_TIMEOUT)
    }
  }

  /**
   * 上传没有公网 URL 处理器可用时的 fallback 富媒体资源。
   *
   * 较大的 fallback 资源会优先使用 QQ 分片上传，提高直接发送成功率。
   * `srvSendMsg` 为 true 时保留普通上传路径，避免分片完成接口与服务端直接发送语义冲突。
   *
   * @param scene user(单聊) / group(群聊)
   * @param peer openid 或 group_openid
   * @param type 文件类型
   * @param source 本地路径、http url、data URL、base64:// 或裸 base64
   * @param srvSendMsg 上传后是否由服务端直接发送
   * @param fileName 文件消息的展示文件名
   * @returns 上传结果，包含后续发送消息所需的 file_info
   */
  async uploadFallback (
    scene: Scene,
    peer: string,
    type: MediaType,
    source: string,
    srvSendMsg = false,
    fileName?: string
  ): Promise<UploadMediaResponse> {
    const fallbackSource = await buildFallbackSource(type, source, fileName)
    assertUploadSize(type, fallbackSource.size)
    const hashes = !srvSendMsg ? await computeUploadHashes(fallbackSource) : undefined

    if (hashes) {
      const cached = getCachedUpload(scene, peer, type, hashes.md5)
      if (cached) return cached
    }

    if (!srvSendMsg && fallbackSource.size >= LARGE_UPLOAD_THRESHOLD) {
      const response = await this.uploadChunked(scene, peer, type, fallbackSource, hashes)
      if (hashes) setCachedUpload(scene, peer, type, hashes.md5, response)
      return response
    }

    const body: Record<string, unknown> = {
      file_type: FILE_TYPE[type],
      srv_send_msg: srvSendMsg,
      file_data: await readFallbackSourceAsBase64(fallbackSource),
    }
    if (type === 'file') body.file_name = fallbackSource.fileName

    const response = await this.post<UploadMediaResponse>(`/v2/${scene}s/${peer}/files`, body, undefined, MEDIA_UPLOAD_TIMEOUT)
    if (hashes) setCachedUpload(scene, peer, type, hashes.md5, response)
    return response
  }

  /**
   * 确认单个分片已完成上传。
   *
   * QQ 有时会在分片刚 PUT 完时短暂返回 40093001，此时需要在服务端给出的
   * retry_timeout 窗口内持续重试，而不是直接判定整个大文件上传失败。
   *
   * @param scene user(单聊) / group(群聊)
   * @param peer openid 或 group_openid
   * @param body upload_part_finish 请求体
   * @param retryTimeout 服务端返回的持续重试秒数
   */
  private async finishUploadPart (
    scene: Scene,
    peer: string,
    body: Record<string, unknown>,
    retryTimeout?: number
  ): Promise<void> {
    let lastError: unknown

    for (let attempt = 0; attempt <= PART_FINISH_RETRIES; attempt++) {
      try {
        await this.post(`/v2/${scene}s/${peer}/upload_part_finish`, body, undefined, MEDIA_UPLOAD_TIMEOUT)
        return
      } catch (err) {
        if (shouldRetryPartFinishPersistently(err)) {
          await this.retryUploadPartFinish(scene, peer, body, retryTimeout)
          return
        }

        lastError = err
        if (attempt < PART_FINISH_RETRIES) {
          await sleep(PART_FINISH_BASE_DELAY * 2 ** attempt)
        }
      }
    }

    throwError(lastError)
  }

  /**
   * 持续重试 upload_part_finish 的短暂服务端状态。
   *
   * @param scene user(单聊) / group(群聊)
   * @param peer openid 或 group_openid
   * @param body upload_part_finish 请求体
   * @param retryTimeout 服务端返回的持续重试秒数
   */
  private async retryUploadPartFinish (
    scene: Scene,
    peer: string,
    body: Record<string, unknown>,
    retryTimeout?: number
  ): Promise<void> {
    const retryTimeoutMs = retryTimeout
      ? Math.min(Number(retryTimeout) * 1000, PART_FINISH_MAX_RETRY_TIMEOUT)
      : PART_FINISH_DEFAULT_RETRY_TIMEOUT
    const deadline = Date.now() + retryTimeoutMs
    let attempts = 0
    let lastError: unknown

    while (Date.now() < deadline) {
      try {
        await this.post(`/v2/${scene}s/${peer}/upload_part_finish`, body, undefined, MEDIA_UPLOAD_TIMEOUT)
        return
      } catch (err) {
        lastError = err
        if (!shouldRetryPartFinishPersistently(err)) throwError(err)
        attempts += 1
        await sleep(Math.min(PART_FINISH_RETRY_INTERVAL, Math.max(0, deadline - Date.now())))
      }
    }

    throw new Error(`upload_part_finish 持续重试超时：${Math.round(retryTimeoutMs / 1000)}s，已重试 ${attempts} 次，最后错误：${lastError instanceof Error ? lastError.message : String(lastError)}`)
  }

  /**
   * 完成 QQ 分片上传，并对短暂失败做有限重试。
   *
   * @param scene user(单聊) / group(群聊)
   * @param peer openid 或 group_openid
   * @param uploadId upload_prepare 返回的上传任务 ID
   * @returns 上传结果
   */
  private async completeChunkedUpload (
    scene: Scene,
    peer: string,
    uploadId: string
  ): Promise<UploadMediaResponse> {
    let lastError: unknown
    const body = { upload_id: uploadId }

    for (let attempt = 0; attempt <= COMPLETE_UPLOAD_RETRIES; attempt++) {
      try {
        return await this.post(`/v2/${scene}s/${peer}/files`, body, undefined, MEDIA_UPLOAD_TIMEOUT)
      } catch (err) {
        lastError = err
        if (attempt < COMPLETE_UPLOAD_RETRIES) {
          await sleep(COMPLETE_UPLOAD_BASE_DELAY * 2 ** attempt)
        }
      }
    }

    return throwError(lastError)
  }

  /**
   * 使用 QQ 官方分片协议上传 fallback 大资源。
   *
   * 流程为：准备上传 -> PUT 每个分片 -> 确认每个分片 -> 完成上传。
   *
   * @param scene user(单聊) / group(群聊)
   * @param peer openid 或 group_openid
   * @param type 文件类型
   * @param source 已归一化的 fallback 来源
   * @param preparedHashes 预计算的文件 hash
   * @returns 上传结果，包含后续发送消息所需的 file_info
   */
  private async uploadChunked (
    scene: Scene,
    peer: string,
    type: MediaType,
    source: ChunkableSource,
    preparedHashes?: UploadPrepareHashes
  ): Promise<UploadMediaResponse> {
    const hashes = preparedHashes || await computeUploadHashes(source)
    const prepareBody: Record<string, unknown> = {
      file_type: FILE_TYPE[type],
      file_name: source.fileName,
      file_size: source.size,
      md5: hashes.md5,
      sha1: hashes.sha1,
    }
    prepareBody['md5_10m'] = hashes.md510m

    const prepare = await this.post<UploadPrepareResponse>(
      `/v2/${scene}s/${peer}/upload_prepare`,
      prepareBody,
      undefined,
      MEDIA_UPLOAD_TIMEOUT
    ).catch((err): never => {
      if (openApiCode(err) === UPLOAD_PREPARE_DAILY_LIMIT_CODE) {
        throw new Error(`QQ 大文件上传额度已达上限，${MEDIA_TYPE_LABEL[type]}暂时无法通过 fallback 直传：${source.fileName} (${formatBytes(source.size)})`)
      }
      return throwError(err)
    })

    if (!prepare.parts.length) {
      throw new Error('分片上传准备失败：QQ 未返回分片信息')
    }

    const concurrency = Math.min(
      prepare.concurrency || DEFAULT_PART_CONCURRENCY,
      MAX_PART_CONCURRENCY,
      prepare.parts.length
    )
    const handle = source.kind === 'local' ? await open(source.file, 'r') : undefined

    try {
      const tasks = prepare.parts.map(part => async () => {
        const offset = (part.index - 1) * prepare.block_size
        const length = Math.min(prepare.block_size, source.size - offset)
        const data = await readPart(source, handle, offset, length)
        const md5 = crypto.createHash('md5').update(data).digest('hex')

        await putPart(part.presigned_url, data, part.index, prepare.parts.length)
        await this.finishUploadPart(
          scene,
          peer,
          {
            upload_id: prepare.upload_id,
            part_index: part.index,
            block_size: data.length,
            md5,
          },
          prepare.retry_timeout
        )
      })

      await runWithConcurrency(tasks, concurrency)
    } finally {
      await handle?.close().catch(() => undefined)
    }

    return this.completeChunkedUpload(scene, peer, prepare.upload_id)
  }
}
