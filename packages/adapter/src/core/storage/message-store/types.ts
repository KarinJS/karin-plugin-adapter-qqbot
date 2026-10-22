import type { Contact, ElementTypes, GroupSender, Sender } from 'node-karin'
import type { MessageCacheLevel } from '@/types/config'

export interface CachedMessage {
  messageId: string
  messageSeq: number
  time: number
  contact: Contact
  sender: Sender
  elements: ElementTypes[]
}

/** 保存消息时的附加标记。 */
export interface SaveOptions {
  /** QQ 客户端引用使用的 `msg_idx`（REFIDX），作为消息的第二查询索引。 */
  refIdx?: string
  /** 是否是机器人自己发送的消息，用于单聊撤回判定。 */
  isSelf?: boolean
  /** 存储分级；缺省按 standard 处理。 */
  level?: MessageCacheLevel
}

/** file_info 上传缓存查询行。 */
export interface UploadCacheRow {
  /** 序列化后的上传响应 JSON。 */
  response: string
  /** 失效时间戳；0 表示长期有效。 */
  expires_at: number
}

export interface IdRow {
  id: number
}

export interface CountRow {
  total: number
}

/** 消息主表 JOIN contacts/senders 后的查询行。 */
export interface MessageRow {
  message_ref: number
  contact_ref: number
  bot_id: string
  msg_id: string
  ref_idx: string | null
  reply_to: string | null
  time: number
  is_self: number
  elements: string
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

export type RunSql = (sql: string, params?: unknown[]) => Promise<void>

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
