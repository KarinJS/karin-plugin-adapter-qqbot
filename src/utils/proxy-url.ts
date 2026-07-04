import type { QQBotProxyConfig } from '@/types/config'

const trimTrailingSlashes = (value: string): string => value.trim().replace(/\/+$/, '')

/**
 * HTTP API / token 地址作为请求根地址或完整接口使用，末尾多余 `/` 会导致手动拼接路径时出现 `//`。
 */
export const normalizeHttpUrl = (raw: string): string => trimTrailingSlashes(raw)

/**
 * WebSocket 网关地址：
 * - ws:// / wss:// 原样保留协议
 * - http:// / https:// 映射为 ws:// / wss://
 * - 未写协议时按 wss:// 处理
 * - 末尾统一保留一个 `/`，兼容用户在 WebUI 中填或不填尾斜杠
 */
export const normalizeWsGatewayUrl = (raw: string): string => {
  const value = raw.trim()
  if (!value) return ''

  let normalized = value
  if (/^https?:\/\//i.test(value)) {
    normalized = value.replace(/^http/i, 'ws')
  } else if (!/^wss?:\/\//i.test(value)) {
    normalized = `wss://${value}`
  }

  const parsed = new URL(normalized)
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new Error(`unsupported websocket protocol: ${parsed.protocol}`)
  }

  parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/`
  return parsed.toString()
}

export const normalizeProxyConfig = (proxy: QQBotProxyConfig): QQBotProxyConfig => ({
  prodApi: normalizeHttpUrl(proxy.prodApi),
  sandboxApi: normalizeHttpUrl(proxy.sandboxApi),
  tokenApi: normalizeHttpUrl(proxy.tokenApi),
  prodWs: normalizeWsGatewayUrl(proxy.prodWs),
  sandboxWs: normalizeWsGatewayUrl(proxy.sandboxWs),
})
