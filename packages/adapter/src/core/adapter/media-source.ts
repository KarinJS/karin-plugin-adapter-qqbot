import { fileToUrl, fileToUrlHandlerKey, handler } from 'node-karin'
import { DATA_URL_BASE64_RE, DEFAULT_FILENAME, HTTP_URL_RE, QQBOT_MEDIA_RE } from '@/core/constants'
import { getImageSize } from '@/utils/common'
import type { ElementTypes } from 'node-karin'
import type { AdapterQQBot } from './base'
import type { MediaType, Scene } from '@/core/api/types'

/**
 * 本次发送归属的上传会话。
 *
 * QQ 的 openid 按 bot 隔离，上传接口的路径参数只接受该 bot 可见的
 * group_openid / user_openid。因此把真实发送目标一并交给 fileToUrl 处理器，
 * 需要借 QQ 通道上传的处理器才能用对会话，而不是猜一个。
 */
export interface UploadOrigin {
  /** 会话类型。 */
  scene: Scene
  /** 目标 group_openid 或 user_openid。 */
  peer: string
}

/**
 * 拿到 URL 之后的用途。
 *
 * - markdown：URL 会被写进 markdown 正文，必须是公网可访问地址；
 * - media：URL 只是交给 QQ 富媒体接口去下载转存，本地路径同样可用。
 */
export type UploadPurpose = 'markdown' | 'media'

/**
 * 传给 fileToUrl 处理器的附加信息。
 *
 * 处理器通过 `args.args` 读取。对不认识这些字段的第三方处理器没有影响，
 * 行为与之前一致。
 */
export interface FileToUrlExtra {
  /** 正在执行本次发送的 bot，用于让上传走同一个 bot。 */
  selfId: string
  /** 本次转换的用途。 */
  purpose: UploadPurpose
  /** 本次发送归属的上传会话；频道场景没有可用 openid 时为 undefined。 */
  origin?: UploadOrigin
  /**
   * 是否允许适配器内置的 fileToUrl 处理器接手。
   *
   * 发送链路会先传 false，让用户处理器和 QQ 素材管理依次尝试；两者都失败后
   * 再传 true 调用内置图床。用户处理器可以忽略该字段。
   */
  allowBuiltinFileToUrl?: boolean
}

/** HTTP(S) 资源已经是可直接传给 QQ 平台的公网地址。 */

/**
 * 把带 MIME 头的完整 data URL（`data:image/png;base64,...`）归一为 Karin 标准
 * 的 `base64://` 形式，其余来源原样返回。
 *
 * 下游插件经常直接给出完整 data URL；QQ 上传层认识它，但 karin 的
 * `common.buffer` 和不少第三方 fileToUrl 处理器只认 `base64://`，因此在进入
 * 发送链路时统一归一，避免同一资源在不同环节表现不一致。
 *
 * @param source Karin 消息段里的 file 字段。
 * @returns 归一后的来源字符串。
 */
export const normalizeMediaSource = (source: string): string => {
  return DATA_URL_BASE64_RE.test(source) ? source.replace(DATA_URL_BASE64_RE, 'base64://') : source
}

/** 带 file 字段的富媒体消息段类型。 */
const MEDIA_ELEMENT_TYPES = new Set(['image', 'video', 'record', 'file'])

/**
 * 把消息段里带 MIME 头的完整 data URL（`data:image/png;base64,...`）统一归一为
 * Karin 标准的 `base64://` 形式。下游的 fileToUrl 处理器与 karin `common.buffer`
 * 大多只认后者，在进入发送链路前归一可以保证各环节行为一致。
 *
 * @param elements 待发送的消息段。
 * @returns 归一后的消息段；无需归一时返回原数组。
 */
export const normalizeMediaElements = (elements: Array<ElementTypes>): Array<ElementTypes> => {
  return elements.map((el) => {
    if (!MEDIA_ELEMENT_TYPES.has(el.type)) return el
    const file = (el as { file?: unknown }).file
    if (typeof file !== 'string') return el
    const normalized = normalizeMediaSource(file)
    return normalized === file ? el : ({ ...el, file: normalized } as ElementTypes)
  })
}

