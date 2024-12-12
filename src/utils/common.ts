import qrcode from 'qrcode'
import { logger } from 'node-karin'
import lodash from 'node-karin/lodash'
import EventEmitter from 'node:events'
import GetUrls from '@karinjs/geturls'

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
