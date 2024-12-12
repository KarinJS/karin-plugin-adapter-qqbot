import axios from 'node-karin/axios'

/** 存储Bot对应的鉴权凭证 */
const BotMap = new Map<string, string>()

/** 获取调用凭证返回类型 */
export interface AccessTokenResponse {
  /** 获取到的凭证 */
  accessToken: string
  /** 凭证有效时间，单位：秒。目前是7200秒之内的值。 */
  expiresIn: number
}

/**
 * @description 获取调用凭证
 * @param url 请求地址
 * @param appId 机器人ID
 * @param secret 机器人密钥
 * @returns 获取到的凭证
 * @throws 获取调用凭证失败
 */
export const getAccessToken = async (url: string, appId: string, secret: string) => {
  const response = await axios.post(url, {
    appId: String(appId),
    clientSecret: secret,
  })

  const { access_token: accessToken, expires_in: expiresIn } = response.data
  if (!accessToken || !expiresIn) {
    throw new Error(`获取调用凭证失败: ${JSON.stringify(response.data)}`)
  }

  BotMap.set(appId, accessToken)

  /** 剩下1分钟开始刷新 */
  setTimeout(() => {
    getAccessToken(url, appId, secret)
  }, Number(expiresIn) * 1000 - 50000)

  return { accessToken, expiresIn }
}

/**
 * @description 创建axios实例
 * @param url 请求地址
 * @param appId 机器人ID
 */
export const createAxiosInstance = (url: string, appId: string) => {
  const instance = axios.create({
    baseURL: url,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 5500,
  })

  instance.interceptors.request.use(
    (config) => {
      config.headers.Authorization = `QQBot ${BotMap.get(appId)}`
      return config
    }
  )

  return instance
}
