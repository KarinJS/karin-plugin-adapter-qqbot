const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_ID_KEY = 'userId'

export const authChangedEvent = 'qqbot-auth-changed'

export interface AuthTokens {
  userId: string
  accessToken: string
  refreshToken: string
}

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) ?? ''
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY) ?? ''
export const getUserId = () => localStorage.getItem(USER_ID_KEY) ?? ''

export const hasAuth = () => Boolean(getAccessToken() && getUserId())

const notifyAuthChanged = () => {
  window.dispatchEvent(new CustomEvent(authChangedEvent))
}

export const setAccessToken = (accessToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  notifyAuthChanged()
}

export const setAuthTokens = (tokens: AuthTokens) => {
  localStorage.setItem(USER_ID_KEY, tokens.userId)
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  notifyAuthChanged()
}

export const clearAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_ID_KEY)
  notifyAuthChanged()
}

const sha256Hex = async (value: string) => {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

interface KarinEnvelope<T> {
  code?: number
  data?: T
  message?: string
  success?: boolean
}

const readEnvelope = async <T>(response: Response): Promise<KarinEnvelope<T> | null> => {
  try {
    return (await response.json()) as KarinEnvelope<T>
  } catch {
    return null
  }
}

/**
 * 使用 Karin 的 HTTP_AUTH_KEY 登录，复用主 WebUI 的 localStorage 凭据。
 */
export const loginWithAuthKey = async (authKey: string) => {
  const authorization = await sha256Hex(authKey)
  const response = await fetch('/api/v1/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorization }),
  })
  const payload = await readEnvelope<AuthTokens>(response)
  const data = payload?.data

  if (!response.ok || !data?.accessToken || !data.userId || !data.refreshToken) {
    throw new Error(payload?.message || '登录失败，请检查 HTTP 鉴权密钥')
  }

  setAuthTokens(data)
}

let refreshPromise: Promise<boolean> | null = null

/**
 * 用 refresh token 静默续期，401 后只重试一次。
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const accessToken = getAccessToken()
    const refreshToken = getRefreshToken()
    if (!accessToken || !refreshToken) return false

    try {
      const response = await fetch('/api/v1/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken }),
      })
      const payload = await readEnvelope<{ accessToken?: string }>(response)
      const nextToken = payload?.data?.accessToken
      if (!response.ok || !nextToken) return false

      setAccessToken(nextToken)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}
