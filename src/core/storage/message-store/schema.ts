import type { RunSql } from './types'

/** 开发阶段和 v1 版本遗留的全部缓存表；v2 迁移时统一删除重建。 */
const LEGACY_TABLES = [
  'qqbot_message_aliases',
  'qqbot_element_text',
  'qqbot_element_at',
  'qqbot_element_reply',
  'qqbot_element_face',
  'qqbot_element_media',
  'qqbot_element_markdown',
  'qqbot_message_elements',
  'qqbot_messages',
  'qqbot_senders',
  'qqbot_contacts',
  'qqbot_bots',
  'qqbot_message_alias',
  'qqbot_message_cache',
] as const

/**
 * 删除所有旧版缓存表。
 *
 * 消息缓存只有一天 TTL，跨大版本不迁移数据，直接重建。
 *
 * @param run SQL 执行函数。
 */
export const dropLegacySchema = async (run: RunSql): Promise<void> => {
  for (const table of LEGACY_TABLES) {
    await run(`DROP TABLE IF EXISTS ${table}`)
  }
}

/**
 * 创建 v2 表结构。
 *
 * 设计要点（相对 v1 的 6 表规范化）：
 * - 一条消息一行：消息段收进单个 JSON 列，消灭消息段表的行开销、
 *   delete+reinsert 双写和读取时的 N+1 查询；
 * - alias 表取消：实践中一条消息最多只有一个 `msg_idx` 引用索引，
 *   直接作为 `ref_idx` 列存储；
 * - 长 ID 不建 TEXT 索引：`msg_id`/`ref_idx` 原文只存一份，索引建在
 *   53 位整数 hash 列上，命中后比对原文防碰撞；
 * - 不声明外键：无级联删除扫描；senders 由清理任务定期 GC；
 * - 不为 `time` 单独建索引：清理是每 10 分钟一次的后台全表扫描，
 *   省下的索引空间比扫描成本更值。
 *
 * @param run SQL 执行函数。
 */
export const createSchema = async (run: RunSql): Promise<void> => {
  await run(`CREATE TABLE qqbot_contacts (
    id INTEGER PRIMARY KEY,
    bot_id TEXT NOT NULL,
    scene TEXT NOT NULL,
    peer TEXT NOT NULL,
    sub_peer TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    sub_name TEXT NOT NULL DEFAULT '',
    UNIQUE(bot_id, scene, peer, sub_peer)
  )`)
  await run(`CREATE TABLE qqbot_senders (
    id INTEGER PRIMARY KEY,
    bot_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    nick TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'member',
    UNIQUE(bot_id, user_id, nick, name, role)
  )`)
  await run(`CREATE TABLE qqbot_messages (
    id INTEGER PRIMARY KEY,
    contact_ref INTEGER NOT NULL,
    sender_ref INTEGER NOT NULL,
    msg_id TEXT NOT NULL,
    msg_id_hash INTEGER NOT NULL,
    ref_idx TEXT,
    ref_idx_hash INTEGER,
    reply_to TEXT,
    time INTEGER NOT NULL,
    is_self INTEGER NOT NULL DEFAULT 0,
    is_ref_context INTEGER NOT NULL DEFAULT 0,
    has_remote_media INTEGER NOT NULL DEFAULT 0,
    elements TEXT NOT NULL
  )`)
  await run('CREATE INDEX idx_qqbot_messages_msg_hash ON qqbot_messages(msg_id_hash)')
  await run(`CREATE INDEX idx_qqbot_messages_ref_hash ON qqbot_messages(ref_idx_hash)
    WHERE ref_idx_hash IS NOT NULL`)
  await run('CREATE INDEX idx_qqbot_messages_history ON qqbot_messages(contact_ref, time)')
  await run(`CREATE INDEX idx_qqbot_messages_remote ON qqbot_messages(has_remote_media)
    WHERE has_remote_media = 1`)
}
