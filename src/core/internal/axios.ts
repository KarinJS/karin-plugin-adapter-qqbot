import axios from 'node-karin/axios'
import { log } from '@/utils/logger'

/**
 * 每个 appId 一份 token 状态
 */
interface TokenState {
  accessToken: string
  /** 刷新定时器，销毁 bot 时需要清理 */
  refreshTimer?: NodeJS.Timeout
}

const tokens = new Map<string, TokenState>()

/** access_token 接口返回 */
interface AccessTokenResponse {
  access_token: string
  expires_in: number | string
}

/**
 * 拉取 access_token 并安排下一次刷新
 * - 提前 50s 刷新，防止边界过期
 * - 同一 appId 旧定时器会被清理，避免并发刷新链
 */
export const getAccessToken = async (
  url: string,
  appId: string,
  secret: string
): Promise<{ accessToken: string; expiresIn: number }> => {
  let res
  try {
    res = await axios.post<AccessTokenResponse>(url, {
      appId: String(appId),
      clientSecret: secret,
    })
  } catch (err) {
    log('error', `[${appId}] 获取 access_token 失败:`, err)
    throw err
  }

  const accessToken = res.data?.access_token
  const expiresIn = Number(res.data?.expires_in)
  if (!accessToken || !expiresIn || Number.isNaN(expiresIn)) {
    throw new Error(`获取 access_token 失败: ${JSON.stringify(res.data)}`)
  }

  // 取出旧 state 清理定时器
  const prev = tokens.get(appId)
  if (prev?.refreshTimer) clearTimeout(prev.refreshTimer)

  const state: TokenState = { accessToken }
  tokens.set(appId, state)

  // 提前 50s 刷新，避免边界过期
  const delay = Math.max(5_000, expiresIn * 1000 - 50_000)
  state.refreshTimer = setTimeout(() => {
    getAccessToken(url, appId, secret).catch(() => { /* 错误已记录 */ })
  }, delay)

  return { accessToken, expiresIn }
}

/**
 * 读取已缓存的 access_token
 */
export const getBotAccessToken = (appId: string): string | undefined => {
  return tokens.get(appId)?.accessToken
}

/**
 * 停止某个 bot 的 token 刷新（销毁 bot 时调用）
 */
export const stopTokenRefresh = (appId: string): void => {
  const state = tokens.get(appId)
  if (!state) return
  if (state.refreshTimer) clearTimeout(state.refreshTimer)
  tokens.delete(appId)
}

/**
 * 创建 axios 实例，自动从 tokens map 取最新 access_token
 */
export const createAxiosInstance = (baseURL: string, appId: string) => {
  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 5500,
  })
  instance.interceptors.request.use(config => {
    const token = tokens.get(appId)?.accessToken
    if (token) config.headers.Authorization = `QQBot ${token}`
    return config
  })
  return instance
}
