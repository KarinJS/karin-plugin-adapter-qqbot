import karin from 'node-karin'
import { getMessageStore } from '@/core/storage/message'
import { config as readConfig } from '@/utils/config'

/**
 * 判断是否有任意 QQBot 配置开启消息缓存。
 *
 * @returns true 表示需要注册消息缓存清理任务。
 */
const enabledMessageCache = (): boolean => {
  return readConfig().some(item => item.messageCache.enable)
}

/** 每 10 分钟清理一次过期的 getMsg/getHistoryMsg 本地缓存。 */
export const clearMessageCache = enabledMessageCache()
  ? karin.task('qqbot 适配器消息缓存清理', '*/10 * * * *',
    async () => await getMessageStore().cleanupExpired(),
    { name: 'qqbot 适配器消息缓存清理任务', log: false, type: 'skip' }
  )
  : undefined
