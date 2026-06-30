import { fileToUrl, fileToUrlHandlerKey, handler } from 'node-karin'
import type { AdapterQQBot } from './base'
import type { MediaType } from '@/core/api/types'

/** HTTP(S) 资源已经是可直接传给 QQ 平台的公网地址。 */
const HTTP_URL_RE = /^https?:\/\//i

/** fileToUrl 需要文件名来推断上传类型；没有业务文件名时使用这些默认值。 */
const DEFAULT_FILENAME: Record<MediaType, string> = {
  image: 'image.jpg',
  video: 'video.mp4',
  record: 'record.mp3',
  file: 'file.bin',
}

/** 富媒体来源解析结果。 */
export interface PreferredMediaSource {
  /** 交给后续 markdown 或富媒体上传的来源。 */
  source: string
  /** 来源是原始 HTTP URL、fileToUrl 结果，还是 QQ 上传兜底。 */
  via: 'public-url' | 'file-to-url' | 'fallback'
}

/**
 * 当前 Karin 运行时是否注册了 fileToUrl 处理器。
 * @returns true 表示可以优先通过 fileToUrl 产出公网 URL。
 */
export const hasFileToUrlHandler = (): boolean => handler.has(fileToUrlHandlerKey)

/**
 * 判断一个来源是否已经是公网 HTTP(S) 地址。
 * @param source Karin 消息段里的 file 字段。
 * @returns 是否为 HTTP(S) URL。
 */
export const isHttpMediaSource = (source: string): boolean => HTTP_URL_RE.test(source)

/**
 * 优先把本地/base64 富媒体转换为公网 URL；没有处理器或转换失败时返回原始来源。
 *
 * QQ 官方的普通 file_data 上传对视频等资源更容易失败，因此 adapter 层始终把
 * fileToUrl 作为主路径，QQ 上传只做兜底。
 *
 * @param ctx 适配器实例，用于记录降级日志。
 * @param type 富媒体类型。
 * @param source Karin 消息段里的 file 字段。
 * @param filename 可选文件名，主要用于 file 消息。
 * @returns 解析后的首选来源和来源类型。
 */
export const resolvePreferredMediaSource = async (
  ctx: AdapterQQBot,
  type: MediaType,
  source: string,
  filename?: string
): Promise<PreferredMediaSource> => {
  if (isHttpMediaSource(source)) {
    return { source, via: 'public-url' }
  }

  if (!hasFileToUrlHandler()) {
    return { source, via: 'fallback' }
  }

  try {
    const result = await fileToUrl(type, source, filename || DEFAULT_FILENAME[type])
    return { source: result.url, via: 'file-to-url' }
  } catch (err) {
    ctx.logger('warn', `[sendQQ] ${type} 转 URL 失败，改用 QQ 上传兜底:`, err)
    return { source, via: 'fallback' }
  }
}
