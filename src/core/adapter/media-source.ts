import { fileToUrl, fileToUrlHandlerKey, handler } from 'node-karin'
import { DATA_URL_BASE64_RE, DEFAULT_FILENAME, HTTP_URL_RE } from '@/core/constants'
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
  return DATA_URL_BASE64_RE.test(source)
    ? source.replace(DATA_URL_BASE64_RE, 'base64://')
    : source
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
  via: 'public-url' | 'file-to-url' | 'fallback'
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
 * 优先把本地/base64 富媒体转换为公网 URL；没有处理器或转换失败时返回原始来源。
 *
 * QQ 官方的普通 file_data 上传对视频等资源更容易失败，因此 adapter 层始终把
 * fileToUrl 作为主路径，QQ 上传只做兜底。
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
  if (isHttpMediaSource(normalized)) {
    return { source: normalized, via: 'public-url' }
  }

  if (!hasFileToUrlHandler()) {
    return { source: normalized, via: 'fallback' }
  }

  try {
    const extra: FileToUrlExtra = { selfId: ctx.selfId, purpose, origin }
    const result = await fileToUrl(type, normalized, filename || DEFAULT_FILENAME[type], extra)

    /**
     * `handler.has` 只判断该 key 下是否注册过处理器，不代表真的有处理器接手：
     * 所有处理器都调用 next() 放行时，fileToUrl 会返回 undefined。此时不属于
     * 异常，安静地走 QQ 上传兜底即可，不必输出 warn 噪音。
     */
    if (!result?.url) {
      ctx.logger('debug', `[sendQQ] 没有 fileToUrl 处理器接手 ${type}，改用 QQ 上传兜底`)
      return { source: normalized, via: 'fallback' }
    }

    /** 只有 image 会带宽高，其余类型按声明就没有这两个字段。 */
    const { width, height } = result as { width?: number; height?: number }
    const size = typeof width === 'number' && typeof height === 'number'
      ? { width, height }
      : undefined

    return { source: result.url, via: 'file-to-url', size }
  } catch (err) {
    ctx.logger('warn', `[sendQQ] ${type} 转 URL 失败，改用 QQ 上传兜底:`, err)
    return { source: normalized, via: 'fallback' }
  }
}
