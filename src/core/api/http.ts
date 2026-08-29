import axios, { AxiosError } from 'node-karin/axios'
import lodash from 'node-karin/lodash'
import { formatOpenAPIError } from './error'
import type { AxiosRequestConfig, AxiosResponse } from 'node-karin/axios'
import type { createAxiosInstance } from '@/core/internal/axios'

export type AxiosInstance = ReturnType<typeof createAxiosInstance>

/**
 * 单次请求的可选配置。
 *
 * 这是 axios 请求配置的常用子集；需要完整能力时用
 * {@link Http.request} 或直接使用 `axios` 实例。
 */
export interface RequestOptions {
  /** 追加请求头，会与实例默认头合并 */
  headers?: Record<string, string>
  /** 超时毫秒数，默认取实例配置（5500ms） */
  timeout?: number
  /** query 参数，axios 会自动序列化后拼到 URL */
  params?: Record<string, unknown>
  /** 中断信号 */
  signal?: AbortSignal
  /** 响应类型，下载二进制时可传 `arraybuffer` */
  responseType?: AxiosRequestConfig['responseType']
}

/**
 * 把 {@link RequestOptions} 转为 axios 请求配置。
 *
 * @param options 请求可选配置。
 * @returns axios 请求配置。
 */
const toAxiosConfig = (options?: RequestOptions): AxiosRequestConfig => {
  if (!options) return {}
  const { headers, timeout, params, signal, responseType } = options
  return { headers, timeout, params, signal, responseType }
}

/**
 * 包装 axios 错误为可读多行 message
 * 如果响应中包含 QQ 官方错误码(err_code)，会自动映射为中文描述
 */
const formatError = (path: string, options: unknown, err: unknown): Error => {
  if (axios.isAxiosError(err)) {
    const response = (err as AxiosError).response
    const status = response?.status ?? 0
    const data = response?.data as Record<string, unknown> | undefined

    // 尝试提取 QQ 官方错误码（新版文档字段为 err_code，兼容旧版 code）
    const code = typeof data?.err_code === 'number'
      ? data.err_code
      : typeof data?.code === 'number' ? data.code : undefined
    const msg = typeof data?.message === 'string' ? data.message : undefined
    const traceId = typeof data?.trace_id === 'string' ? data.trace_id : undefined

    const lines: string[] = []
    lines.push('[axios] 请求失败')
    lines.push(`请求路径: ${path}`)
    lines.push(`请求数据: ${lodash.truncate(JSON.stringify(redactRequestData(options)), { length: 500 })}`)
    if (!response) {
      const reason = [err.code, err.message].filter(Boolean).join(' | ')
      if (reason) lines.push(`请求错误: ${reason}`)
    }

    // 使用映射表格式化错误
    if (code !== undefined || status > 0) {
      lines.push(`错误详情: ${formatOpenAPIError(status, code, msg)}`)
    }
    if (traceId) {
      lines.push(`TraceID: ${traceId}`)
    }

    // 原始响应数据兜底
    lines.push(`响应数据: ${JSON.stringify(data)}`)

    return new Error(lines.join('\n'))
  }
  if (err instanceof Error) return err
  return new Error(typeof err === 'string' ? err : JSON.stringify(err))
}

/**
 * 请求失败日志脱敏，避免富媒体 file_data/base64 被完整 stringify。
 * @param value 请求数据。
 * @returns 脱敏后的请求数据。
 */
const redactRequestData = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(item => redactRequestData(item))

  const source = value as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(source)) {
    if (key === 'file_data' && typeof item === 'string') {
      result[key] = `<redacted ${item.length} chars>`
    } else {
      result[key] = redactRequestData(item)
    }
  }
  return result
}

/**
 * Http 基础类，子模块继承此类共享 axios 实例与错误格式化
 *
 * 各请求方法均为 `protected`，只供各领域 API 子类内部使用；
 * 需要给下游插件开放的裸请求入口见 {@link RequestApi}。
 */
export class Http {
  constructor (public readonly axios: AxiosInstance) { }

  protected async get<T> (path: string, options?: RequestOptions): Promise<T> {
    try {
      const { data } = await this.axios.get(path, toAxiosConfig(options))
      return data
    } catch (err) {
      throw formatError(path, undefined, err)
    }
  }

  protected async post<T> (
    path: string,
    body: unknown = {},
    options?: RequestOptions
  ): Promise<T> {
    try {
      const { data } = await this.axios.post(path, body, toAxiosConfig(options))
      return data
    } catch (err) {
      throw formatError(path, body, err)
    }
  }

  protected async put<T> (
    path: string,
    body: unknown = {},
    options?: RequestOptions
  ): Promise<T> {
    try {
      const { data } = await this.axios.put(path, body, toAxiosConfig(options))
      return data
    } catch (err) {
      throw formatError(path, body, err)
    }
  }

  protected async patch<T> (
    path: string,
    body: unknown = {},
    options?: RequestOptions
  ): Promise<T> {
    try {
      const { data } = await this.axios.patch(path, body, toAxiosConfig(options))
      return data
    } catch (err) {
      throw formatError(path, body, err)
    }
  }

  protected async delete<T> (path: string, options?: RequestOptions): Promise<T> {
    try {
      const { data } = await this.axios.delete(path, toAxiosConfig(options))
      return data
    } catch (err) {
      throw formatError(path, undefined, err)
    }
  }

  /**
   * 任意 method 的裸请求，返回响应体。
   *
   * @param config axios 请求配置，`url` 相对 `baseURL`。
   * @returns 响应体 `data`。
   */
  protected async request<T> (config: AxiosRequestConfig): Promise<T> {
    const label = `${String(config.method ?? 'GET').toUpperCase()} ${config.url ?? ''}`
    try {
      const { data } = await this.axios.request<T>(config)
      return data
    } catch (err) {
      throw formatError(label, config.data, err)
    }
  }

  /**
   * 任意 method 的裸请求，返回完整 axios 响应。
   *
   * 需要读取响应头或状态码时使用。
   *
   * @param config axios 请求配置，`url` 相对 `baseURL`。
   * @returns 完整 axios 响应。
   */
  protected async requestRaw<T> (config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const label = `${String(config.method ?? 'GET').toUpperCase()} ${config.url ?? ''}`
    try {
      return await this.axios.request<T>(config)
    } catch (err) {
      throw formatError(label, config.data, err)
    }
  }
}
