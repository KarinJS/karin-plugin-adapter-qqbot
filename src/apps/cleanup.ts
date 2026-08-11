import karin from 'node-karin'
import { getMessageStore } from '@/core/storage/message'

/**
 * 每 10 分钟清理一次过期的 getMsg/getHistoryMsg 本地缓存与 file_info 上传缓存。
 *
 * file_info 上传缓存不依赖 messageCache 开关，因此任务始终注册。
 */
export const clearMessageCache = karin.task('qqbot 适配器消息缓存清理', '*/10 * * * *',
  async () => await getMessageStore().cleanupExpired(),
  { name: 'qqbot 适配器消息缓存清理任务', log: false, type: 'skip' }
)
