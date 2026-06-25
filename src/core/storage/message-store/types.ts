import type { Contact, ElementTypes, GroupSender, Sender } from 'node-karin'

export interface CachedMessage {
  messageId: string
  messageSeq: number
  time: number
  contact: Contact
  sender: Sender
  elements: ElementTypes[]
}

export interface IdRow {
  id: number
}

export interface MessageRow {
  message_ref: number
  bot_ref: number
  contact_ref: number
  sender_ref: number
  bot_id: string
  message_id: string
  message_seq: number
  time: number
  scene: Contact['scene']
  peer: string
  sub_peer: string
  contact_name: string
  contact_sub_name: string
  sender_user_id: string
  sender_nick: string
  sender_name: string
  sender_role: GroupSender['role']
}

export interface MessageAliasRow {
  message_ref: number
}

export interface StoredElementRow {
  element_index: number
  element_type: ElementTypes['type']
  value: string
}

export type RunSql = (sql: string, params?: unknown[]) => Promise<void>
export type GetRows = <T>(sql: string, params?: unknown[]) => Promise<T[]>

export interface MigrationContext {
  run: RunSql
  tableColumns: (name: string) => Promise<string[]>
  tableExists: (name: string) => Promise<boolean>
  markVacuum: () => void
}

export interface Migration {
  /** 迁移后的数据库版本号，对应 SQLite `PRAGMA user_version`。 */
  version: number
  /** 迁移说明，便于后续排查生产环境升级路径。 */
  description: string
  /** 该版本需要执行的 SQL 或迁移步骤。 */
  up: (ctx: MigrationContext) => Promise<void>
}
