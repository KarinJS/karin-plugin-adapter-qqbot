import { Http } from './http'
import type { AxiosRequestConfig, AxiosResponse } from 'node-karin/axios'
import type { RequestOptions } from './http'

/**
 * 裸请求入口，供下游插件直接调用官方 OpenAPI。
 *
 * {@link Http} 的请求方法是 `protected`，只供各领域 API 子类内部使用；
 * 本类把同一套方法以 `public` 暴露出来，用于官方新接口尚未被适配器封装、
 * 或需要传自定义参数的场景：
 *
 * ```ts
 * const bot = e.bot as AdapterQQBot
 *
 * // GET，query 走 params
 * const menu = await bot.super.request.get('/v2/menu')
 * const list = await bot.super.request.get('/v2/panels', { params: { scope: 'group', limit: 20 } })
 *
 * // POST / PUT / PATCH / DELETE
 * await bot.super.request.post(`/v2/groups/${groupId}/messages`, { content: 'hi', msg_type: 0 })
 * await bot.super.request.put('/v2/menu', { menu })
 *
 * // 任意 method
 * await bot.super.request.request({ method: 'POST', url: '/v2/xxx', data: {} })
 * ```
 *
 * 与直接用 `bot.super.axios` 的区别：
 * - 自动解包 `response.data`；
 * - 失败时抛出的 Error 已带请求路径、脱敏请求体、QQ 错误码中文描述和 TraceID。
 *
 * 需要读响应头或状态码时用 {@link RequestApi.requestRaw}；
 * 需要完全裸的 axios 时用 `bot.super.axios`。
 *
 * 路径相对官方 API baseURL，鉴权头由拦截器自动注入，无需自己传 Authorization。
 */
export class RequestApi extends Http {
  /**
   * GET 请求。
   *
   * @param path 接口路径，相对 baseURL。
   * @param options 可选配置（params / headers / timeout 等）。
   * @returns 响应体。
   */
  public override get<T = unknown> (path: string, options?: RequestOptions): Promise<T> {
    return super.get<T>(path, options)
  }

  /**
   * POST 请求。
   *
   * @param path 接口路径，相对 baseURL。
   * @param body 请求体，默认空对象。
   * @param options 可选配置（params / headers / timeout 等）。
   * @returns 响应体。
   */
  public override post<T = unknown> (
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return super.post<T>(path, body, options)
  }

  /**
   * PUT 请求。
   *
   * @param path 接口路径，相对 baseURL。
   * @param body 请求体，默认空对象。
   * @param options 可选配置（params / headers / timeout 等）。
   * @returns 响应体。
   */
  public override put<T = unknown> (
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return super.put<T>(path, body, options)
  }

  /**
   * PATCH 请求。
   *
   * @param path 接口路径，相对 baseURL。
   * @param body 请求体，默认空对象。
   * @param options 可选配置（params / headers / timeout 等）。
   * @returns 响应体。
   */
  public override patch<T = unknown> (
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return super.patch<T>(path, body, options)
  }

  /**
   * DELETE 请求。
   *
   * @param path 接口路径，相对 baseURL。
   * @param options 可选配置（params / headers / timeout 等）。
   * @returns 响应体。
   */
  public override delete<T = unknown> (path: string, options?: RequestOptions): Promise<T> {
    return super.delete<T>(path, options)
  }

  /**
   * 任意 method 的请求，返回响应体。
   *
   * @param config axios 请求配置，`url` 相对 baseURL。
   * @returns 响应体。
   */
  public override request<T = unknown> (config: AxiosRequestConfig): Promise<T> {
    return super.request<T>(config)
  }

  /**
   * 任意 method 的请求，返回完整 axios 响应。
   *
   * 需要读取响应头或状态码时使用。
   *
   * @param config axios 请求配置，`url` 相对 baseURL。
   * @returns 完整 axios 响应。
   */
  public override requestRaw<T = unknown> (config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return super.requestRaw<T>(config)
  }
}
