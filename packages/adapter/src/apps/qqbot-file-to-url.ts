import karin, { getAllBot } from 'node-karin'
import { getImageSize } from '@/utils/common'
import type { AdapterQQBot } from '@/core/adapter/base'
import type { FileToUrlExtra } from '@/core/adapter/media-source'
import type { MediaType } from '@/core/api/types'

/**
 * 内置 `fileToUrl` 处理器：用 QQ 官方分片上传充当临时图床。
 *
 * 发送链路会先尝试用户自己的 `fileToUrl` 和 QQ 素材管理；两者都失败后才把
 * `allowBuiltinFileToUrl` 设为 true，允许本处理器接手。这样图片优先得到
 * `qqbot-media://`，临时直链只作为 Markdown 内嵌的最后手段，再失败才降级为
 * 独立的 `msg_type=7` 富媒体消息。
 *
 * 只在以下条件全部满足时接手，其余情况一律放行给链路上的其他处理器：
 * - 资源要被写进 markdown 正文（富媒体上传不需要先换成 URL）；
 * - 类型是图片 / 视频 / 语音（QQ 不为文件类型返回直链）；
 * - 允许内置图床接手；
 * - 能确定执行上传的 bot 与归属会话（频道场景没有可用 openid）。
 */

/** 内置 fileToUrl 处理器的接手条件。 */
export interface BuiltinFileToUrlInput {
  type: MediaType
  purpose?: FileToUrlExtra['purpose']
  selfId?: string
  origin?: FileToUrlExtra['origin']
  allowBuiltinFileToUrl?: boolean
}

/**
 * 判断内置处理器是否应接手本次 fileToUrl 请求。
 *
 * 发送链路在用户处理器和素材管理阶段会传 `allowBuiltinFileToUrl: false`，
 * 此时内置图床必须放行；只有最后兜底阶段才允许接手图片。
 *
 * @param input 当前 fileToUrl 请求的媒体类型与上下文。
 * @returns 是否由内置处理器处理。
 */
export const shouldHandleBuiltinFileToUrl = (input: BuiltinFileToUrlInput): boolean => {
  return (
    input.purpose === 'markdown' &&
    input.type !== 'file' &&
    input.allowBuiltinFileToUrl !== false &&
    !!input.selfId &&
    !!input.origin
  )
}

/**
 * 判断已注册的 bot 是否由本插件提供。
 *
 * @param bot Karin 注册表里的 bot 实例。
 * @returns 是否为 QQBot 适配器。
 */
const isQQBot = (bot: unknown): bot is AdapterQQBot => {
  const candidate = bot as AdapterQQBot | undefined
  return candidate?.adapter?.protocol === 'qqbot' && !!candidate.super?.media
}

/**
 * 按 appId 取出对应的 QQBot。
 *
 * 不做「随便挑一个」的兜底：openid 按 bot 隔离，用错 bot 上传要么失败，要么把
 * 文件传到了另一个账号的会话下，只能定位到确切的那一个。
 *
 * @param selfId 目标 bot 的 appId。
 * @returns 对应的 QQBot 适配器，未注册时返回 undefined。
 */
const findBot = (selfId: string): AdapterQQBot | undefined => {
  return getAllBot()
    .filter(isQQBot)
    .find((bot) => bot.selfId === selfId)
}

/**
 * 把处理器收到的文件参数归一成 media 接口可用的来源字符串。
 *
 * @param file 处理器入参里的文件数据。
 * @returns 路径 / URL 字符串，或 base64:// 形式的内容。
 */
const toUploadSource = (file: string | Buffer | Uint8Array): string => {
  if (typeof file === 'string') return file
  return `base64://${Buffer.from(file).toString('base64')}`
}

export const qqbotFileToUrl = karin.handler(
  'fileToUrl',
  async (payload, next) => {
    /** fileToUrl 把第四个参数原样放在 args 字段下。 */
    const {
      file,
      type,
      filename,
      args: extra,
    } = payload as {
      file: string | Buffer | Uint8Array
      type: MediaType
      filename?: string
      args?: Partial<FileToUrlExtra>
    }

    const selfId = extra?.selfId
    const origin = extra?.origin
    if (!selfId || !origin) return next()
    if (
      !shouldHandleBuiltinFileToUrl({
        type,
        purpose: extra?.purpose,
        selfId,
        origin,
        allowBuiltinFileToUrl: extra?.allowBuiltinFileToUrl,
      })
    )
      return next()

    const bot = findBot(selfId)
    if (!bot) return next()

    try {
      const { url, response } = await bot.super.media.uploadForUrl(
        origin.scene,
        origin.peer,
        type,
        toUploadSource(file),
        filename
      )

      bot.logger('debug', `[内置图床] 已取得直链，有效期 ${response.ttl}s: ${url}`)
      if (type !== 'image') return { url }

      /** Markdown 图片必须携带宽高，否则 QQ 客户端会使用极小的默认尺寸。 */
      const { width, height } = await getImageSize(file)
      return { url, width, height }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      bot.logger('debug', `[内置图床] 取直链失败，交给后续处理器: ${reason}`)
      return next()
    }
  },
  {
    name: 'QQBot 分片上传图床',
    /**
     * rank 升序执行，默认 10000。这里排在默认值之后：本处理器给出的是会过期的
     * 临时地址，使用方自建的图床通常是长期地址，应当优先生效。
     */
    rank: 20000,
  }
)
