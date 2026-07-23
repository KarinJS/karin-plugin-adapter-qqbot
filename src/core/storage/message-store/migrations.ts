import { createSchema, dropLegacySchema } from './schema'
import type { Migration } from './types'

/**
 * 消息缓存数据库迁移入口。
 *
 * 后续改表时只需要在数组末尾追加对象，例如：
 *
 * ```ts
 * {
 *   version: 3,
 *   description: '给 qqbot_messages 增加 xxx 字段',
 *   up: async ({ run }) => {
 *     await run('ALTER TABLE qqbot_messages ADD COLUMN xxx TEXT')
 *   },
 * }
 * ```
 */
export const migrations: Migration[] = [
  {
    version: 1,
    description: '旧版 6 表基线；已被 v2 整体重建取代，仅保留版本号占位',
    up: async () => {},
  },
  {
    version: 2,
    description: 'v2 重建：单表消息 + 整数 hash 索引 + JSON 消息段，取消 alias 表和外键',
    up: async ({ run, markVacuum }) => {
      await dropLegacySchema(run)
      markVacuum()
      await createSchema(run)
    },
  },
]
