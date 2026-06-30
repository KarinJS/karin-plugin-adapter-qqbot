import os from 'node:os'
import { pkg } from './plugin'

const USER_AGENT_SUFFIX = 'Karin'

/**
 * 构建 QQBot HTTP / WebSocket 使用的 User-Agent。
 */
export const getUserAgent = (): string => {
  const version = String(pkg().version || 'unknown')
  return `QQBotAdapter/${version} (Node/${process.versions.node}; ${os.platform()}; ${USER_AGENT_SUFFIX}/${process.env.KARIN_VERSION || 'unknown'})`
}
