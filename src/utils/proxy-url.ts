import type { QQBotProxyConfig } from '@/types/config'

/**
 * HTTP / token 地址只清理首尾空白。完整接口地址是否带尾斜杠可能有路由含义，不能替用户改。
 */
export const normalizeHttpUrl = (raw: string): string => raw.trim()

/**
 * 拼接 OpenAPI 路径时再处理斜杠，避免配置值本身被改写。
 */
export const joinHttpPath = (base: string, path: string): string => {
  const cleanBase = normalizeHttpUrl(base).replace(/\/+$/, '')
  const cleanPath = path.replace(/^\/+/, '')
  return `${cleanBase}/${cleanPath}`
}

/**
 * WebSocket 网关地址：
 * - ws:// / wss:// 原样保留协议
 * - http:// / https:// 映射为 ws:// / wss://
 * - 未写协议时按 wss:// 处理
 *
 * 这里只做最小处理，不改 path / query / hash。自定义网关的尾斜杠和查询参数都可能有路由含义。
 */
export const normalizeWsGatewayUrl = (raw: string): string => {
  const value = raw.trim()
  if (!value) return ''

  let normalized = value
  const scheme = value.match(/^([a-z][a-z\d+.-]*):\/\//i)?.[1]?.toLowerCase()
  if (scheme === 'http' || scheme === 'https') {
    normalized = value.replace(/^http/i, 'ws')
  } else if (scheme && scheme !== 'ws' && scheme !== 'wss') {
    throw new Error(`unsupported websocket protocol: ${scheme}:`)
  } else if (!scheme) {
    normalized = `wss://${value}`
  }

  const parsed = new URL(normalized)
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
    throw new Error(`unsupported websocket protocol: ${parsed.protocol}`)
  }

  return normalized
}

/**
 * 只有从 OpenAPI 根地址推导官方 fallback 网关时，才主动拼 `/websocket/`。
 */
export const buildFallbackWsUrlFromApi = (apiUrl: string): string => {
  const parsed = new URL(normalizeWsGatewayUrl(apiUrl))
  parsed.pathname = `${parsed.pathname.replace(/\/+$/, '')}/websocket/`
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString()
}

export const normalizeProxyConfig = (proxy: QQBotProxyConfig): QQBotProxyConfig => ({
  prodApi: normalizeHttpUrl(proxy.prodApi),
  sandboxApi: normalizeHttpUrl(proxy.sandboxApi),
  tokenApi: normalizeHttpUrl(proxy.tokenApi),
  prodWs: normalizeWsGatewayUrl(proxy.prodWs),
  sandboxWs: normalizeWsGatewayUrl(proxy.sandboxWs),
})
