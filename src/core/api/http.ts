import axios, { AxiosError } from 'node-karin/axios'
import lodash from 'node-karin/lodash'
import { formatOpenAPIError } from './error'
import type { createAxiosInstance } from '@/core/internal/axios'

export type AxiosInstance = ReturnType<typeof createAxiosInstance>

/**
 * 包装 axios 错误为可读多行 message
 * 如果响应中包含 QQ 官方错误码(code)，会自动映射为中文描述
 */
const formatError = (path: string, options: unknown, err: unknown): Error => {
  if (axios.isAxiosError(err)) {
    const response = (err as AxiosError).response
    const status = response?.status ?? 0
    const data = response?.data as Record<string, unknown> | undefined

    // 尝试提取 QQ 官方错误码
    const code = typeof data?.code === 'number' ? data.code : undefined
    const msg = typeof data?.message === 'string' ? data.message : undefined

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
 */
export class Http {
  constructor (public readonly axios: AxiosInstance) { }

  protected async get<T> (path: string): Promise<T> {
    try {
      const { data } = await this.axios.get(path)
      return data
    } catch (err) {
      throw formatError(path, undefined, err)
    }
  }

  protected async post<T> (
    path: string,
    body: unknown = {},
    headers?: Record<string, string>,
    timeout?: number
  ): Promise<T> {
    try {
      const { data } = await this.axios.post(path, body, { headers, timeout })
      return data
    } catch (err) {
      throw formatError(path, body, err)
    }
  }

  protected async put<T> (
    path: string,
    body: unknown = {},
    headers?: Record<string, string>,
    timeout?: number
  ): Promise<T> {
    try {
      const { data } = await this.axios.put(path, body, { headers, timeout })
      return data
    } catch (err) {
      throw formatError(path, body, err)
    }
  }

  protected async delete<T> (path: string): Promise<T> {
    try {
      const { data } = await this.axios.delete(path)
      return data
    } catch (err) {
      throw formatError(path, undefined, err)
    }
  }
}
