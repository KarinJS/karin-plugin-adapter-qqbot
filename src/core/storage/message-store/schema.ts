import type { RunSql } from './types'

const LEGACY_DETAIL_TABLES = [
  'qqbot_element_text',
  'qqbot_element_at',
  'qqbot_element_reply',
  'qqbot_element_face',
  'qqbot_element_media',
  'qqbot_element_markdown',
] as const

/**
 * 判断当前数据库是否已经是 v1 首发基线结构。
 *
 * @param tableColumns 读取指定表字段名的函数。
 * @param tableExists 判断指定表是否存在的函数。
 * @returns true 表示当前表结构可直接使用；false 表示需要重建缓存表。
 */
export const isCurrentSchema = async (
  tableColumns: (name: string) => Promise<string[]>,
  tableExists: (name: string) => Promise<boolean>
): Promise<boolean> => {
  const columns = await tableColumns('qqbot_messages')
  if (!columns.includes('contact_ref')) return false
  if (columns.includes('expires_at')) return false
  const elementColumns = await tableColumns('qqbot_message_elements')
  if (!elementColumns.includes('value')) return false
  if (!(await tableExists('qqbot_bots'))) return false
  if (!(await tableExists('qqbot_contacts'))) return false
  if (!(await tableExists('qqbot_senders'))) return false
  if (!(await tableExists('qqbot_message_elements'))) return false
  if (!(await tableExists('qqbot_message_aliases'))) return false
  return true
}

/**
 * 删除所有开发阶段旧缓存表。
 *
 * @param run SQL 执行函数。
 */
export const dropSchema = async (run: RunSql): Promise<void> => {
  await run('DROP TABLE IF EXISTS qqbot_message_aliases')
  for (const table of LEGACY_DETAIL_TABLES) {
    await run(`DROP TABLE IF EXISTS ${table}`)
  }
  await run('DROP TABLE IF EXISTS qqbot_message_elements')
  await run('DROP TABLE IF EXISTS qqbot_messages')
  await run('DROP TABLE IF EXISTS qqbot_senders')
  await run('DROP TABLE IF EXISTS qqbot_contacts')
  await run('DROP TABLE IF EXISTS qqbot_bots')
  await run('DROP TABLE IF EXISTS qqbot_message_alias')
  await run('DROP TABLE IF EXISTS qqbot_message_cache')
}

/**
 * 创建 v1 首发基线表结构。
 *
 * @param run SQL 执行函数。
 */
export const createSchema = async (run: RunSql): Promise<void> => {
  await run(`CREATE TABLE qqbot_bots (
    id INTEGER PRIMARY KEY,
    bot_id TEXT NOT NULL UNIQUE
  )`)
  await run(`CREATE TABLE qqbot_contacts (
    id INTEGER PRIMARY KEY,
    bot_ref INTEGER NOT NULL,
    scene TEXT NOT NULL,
    peer TEXT NOT NULL,
    sub_peer TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    sub_name TEXT NOT NULL DEFAULT '',
    UNIQUE(bot_ref, scene, peer, sub_peer),
    FOREIGN KEY (bot_ref) REFERENCES qqbot_bots(id) ON DELETE CASCADE
  )`)
  await run(`CREATE TABLE qqbot_senders (
    id INTEGER PRIMARY KEY,
    bot_ref INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    nick TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'member',
    UNIQUE(bot_ref, user_id, nick, name, role),
    FOREIGN KEY (bot_ref) REFERENCES qqbot_bots(id) ON DELETE CASCADE
  )`)
  await run(`CREATE TABLE qqbot_messages (
    id INTEGER PRIMARY KEY,
    bot_ref INTEGER NOT NULL,
    contact_ref INTEGER NOT NULL,
    sender_ref INTEGER NOT NULL,
    message_id TEXT NOT NULL,
    message_seq INTEGER NOT NULL DEFAULT 0,
    time INTEGER NOT NULL,
    UNIQUE(bot_ref, contact_ref, message_id),
    FOREIGN KEY (bot_ref) REFERENCES qqbot_bots(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_ref) REFERENCES qqbot_contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_ref) REFERENCES qqbot_senders(id) ON DELETE RESTRICT
  )`)
  await run(`CREATE TABLE qqbot_message_elements (
    message_ref INTEGER NOT NULL,
    element_index INTEGER NOT NULL,
    element_type TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (message_ref, element_index),
    FOREIGN KEY (message_ref) REFERENCES qqbot_messages(id) ON DELETE CASCADE
  ) WITHOUT ROWID`)
  await run(`CREATE TABLE qqbot_message_aliases (
    bot_ref INTEGER NOT NULL,
    contact_ref INTEGER NOT NULL,
    alias_message_id TEXT NOT NULL,
    message_ref INTEGER NOT NULL,
    PRIMARY KEY (bot_ref, contact_ref, alias_message_id),
    FOREIGN KEY (bot_ref) REFERENCES qqbot_bots(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_ref) REFERENCES qqbot_contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (message_ref) REFERENCES qqbot_messages(id) ON DELETE CASCADE
  ) WITHOUT ROWID`)
  await run('CREATE INDEX idx_qqbot_contacts_lookup ON qqbot_contacts(bot_ref, scene, peer, sub_peer)')
  await run('CREATE INDEX idx_qqbot_messages_lookup ON qqbot_messages(bot_ref, message_id)')
  await run('CREATE INDEX idx_qqbot_messages_time ON qqbot_messages(time)')
  await run('CREATE INDEX idx_qqbot_message_aliases_id ON qqbot_message_aliases(bot_ref, alias_message_id)')
}