/** 富媒体来源解析结果。 */
export interface PreferredMediaSource {
  /** 交给后续 markdown 或富媒体上传的来源。 */
  source: string
  /** 来源是原始 HTTP URL、fileToUrl 结果，还是 QQ 上传兜底。 */
  via: 'public-url' | 'file-to-url' | 'qqbot-media' | 'fallback'
  /**
   * fileToUrl 处理器顺带返回的图片宽高。
   *
   * markdown 图片语法必须写出宽高，处理器（含内置图床）上传时已经知道尺寸，
   * 带出来就不必再按 URL 把图片下载回来量一次。
   */
  size?: { width: number; height: number }
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
 * 解析本地 / Base64 富媒体来源。
 *
 * 优先级为：用户自己的 `fileToUrl` 处理器 -> Markdown 图片素材管理 ->
 * 适配器内置 fileToUrl 图床 -> QQ 富媒体上传兜底。内置图床只在前两步都失败后
 * 才被允许接手，避免临时直链抢占 `qqbot-media://`；视频 / 语音仍可由内置图床取直链。
 *
 * @param ctx 适配器实例，用于记录降级日志并标明执行发送的 bot。
 * @param type 富媒体类型。
 * @param source Karin 消息段里的 file 字段。
 * @param filename 可选文件名，主要用于 file 消息。
 * @param origin 本次发送归属的上传会话，供需要借 QQ 通道上传的处理器使用。
 * @param purpose 拿到 URL 之后的用途，默认按富媒体上传处理。
 * @returns 解析后的首选来源和来源类型。
 */
export const resolvePreferredMediaSource = async (
  ctx: AdapterQQBot,
  type: MediaType,
  source: string,
  filename?: string,
  origin?: UploadOrigin,
  purpose: UploadPurpose = 'media'
): Promise<PreferredMediaSource> => {
  const normalized = normalizeMediaSource(source)
  if (isHttpMediaSource(normalized) || QQBOT_MEDIA_RE.test(normalized)) {
    return { source: normalized, via: 'public-url' }
  }

  /** 将 fileToUrl 结果归一为发送链路需要的来源结构。 */
  const toPreferred = (result: { url: string; width?: number; height?: number }): PreferredMediaSource => {
    const size =
      typeof result.width === 'number' && typeof result.height === 'number'
        ? { width: result.width, height: result.height }
        : undefined
    return { source: result.url, via: 'file-to-url', size }
  }

  /**
   * 调用 fileToUrl 链。
   *
   * 第一次传 `allowBuiltinFileToUrl: false`，内置处理器会主动放行；素材管理
   * 失败后再传 true，允许内置图床接手。用户自己的处理器在两轮中都可以响应。
   */
  const tryFileToUrl = async (
    allowBuiltinFileToUrl: boolean
  ): Promise<{ result?: { url: string; width?: number; height?: number }; error?: unknown }> => {
    if (!hasFileToUrlHandler()) return {}

    try {
      const extra: FileToUrlExtra = {
        selfId: ctx.selfId,
        purpose,
        origin,
        allowBuiltinFileToUrl,
      }
      const result = await fileToUrl(type, normalized, filename || DEFAULT_FILENAME[type], extra)
      return { result: result?.url ? result : undefined }
    } catch (err) {
      return { error: err }
    }
  }

  /**
   * 图片要进入 Markdown 时，如果用户图床不可用，优先使用官方素材管理。
   * 该接口返回的 `qqbot-media://` 可以直接写进 Markdown，且不依赖公网 URL。
   */
  const tryQQBotMedia = async (): Promise<PreferredMediaSource | undefined> => {
    if (type !== 'image' || purpose !== 'markdown') return undefined

    try {
      const size = await getImageSize(normalized).catch(() => undefined)
      const uploaded = await ctx.super.mediaImages.upload(normalized, filename)
      ctx.logger('debug', `[sendQQ] 素材管理上传成功，ttl=${uploaded.ttl}s: ${uploaded.url}`)
      return { source: uploaded.url, via: 'qqbot-media', size }
    } catch (err) {
      ctx.logger('debug', `[sendQQ] ${type} 素材管理上传失败，继续尝试内置图床:`, err)
      return undefined
    }
  }

  const userStage = await tryFileToUrl(false)
  if (userStage.result) return toPreferred(userStage.result)

  const material = await tryQQBotMedia()
  if (material) return material

  const builtinStage = await tryFileToUrl(true)
  if (builtinStage.result) return toPreferred(builtinStage.result)

  const failure = builtinStage.error || userStage.error
  if (failure) {
    ctx.logger('warn', `[sendQQ] ${type} 转 URL 失败，改用 QQ 上传兜底:`, failure)
  } else {
    ctx.logger('debug', `[sendQQ] 没有 fileToUrl 处理器接手 ${type}，改用 QQ 上传兜底`)
  }

  return { source: normalized, via: 'fallback' }
}
