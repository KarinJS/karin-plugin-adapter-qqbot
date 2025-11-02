import { logger, type LogMethodNames } from 'node-karin'

/** QQBot日志 - 包装logger以添加前缀 */
const logMethods = {
  trace: (...args: any[]) => logger.trace('[QQBot]', ...args),
  debug: (...args: any[]) => logger.debug('[QQBot]', ...args),
  info: (...args: any[]) => logger.info('[QQBot]', ...args),
  warn: (...args: any[]) => logger.warn('[QQBot]', ...args),
  error: (...args: any[]) => logger.error('[QQBot]', ...args),
  fatal: (...args: any[]) => logger.fatal('[QQBot]', ...args),
  mark: (...args: any[]) => logger.mark('[QQBot]', ...args),
}

/** 
 * QQBot日志函数
 * @param level 日志级别
 * @param args 日志参数
 */
export function log (level: LogMethodNames, ...args: any[]): void {
  logMethods[level](...args)
}

// 添加方法属性以支持两种调用方式
Object.assign(log, logMethods)
