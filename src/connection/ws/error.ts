/**
 * WebSocket 错误码映射表
 * 来源: api-v2/dev-prepare/error-trace/websocket.md
 *
 * 规则:
 * - 4001~4014 为协议级错误码
 * - 4900~4913 为内部错误区间
 * - 4914~4915 为机器人状态错误
 */

export interface WSErrorInfo {
  /** 中文含义 */
  message: string
  /** 是否可以重试 RESUME */
  canResume: boolean
  /** 是否可以重试 IDENTIFY */
  canIdentify: boolean
}

/** WebSocket 错误码精确映射 */
export const wsErrorMap: Record<number, WSErrorInfo> = {
  4001: { message: '无效的 opcode', canResume: false, canIdentify: false },
  4002: { message: '无效的 payload', canResume: false, canIdentify: false },
  4007: { message: 'seq 错误', canResume: false, canIdentify: true },
  4006: { message: '无效的 session id，无法继续 resume，请 identify', canResume: false, canIdentify: true },
  4008: { message: '发送 payload 过快，请重新连接，并遵守连接后返回的频控信息', canResume: true, canIdentify: true },
  4009: { message: '连接过期，请重连并执行 resume 进行重新连接', canResume: true, canIdentify: true },
  4010: { message: '无效的 shard', canResume: false, canIdentify: false },
  4011: { message: '连接需要处理的 guild 过多，请进行合理的分片', canResume: false, canIdentify: false },
  4012: { message: '无效的 version', canResume: false, canIdentify: false },
  4013: { message: '无效的 intent', canResume: false, canIdentify: false },
  4014: { message: 'intent 无权限', canResume: false, canIdentify: false },
  4914: { message: '机器人已下架，只允许连接沙箱环境，请断开连接，检验当前连接环境', canResume: false, canIdentify: false },
  4915: { message: '机器人已封禁，不允许连接，请断开连接，申请解封后再连接', canResume: false, canIdentify: false },
}

/**
 * 获取 WebSocket 错误码信息
 * @param code - WebSocket close code
 * @returns 错误信息，未找到则返回 undefined
 */
export const getWSErrorInfo = (code: number): WSErrorInfo | undefined => {
  // 精确匹配
  const exact = wsErrorMap[code]
  if (exact) return exact

  // 4900~4913 内部错误区间
  if (code >= 4900 && code <= 4913) {
    return { message: '内部错误，请重连', canResume: false, canIdentify: true }
  }

  return undefined
}

/**
 * 格式化 WebSocket 关闭信息为可读字符串
 * @param code - WebSocket close code
 * @param reason - 关闭原因（二进制 payload）
 * @returns 格式化后的错误字符串
 */
export const formatWSClose = (code: number, reason?: string): string => {
  const info = getWSErrorInfo(code)
  const parts: string[] = []

  if (info) {
    parts.push(`[${code}] ${info.message}`)
    if (info.canResume && info.canIdentify) {
      parts.push('建议: 可尝试 Resume 或重新 Identify')
    } else if (info.canResume) {
      parts.push('建议: 可尝试 Resume')
    } else if (info.canIdentify) {
      parts.push('建议: 可尝试重新 Identify')
    } else {
      parts.push('建议: 不可重试，请检查配置或联系官方')
    }
  } else {
    parts.push(`[${code}] 未知错误码`)
    // 标准 WebSocket 关闭码
    if (code === 1000) parts.push('正常关闭')
    else if (code === 1001) parts.push('终端离开')
    else if (code === 1006) parts.push('异常关闭（连接异常断开）')
    else if (code === 1011) parts.push('服务器遇到异常')
  }

  if (reason) {
    parts.push(`reason: ${reason}`)
  }

  return parts.join(' | ')
}
