import { logger, type LogMethodNames } from 'node-karin'

/** QQBot日志 - 包装logger以添加前缀 */
const logMethods = {
  trace: (...args: any[]) => logger.trace('[QQ Official Bot]', ...args),
  debug: (...args: any[]) => logger.debug('[QQ Official Bot]', ...args),
  info: (...args: any[]) => logger.info('[QQ Official Bot]', ...args),
  warn: (...args: any[]) => logger.warn('[QQ Official Bot]', ...args),
  error: (...args: any[]) => logger.error('[QQ Official Bot]', ...args),
  fatal: (...args: any[]) => logger.fatal('[QQ Official Bot]', ...args),
  mark: (...args: any[]) => logger.mark('[QQ Official Bot]', ...args),
}

/** 
 * QQBot日志函数
 * 支持两种调用方式：
 * 1. log('info', '消息') - 传入日志级别和参数
 * 2. log.info('消息') - 直接调用方法
 * @param level 日志级别
 * @param args 日志参数
 */
export function log (level: LogMethodNames, ...args: any[]): void {
  logMethods[level](...args)
}

// 添加方法属性以支持两种调用方式
Object.assign(log, logMethods)
