import qrcode from 'qrcode'
import size from 'image-size'
import lodash from 'node-karin/lodash'
import GetUrls from '@karinjs/geturls'
import { common, logger } from 'node-karin'
import { DATA_URL_BASE64_RE } from '@/core/constants'

/** 睡眠 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** 随机数 */
export const random = (min: number, max: number) => lodash.random(min, max)

/**
 * 伪事件日志（红字）
 */
export const fakeEvent = (log: string) => {
  logger.fatal(`${logger.red('[QQ Official Bot][虚假事件]')} ${log.replace(/\n/g, '\\n')}`)
}

/**
 * 提取文本中的 URL 列表
 * 中文不符合 URL 规范，先替换为 `|` 再扫描
 */
export const handleUrl = (text: string, exclude: string[] = []): string[] => {
  const cleaned = text.replace(/[一-龥]/g, '|')
  return GetUrls.getUrls(cleaned, {
    exclude,
    stripWWW: false,
    normalizeProtocol: false,
    removeQueryParameters: false,
    removeSingleSlash: false,
    sortQueryParameters: false,
    stripAuthentication: false,
    stripTextFragment: false,
    removeTrailingSlash: false,
    normalize: false,
  })
}

/**
 * 生成 URL 二维码，返回 base64:// 前缀
 */
export const qrs = async (urls: string[]) => {
  const list = await Promise.all(urls.map(u => qrcode.toDataURL(u)))
  return list.map(item => `base64://${item.split(',')[1]}`)
}

/**
 * 读取图片宽高
 *
 * @param source 图片来源，支持 URL、本地路径、base64://、完整 data URL 与已在内存中的 Buffer。
 * @returns 图片宽高；解析失败时回落到 100x100。
 */
export const getImageSize = async (
  source: string | Buffer | Uint8Array
): Promise<{ width: number; height: number }> => {
  /** karin 的 common.buffer 不认识带 MIME 头的 data URL，先归一为 base64:// 形式 */
  if (typeof source === 'string' && DATA_URL_BASE64_RE.test(source)) {
    source = source.replace(DATA_URL_BASE64_RE, 'base64://')
  }
  const buffer = await common.buffer(source)
  const { width = 100, height = 100 } = size(buffer)
  return { width, height }
}
