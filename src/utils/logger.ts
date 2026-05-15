import { logger, type LogMethodNames } from 'node-karin'

const PREFIX = '[QQ Official Bot]'

const m = {
  trace: (...a: any[]) => logger.trace(PREFIX, ...a),
  debug: (...a: any[]) => logger.debug(PREFIX, ...a),
  info: (...a: any[]) => logger.info(PREFIX, ...a),
  warn: (...a: any[]) => logger.warn(PREFIX, ...a),
  error: (...a: any[]) => logger.error(PREFIX, ...a),
  fatal: (...a: any[]) => logger.fatal(PREFIX, ...a),
  mark: (...a: any[]) => logger.mark(PREFIX, ...a),
}

/**
 * QQBot 日志函数
 * - log('info', '消息')
 * - log.info('消息')
 *
 * 日志级别由 karin 框架的 log.level 控制
 */
export function log (level: LogMethodNames, ...args: any[]): void {
  m[level](...args)
}

Object.assign(log, m)
