import { clearAuth, getAccessToken, getUserId, refreshAccessToken } from './auth'
import type { BotConfig, ConfigResponse, LoginSnapshot, LoginStartResponse, StatusResponse } from './types'

const API_BASE = '/api/v1/qqbot'

/** Karin 统一响应体：HTTP 状态码与 `code` 保持一致。 */
interface ApiEnvelope<T> {
  code?: number
  data?: T
  message?: string
}

const HTTP_STATUS_OK = 200

export class ApiError extends Error {
  readonly status: number
  readonly authExpired: boolean

  constructor(message: string, status: number, authExpired = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.authExpired = authExpired
  }
}

export const request = async <T>(path: string, init: RequestInit = {}, retry = true): Promise<T> => {
  const headers = new Headers(init.headers)
  const token = getAccessToken()
  const userId = getUserId()

  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (userId) headers.set('x-user-id', userId)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('无法连接 Karin 服务，请确认服务正在运行', 0)
  }

  if ((response.status === 401 || response.status === 419) && retry) {
    const refreshed = await refreshAccessToken()
    if (refreshed) return request<T>(path, init, false)

    clearAuth()
    throw new ApiError('登录状态已失效，请重新登录', response.status, true)
  }

  let payload: ApiEnvelope<T> | null = null
  try {
    payload = (await response.json()) as ApiEnvelope<T>
  } catch {
    payload = null
  }

  if (!response.ok || payload?.code !== HTTP_STATUS_OK) {
    throw new ApiError(payload?.message || `请求失败 (${response.status})`, response.status)
  }

  return payload.data as T
}

export const fetchConfig = () => request<ConfigResponse>('/config')

export const saveConfig = (config: BotConfig[]) =>
  request<{ config: BotConfig[] }>('/config', {
    method: 'POST',
    body: JSON.stringify({ config }),
  })

export const fetchStatus = () => request<StatusResponse>('/status')

export const startLogin = () =>
  request<LoginStartResponse>('/login/start', {
    method: 'POST',
    body: '{}',
  })

export const fetchLoginStatus = (taskId: string) =>
  request<LoginSnapshot>(`/login/status?taskId=${encodeURIComponent(taskId)}`, { cache: 'no-store' })

export const cancelLogin = (taskId: string) =>
  request<{ taskId: string; status: string }>('/login/cancel', {
    method: 'POST',
    body: JSON.stringify({ taskId }),
  })
