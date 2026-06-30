import { createSchema, dropSchema, isCurrentSchema } from './schema'
import type { Migration } from './types'

/**
 * 消息缓存数据库迁移入口。
 *
 * 后续改表时只需要在数组末尾追加对象，例如：
 *
 * ```ts
 * {
 *   version: 2,
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
    description: '首个 alpha 发布基线：消息主表、单 value 消息段表和 alias 表',
    up: async ({ run, tableColumns, tableExists, markVacuum }) => {
      if (await isCurrentSchema(tableColumns, tableExists)) return

      await dropSchema(run)
      markVacuum()
      await createSchema(run)
    },
  },
]
