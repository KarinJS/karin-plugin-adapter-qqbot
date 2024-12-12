import { logger } from 'node-karin'
import lodash from 'node-karin/lodash'
import moment from 'node-karin/moment'
import EventEmitter from 'node:events'

/**
 * 生成随机数
 * @param min - 最小值
 * @param max - 最大值
 * @returns
 */
export const random = (min: number, max: number) => lodash.random(min, max)

/**
 * 睡眠函数
 * @param ms - 毫秒
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 使用moment返回时间
 * @param format - 格式
 */
export const time = (format = 'YYYY-MM-DD HH:mm:ss') => moment().format(format)

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
 * 事件总线
 */
export const event = new EventEmitter()
