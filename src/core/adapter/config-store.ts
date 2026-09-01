import type { AdapterQQBot } from './base'
import type { QQBotConfig } from '@/types/config'

/**
 * 适配器实例的真实配置存储。
 *
 * 配置挂在 WeakMap 而不是实例字段上：系统接口序列化整个适配器时不会把
 * appSecret 等敏感配置带出去。
 */
const adapterConfigStore = new WeakMap<object, QQBotConfig>()

/**
 * 绑定适配器实例与其配置。
 * @param bot 适配器实例。
 * @param cfg 该实例的 QQBot 配置。
 */
export const setAdapterConfig = (bot: AdapterQQBot, cfg: QQBotConfig): void => {
  adapterConfigStore.set(bot, cfg)
}

/**
 * 读取适配器实例的配置。
 * @param bot 适配器实例。
 * @returns 该实例的 QQBot 配置；未绑定时抛错。
 */
export const getAdapterConfig = (bot: AdapterQQBot): QQBotConfig => {
  const cfg = adapterConfigStore.get(bot)
  if (!cfg) throw new Error('QQBot adapter config missing')
  return cfg
}
