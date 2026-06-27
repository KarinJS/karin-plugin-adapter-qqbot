/** QQ 官方不提供按消息 ID 查询历史消息；本地缓存保留一天。 */
export const MESSAGE_TTL = 1 * 24 * 60 * 60 * 1000

/** 空闲时也定期清理，避免长期运行的机器人积累过期记录。 */
export const CLEANUP_INTERVAL = 10 * 60 * 1000

/** SQLite 后台批量落库间隔。 */
export const FLUSH_INTERVAL = 100

/** 单次事务最多写入的消息数量。 */
export const FLUSH_BATCH_SIZE = 500

/** 待落库队列上限；超过后丢弃最旧的待写缓存，避免反向拖垮消息事件。 */
export const MAX_WRITE_QUEUE = 50000

/** 首个 alpha 发布的数据库基线版本；后续表结构变化从 v2 开始增量迁移。 */
export const DATABASE_VERSION = 1
