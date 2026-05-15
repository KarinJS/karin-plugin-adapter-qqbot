import { logger, type LogMethodNames } from 'node-karin'

/**
 * 强制把 debug 日志输出到 mark 级别（确保 karin 默认日志级别下也可见）
 * 启用方式：环境变量 QQBOT_VERBOSE=1 或 QQBOT_DEBUG=1
 */
const VERBOSE =
  process.env.QQBOT_VERBOSE === '1' ||
  process.env.QQBOT_DEBUG === '1'

const PREFIX = '[QQ Official Bot]'

const logMethods = {
  trace: (...args: any[]) => logger.trace(PREFIX, ...args),
  debug: VERBOSE
    ? (...args: any[]) => logger.mark(`${PREFIX}[DEBUG]`, ...args)
    : (...args: any[]) => logger.debug(PREFIX, ...args),
  info: (...args: any[]) => logger.info(PREFIX, ...args),
  warn: (...args: any[]) => logger.warn(PREFIX, ...args),
  error: (...args: any[]) => logger.error(PREFIX, ...args),
  fatal: (...args: any[]) => logger.fatal(PREFIX, ...args),
  mark: (...args: any[]) => logger.mark(PREFIX, ...args),
}

if (VERBOSE) {
  logger.mark(`${PREFIX} 已启用 VERBOSE 调试模式（QQBOT_VERBOSE=1）`)
}

/**
 * QQBot 日志函数，支持两种调用方式：
 * - log('info', '消息')
 * - log.info('消息')
 */
export function log (level: LogMethodNames, ...args: any[]): void {
  logMethods[level](...args)
}

Object.assign(log, logMethods)
