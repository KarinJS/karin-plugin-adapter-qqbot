import karin, { getAllBot } from 'node-karin'
import { getImageSize } from '@/utils/common'
import type { AdapterQQBot } from '@/core/adapter/base'
import type { FileToUrlExtra } from '@/core/adapter/media-source'
import type { MediaType } from '@/core/api/types'

/**
 * 内置 `fileToUrl` 处理器：用 QQ 官方分片上传充当临时图床。
 *
 * 分片上传完成后，合并响应会带上资源的下载直链。有了这个地址，本地图片、截图、
 * base64 图片就能以 markdown 图片语法进入消息正文，和文本、按钮合并成一条消息，
 * 而不是退化成一条独立的富媒体消息。
 *
 * 无需任何配置：适配器发送消息时会把执行发送的 bot 和真实发送目标一并交给本
 * 处理器，上传因此总是发生在同一个 bot、同一个会话下。QQ 的 openid 按 bot
 * 隔离，这一点不能靠猜。上传只借用会话的上传通道，不会往会话里发任何消息。
 *
 * 只在以下条件全部满足时接手，其余情况一律放行给链路上的其他处理器：
 * - 资源要被写进 markdown 正文（富媒体上传不需要先换成 URL）；
 * - 类型是图片 / 视频 / 语音（QQ 不为文件类型返回直链）；
 * - 能确定执行上传的 bot 与归属会话（频道场景没有可用 openid）。
 */

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
  return getAllBot().filter(isQQBot).find(bot => bot.selfId === selfId)
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

export const qqbotFileToUrl = karin.handler('fileToUrl', async (payload, next) => {
  /** fileToUrl 把第四个参数原样放在 args 字段下。 */
  const { file, type, filename, args: extra } = payload as {
    file: string | Buffer | Uint8Array
    type: MediaType
    filename?: string
    args?: Partial<FileToUrlExtra>
  }

  /**
   * 富媒体上传接受本地文件与 base64，先换成 URL 再交给 QQ 反而多一次往返，
   * 而且那次往返仍然是 QQ 自己下载转存，没有收益。
   */
  if (extra?.purpose !== 'markdown') return next()

  /** QQ 只对图片 / 视频 / 语音返回下载直链。 */
  if (type === 'file') return next()

  /** 频道场景用 channel_id，没有上传接口要求的 openid。 */
  const origin = extra.origin
  if (!extra.selfId || !origin) return next()

  const bot = findBot(extra.selfId)
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

    /** markdown 图片语法需要宽高；解析不出来时 getImageSize 会给出保守默认值。 */
    const { width, height } = await getImageSize(file)
    return { url, width, height }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)
    bot.logger('debug', `[内置图床] 取直链失败，交给后续处理器: ${reason}`)
    return next()
  }
}, {
  name: 'QQBot 分片上传图床',
  /**
   * rank 升序执行，默认 10000。这里排在默认值之后：本处理器给出的是会过期的
   * 临时地址，使用方自建的图床通常是长期地址，应当优先生效。
   */
  rank: 20000,
})
