import axios, { AxiosError } from 'node-karin/axios'
import lodash from 'node-karin/lodash'
import type { createAxiosInstance } from '@/core/internal/axios'

export type AxiosInstance = ReturnType<typeof createAxiosInstance>

/**
 * 包装 axios 错误为可读多行 message
 */
const formatError = (path: string, options: unknown, err: unknown): Error => {
  if (axios.isAxiosError(err)) {
    return new Error([
      '[axios] 请求失败',
      `请求路径: ${path}`,
      `请求数据: ${lodash.truncate(JSON.stringify(options), { length: 500 })}`,
      `响应数据: ${JSON.stringify((err as AxiosError).response?.data)}`,
    ].join('\n'))
  }
  if (err instanceof Error) return err
  return new Error(typeof err === 'string' ? err : JSON.stringify(err))
}

/**
 * Http 基础类，子模块继承此类共享 axios 实例与错误格式化
 */
export class Http {
  constructor (public readonly axios: AxiosInstance) {}

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
    headers?: Record<string, string>
  ): Promise<T> {
    try {
      const { data } = await this.axios.post(path, body, { headers })
      return data
    } catch (err) {
      throw formatError(path, body, err)
    }
  }

  protected async put<T> (
    path: string,
    body: unknown = {},
    headers?: Record<string, string>
  ): Promise<T> {
    try {
      const { data } = await this.axios.put(path, body, { headers })
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
