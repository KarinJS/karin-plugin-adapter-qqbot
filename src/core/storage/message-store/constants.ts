/** QQ 官方不提供按消息 ID 查询历史消息；本地缓存保留一天。 */
export const MESSAGE_TTL = 1 * 24 * 60 * 60 * 1000

/** 空闲时也定期清理，避免长期运行的机器人积累过期记录。 */
export const CLEANUP_INTERVAL = 10 * 60 * 1000

/** SQLite 后台批量落库间隔。 */
export const FLUSH_INTERVAL = 100

/** 单次事务最多写入的消息数量。 */
export const FLUSH_BATCH_SIZE = 500

/**
 * 待落库队列上限；超过后丢弃最旧的待写缓存，避免反向拖垮消息事件。
 * 队列每项都持有完整消息克隆，上限同时也是内存保护。
 */
export const MAX_WRITE_QUEUE = 10000

/** 媒体本地化后台队列检查间隔。 */
export const MEDIA_LOCALIZE_INTERVAL = 100

/** 媒体本地化最大并发数，避免高频消息把网络和磁盘打满。 */
export const MEDIA_LOCALIZE_CONCURRENCY = 4

/** 媒体本地化待处理队列上限；超过后丢弃最旧任务，原消息仍保留短期 URL。 */
export const MAX_MEDIA_LOCALIZE_QUEUE = 2000

/** 启动时最多补救的远程媒体消息数。 */
export const MEDIA_RECOVERY_LIMIT = 500

/**
 * 消息主表硬上限；超出后从最旧的行开始删除。
 * TTL 只能约束时间维度，硬上限保证刷屏场景下磁盘占用可预期。
 */
export const MAX_MESSAGE_ROWS = 200_000

/** 单个 text/markdown 消息段最大缓存字符数，超出部分截断。 */
export const ELEMENT_TEXT_LIMIT = 4096

/** v2：单表消息 + 整数 hash 索引 + JSON 消息段。 */
export const DATABASE_VERSION = 2
