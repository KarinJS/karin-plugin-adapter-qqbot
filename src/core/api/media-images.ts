import crypto from 'node:crypto'
import path from 'node:path'
import axios from 'node-karin/axios'
import { common } from 'node-karin'
import { Http } from './http'
import type {
  MediaImageCompleteRequest, MediaImageCompleteResponse, MediaImageListParams,
  MediaImageListResponse, MediaImagePrepareRequest, MediaImagePrepareResponse,
} from './types'

/** 素材图片缓存提前失效时间，避免临界点继续引用刚过期的 URL。 */
const MEDIA_IMAGE_TTL_SAFETY_MARGIN_SECONDS = 60

interface MediaImageType {
  mime: string
  ext: 'png' | 'jpg' | 'gif' | 'webp'
}

interface CachedMediaImage {
  response: MediaImageCompleteResponse
  expiresAt: number
}

/**
 * 根据文件头识别官方支持的图片类型。
 *
 * 素材接口要求文件名扩展名与 Content-Type 一致，因此不能只依赖调用方传入的
 * 文件名；Buffer 内容才是最终可信来源。
 *
 * @param buffer 图片内容。
 * @returns 图片 MIME 与标准扩展名。
 */
const detectMediaImageType = (buffer: Buffer): MediaImageType => {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    return { mime: 'image/png', ext: 'png' }
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  const header = buffer.subarray(0, 6).toString('ascii')
  if (header === 'GIF87a' || header === 'GIF89a') {
    return { mime: 'image/gif', ext: 'gif' }
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' }
  }
  throw new Error('素材图片格式不支持：仅支持 png / jpeg / gif / webp')
}

/**
 * 让文件名扩展名与真实图片格式一致。
 *
 * @param fileName 调用方传入的文件名。
 * @param type 识别出的图片类型。
 * @returns 可直接交给 QQ 的文件名。
 */
const normalizeMediaImageName = (fileName: string | undefined, type: MediaImageType): string => {
  const fallback = `image.${type.ext}`
  const base = path.basename(fileName?.trim() || fallback)
  const currentExt = path.extname(base).slice(1).toLowerCase()
  if (currentExt === type.ext || (type.ext === 'jpg' && currentExt === 'jpeg')) return base
  const stem = currentExt ? base.slice(0, -(currentExt.length + 1)) : base
  return `${stem || 'image'}.${type.ext}`
}

/**
 * 读取素材图片内容。支持 Buffer、URL、本地路径、data URL 与 base64://。
 *
 * @param source 图片来源。
 * @returns 图片二进制。
 */
const readMediaImageBuffer = async (source: string | Buffer | Uint8Array): Promise<Buffer> => {
  if (Buffer.isBuffer(source)) return source
  if (source instanceof Uint8Array) return Buffer.from(source)

  const normalized = source.trim().replace(/^data:([^;,]+);base64,/i, 'base64://')
  const compact = normalized.replace(/\s+/g, '')
  /** Karin 消息段可能直接给裸 base64，不一定是 `base64://` 前缀。 */
  if (compact.length >= 8 && compact.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    const decoded = Buffer.from(compact, 'base64')
    try {
      detectMediaImageType(decoded)
      return decoded
    } catch {
      /** 不是图片 base64 时继续交给 common.buffer 按路径/URL 处理。 */
    }
  }

  const data = await common.buffer(normalized)
  return Buffer.from(data)
}

/**
 * Markdown 素材图片管理。
 *
 * 官方接口文档 v1.42.0 新增 `/v2/media-images` 系列接口，用于把本地图片
 * 上传为可长期复用的 `qqbot-media://` Markdown 引用。
 */
export class MediaImagesApi extends Http {
  /** 当前 bot 进程内按内容 MD5 复用的素材缓存。 */
  private readonly cache = new Map<string, CachedMediaImage>()
  /** 申请上传图片，获取 upload_id 与预签名 PUT 地址。 */
  prepare (body: MediaImagePrepareRequest): Promise<MediaImagePrepareResponse> {
    return this.post('/v2/media-images/prepare', body)
  }

  /** 完成图片上传，获取可写入 Markdown 的 `qqbot-media://` 引用。 */
  complete (body: MediaImageCompleteRequest): Promise<MediaImageCompleteResponse> {
    return this.post('/v2/media-images/complete', body)
  }

  /** 查询当前机器人的有效素材图片。 */
  list (params: MediaImageListParams = {}): Promise<MediaImageListResponse> {
    return this.get('/v2/media-images', {
      params: params.cursor ? { cursor: params.cursor } : undefined,
    })
  }

  /** 删除素材图片并释放数量配额。 */
  override delete<T = Record<string, never>>(imageId: string): Promise<T> {
    this.cache.clear()
    return super.delete<T>(`/v2/media-images/${encodeURIComponent(imageId)}/delete`)
  }

  /**
   * 上传图片并返回可写入 Markdown 的 `qqbot-media://` 引用。
   *
   * 自动完成文件头识别、文件名规范化、MD5/SHA1 计算、预签名 PUT 与 complete。
   *
   * @param source 图片来源：Buffer、URL、本地路径、data URL 或 base64://。
   * @param fileName 可选文件名；未提供时按真实图片格式生成。
   * @returns complete 接口响应。
   */
  async upload (
    source: string | Buffer | Uint8Array,
    fileName?: string
  ): Promise<MediaImageCompleteResponse> {
    /**
     * 不在适配器侧限制图片体积；平台当前素材接口限制为 10MB，但限制策略
     * 可能调整，统一由 prepare / complete 接口返回的错误决定。
     */
    const buffer = await readMediaImageBuffer(source)
    if (!buffer.length) throw new Error('素材图片内容为空')

    const type = detectMediaImageType(buffer)
    const normalizedName = normalizeMediaImageName(fileName, type)
    const md5 = crypto.createHash('md5').update(buffer).digest('hex')
    const cached = this.cache.get(md5)
    if (cached && (cached.expiresAt === 0 || cached.expiresAt > Date.now())) {
      return cached.response
    }

    const sha1 = crypto.createHash('sha1').update(buffer).digest('hex')
    const prepared = await this.prepare({
      file_name: normalizedName,
      file_size: buffer.length,
      content_type: type.mime,
      md5,
      sha1,
    })

    await axios.put(prepared.presigned_url, buffer, {
      headers: {
        'Content-Type': type.mime,
        'Content-Length': String(buffer.length),
      },
      timeout: 120_000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })

    const response = await this.complete({ upload_id: prepared.upload_id, md5 })
    const ttl = Number(response.ttl)
    const expiresAt = ttl > 0
      ? Date.now() + Math.max(ttl - MEDIA_IMAGE_TTL_SAFETY_MARGIN_SECONDS, 10) * 1000
      : 0
    this.cache.set(md5, { response, expiresAt })
    return response
  }
}
