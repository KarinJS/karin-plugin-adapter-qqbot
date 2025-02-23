import fs from 'node:fs'
import qrcode from 'qrcode'
import size from 'image-size'
import lodash from 'node-karin/lodash'
import EventEmitter from 'node:events'
import GetUrls from '@karinjs/geturls'
import { encode, isSilk } from 'silk-wasm'
import { ButtonElement, common, ffmpeg, logger, segment, tempPath } from 'node-karin'

/**
 * 事件总线
 */
export const event = new EventEmitter()

/**
 * 睡眠函数
 * @param ms - 毫秒
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 生成随机数
 * @param min - 最小值
 * @param max - 最大值
 */
export const random = (min: number, max: number) => lodash.random(min, max)

/**
 * 调整express中间件和路由的顺序，将路由提升到中间件前面
 * @param stack - express实例的stack
 * @param path - 路由名称
 * @param method - 请求方法
 * @param middlewareName - 中间件名称
 */
export const expressStack = (
  stack: any[],
  path: string,
  method: 'use' | 'get' | 'post' | 'put' | 'delete',
  middlewareName: string
) => {
  const routeIndex = stack.findIndex((layer: any) => layer.route?.path === path && layer.route?.methods?.[method])
  const middlewareIndex = stack.findIndex((layer: any) => layer.name === middlewareName)

  if (routeIndex !== -1 && middlewareIndex !== -1 && routeIndex > middlewareIndex) {
    const [route] = stack.splice(routeIndex, 1)
    stack.splice(middlewareIndex, 0, route)
  }
}

/**
 * 调整express路由的顺序 使其在`expressInit`之后
 * @param stack - express实例的stack
 * @param path - 路由名称
 * @param method - 请求方法
 */
export const expressAfterInit = (
  stack: any[],
  path: string,
  method: 'use' | 'get' | 'post' | 'put' | 'delete'
) => {
  const routeIndex = stack.findIndex((layer: any) => layer.route?.path === path && layer.route?.methods?.[method])
  const initIndex = stack.findIndex((layer: any) => layer.name === 'expressInit')

  if (routeIndex !== -1 && initIndex !== -1 && (initIndex + 1) < routeIndex) {
    const [route] = stack.splice(routeIndex, 1)
    stack.splice(initIndex + 1, 0, route)
  }
}

/**
 * 虚假事件
 * @param log 日志
 */
export const fakeEvent = (log: string) => {
  logger.fatal(`${logger.red('[QQBot][虚假事件]')} ${log.replace(/\n/g, '\\n')}`)
}

/**
 * 处理url
 * @param text - 文本
 * @param exclude - 排除的URL
 * @returns url列表
 */
export const handleUrl = (text: string, exclude: string[] = []): string[] => {
  /** 中文不符合url规范 */
  text = text.replace(/[\u4e00-\u9fa5]/g, '|')
  const urls = GetUrls.getUrls(text, {
    exclude,
    /** 去除 WWW */
    stripWWW: false,
    /** 规范化协议 */
    normalizeProtocol: false,
    /** 移除查询参数 */
    removeQueryParameters: false,
    /** 移除唯一斜杠 */
    removeSingleSlash: false,
    /** 查询参数排序 */
    sortQueryParameters: false,
    /** 去除认证信息 */
    stripAuthentication: false,
    /** 去除文本片段 */
    stripTextFragment: false,
    /** 移除末尾斜杠 */
    removeTrailingSlash: false,
    /** 不进行标准处理url */
    normalize: false,
  })

  return urls
}

/**
 * 生成二维码
 * @param urls - url列表
 * @returns 返回带`base64://`前缀的二维码列表
 */
export const qrs = async (urls: string[]) => {
  const list = await Promise.all(urls.map((url) => qrcode.toDataURL(url)))
  return list.map((item) => `base64://${item.split(',')[1]}`)
}

/**
 * 语音文件转silk
 * @param file 文件路径 base64 buffer
 * @returns silk文件buffer
 */
export const silkEncode = async (file: string | Buffer): Promise<Buffer> => {
  const buffer = await common.buffer(file)
  if (isSilk(buffer)) return buffer

  const start = Date.now()
  const root = `${tempPath}/recordToSilk`
  const temp = `${root}/${start}`
  const src = `${temp}/${start}`
  const pcm = `${temp}/${start}.pcm`
  // const silk = `${temp}/${start}.silk`

  fs.mkdirSync(temp, { recursive: true })
  fs.writeFileSync(src, buffer)

  const { status, error } = await ffmpeg(` -i ${src} -f s16le -ar 48000 -ac 1 ${pcm}`)
  if (!status) throw error

  const pamBuffer = await fs.promises.readFile(pcm)
  const { data, duration } = await encode(pamBuffer, 48000)
  setTimeout(() => {
    // TODO: 缓存silk文件 提升性能
    const ms = logger.yellow(duration + 'ms')
    const end = logger.yellow((Date.now() - start) + 'ms')
    logger.info(`[QQBot] silk文件转码成功 音频时长: ${ms} 转码耗时: ${end}`)
    fs.rmSync(temp, { recursive: true, force: true })
  }, 100)
  return Buffer.from(data)
}

/**
 * 处理文本 提取其中的url转为按钮
 * @param text - 文本
 * @param isC2C - 是否为C2C消息
 */
export const textToButton = (text: string, isC2C = false): {
  text: string,
  buttons: ButtonElement[]
} => {
  text = text.replace(/@everyone/g, 'everyone').replace(/\n/g, '\r')
  if (isC2C) text = text.replace(/<qqbot-at-user id=".+" \/>/gm, '').replace(/<@.+>/gm, '')
  const urls = handleUrl(text)
  if (urls.length === 0) {
    return { text, buttons: [] }
  }

  const buttons: ButtonElement[] = []
  urls.forEach((url, index) => {
    text = text.replace(new RegExp(url, 'g'), `[请点击 按钮${index} 查看]`)
    buttons.push(segment.button({ text: `${index}. ${url}`, link: url }))
  })

  // 最多只有5个长度
  return { text, buttons: buttons.length > 5 ? buttons.slice(0, 5) : buttons }
}

/**
 * 传入一个图片链接，获取图片的宽高
 * @param url - 图片链接
 * @returns 图片的宽高
 */
export const getImageSize = async (url: string): Promise<{ width: number, height: number }> => {
  const buffer = await common.buffer(url)
  const { width = 100, height = 100 } = size(buffer)
  return { width, height }
}

/**
 * 处理模板文本，对不能直接发送的 Markdown 语法进行转义
 * @param text - 文本
 * @returns 转义后的文本
 */
export const escapeMarkdown = (text: string): string => {
  /**
   * @example
   * ```md
   * # 标题
   * **加粗**
   * __下划线加粗__
   * _斜体_
   * *星号斜体*
   * ***加粗斜体***
   * ~~删除线~~
   * ```
   */

  // 转义标题(仅行首的 #)
  text = text.replace(/^(\s*)#(?!#)/gm, '$1\r#')

  // 转义加粗斜体(排除已经转义的情况)
  text = text.replace(/(?<!\\)\*\*\*(.+?)(?<!\\)\*\*\*/g, '\\*\\*\\*$1\\*\\*\\*')

  // 转义加粗(星号加粗，排除已转义)
  text = text.replace(/(?<!\\)\*\*(.+?)(?<!\\)\*\*/g, '\\*\\*$1\\*\\*')

  // 转义下划线加粗(排除已转义)
  text = text.replace(/(?<!\\)__(.+?)(?<!\\)__/g, '\\__\\__$1\\__\\__')

  // 转义斜体(星号斜体，排除已转义)
  text = text.replace(/(?<!\\)\*(.+?)(?<!\\)\*/g, '\\*$1\\*')

  // 转义斜体(下划线斜体，排除已转义)
  text = text.replace(/(?<!\\)_(.+?)(?<!\\)_/g, '\\_$1\\_')

  // 转义删除线(排除已转义)
  text = text.replace(/(?<!\\)~~(.+?)(?<!\\)~~/g, '\\~\\~$1\\~\\~')

  // 转义其他特殊字符 这里先不管。
  // text = text.replace(/(?<!\\)([\\`*_{}\[\]()#+\-.!])/g, '\\$1')

  return text
}
