import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import sqlite3, { type Database } from 'node-karin/sqlite3'
import { karinPathBase } from 'node-karin'
import { log } from '@/utils/logger'
import {
  CLEANUP_INTERVAL, DATABASE_VERSION, FLUSH_BATCH_SIZE, FLUSH_INTERVAL,
  MAX_WRITE_QUEUE, MESSAGE_TTL,
} from './constants'
import { loadElements, saveElement } from './elements'
import { migrations } from './migrations'
import { SQL } from './sql'
import type { Contact, GroupSender, MessageResponse, Sender } from 'node-karin'
import type { CachedMessage, IdRow, MessageAliasRow, MessageRow } from './types'

interface PendingWrite {
  botId: string
  message: CachedMessage
  aliases: string[]
  referenceOnly: boolean
}

/**
 * QQBot 收到的消息缓存。
 *
 * 热路径只写内存并入队，不等待 SQLite：
 * - `getMsg` 优先查内存，插件在同一事件回调内可立即命中；
 * - SQLite 在后台按批次事务落库，避免一条消息一个事务拖慢事件分发；
 * - 元素表只保存 `type + value`，避免宽表 NULL 和多详情表多次 INSERT。
 */
export class MessageStore {
  private db?: Database
  private readonly ready: Promise<void>
  private lastCleanup = 0
  private shouldVacuum = false
  private flushTimer?: NodeJS.Timeout
  private flushing = false

  private readonly pending: PendingWrite[] = []
  private readonly memory = new Map<string, CachedMessage>()
  private readonly directIndex = new Map<string, string>()
  private readonly aliasIndex = new Map<string, string>()
  private readonly scopedAliasIndex = new Map<string, string>()
  private readonly botRefCache = new Map<string, number>()
  private readonly contactRefCache = new Map<string, number>()
  private readonly senderRefCache = new Map<string, number>()

  constructor () {
    this.ready = this.initialize()
  }

  /**
   * 保存实际消息，并为 QQ 的 `msg_idx` 等引用索引建立轻量映射。
   *
   * 该方法只同步写入内存并投递后台队列，不等待 SQLite。这样消息事件创建不会被
   * 数据库写锁或小事务阻塞。
   *
   * @param botId 当前 QQBot appId。
   * @param message 已转换为 Karin elements 的消息缓存。
   * @param aliases 可查询到该消息的额外消息索引，例如 QQ `msg_idx`。
   */
  async save (botId: string, message: CachedMessage, aliases: string[] = []): Promise<void> {
    if (!message.messageId) return
    this.cleanupMemoryIfDue()

    const cached = this.cloneMessage(message)
    this.putMemory(botId, cached, aliases)
    this.enqueue({ botId, message: cached, aliases, referenceOnly: false })
  }

  /**
   * 仅当内存中没有该引用索引时保存 QQ 下发的引用上下文。
   * 数据库是否已存在由后台 flush 再判断，避免阻塞事件热路径。
   *
   * @param botId 当前 QQBot appId。
   * @param message 以 `ref_msg_idx` 作为 messageId 的引用上下文。
   */
  async saveReferenceIfAbsent (botId: string, message: CachedMessage): Promise<void> {
    if (!message.messageId) return
    this.cleanupMemoryIfDue()
    if (this.getFromMemory(botId, message.messageId, message.contact)) return

    const cached = this.cloneMessage(message)
    this.putMemory(botId, cached)
    this.enqueue({ botId, message: cached, aliases: [], referenceOnly: true })
  }

  /**
   * 读取缓存消息。
   *
   * OneBot v11 标准调用只传 messageId；contact 参数仅用于额外限定范围。
   *
   * @param botId 当前 QQBot appId。
   * @param messageId 真实消息 ID 或 QQ `REFIDX` 引用索引。
   * @param contact 可选会话范围，传入后只在该会话下查询。
   * @returns 命中的消息缓存；未命中或已过期时返回 null。
   */
  async get (botId: string, messageId: string, contact?: Contact): Promise<MessageResponse | null> {
    if (!messageId) return null

    const memory = this.getFromMemory(botId, messageId, contact)
    if (memory) return this.toResponse(memory)

    await this.ready
    await this.cleanupIfDue()

    const key = contact ? this.contactKey(botId, contact, messageId) : [botId, messageId]
    const direct = await this.getRow<MessageRow>(contact ? SQL.selectMessage : SQL.selectMessageById, key)
    const alias = direct
      ? undefined
      : await this.getRow<MessageAliasRow>(contact ? SQL.selectAlias : SQL.selectAliasById, key)
    if (!direct && !alias) return null

    const row = direct || await this.getRow<MessageRow>(SQL.selectMessageByRef, [alias!.message_ref])
    if (!row) return null

    if (!direct && await this.hasReplyTo(row.message_ref, messageId)) {
      /** 拒绝旧缓存中错误指向当前引用消息的别名。 */
      await this.deleteAlias(botId, this.contactFromRow(row), messageId)
      return null
    }
    if (this.isExpired(row)) {
      await this.cleanup()
      return null
    }

    return this.rowToResponse(row)
  }

  /**
   * 按起始消息 ID 读取同一会话内的历史缓存消息。
   *
   * QQ 官方 Bot 没有 seq 历史查询能力；这里以本地缓存中命中的起始消息为锚点，
   * 按时间倒序返回最近的 `count` 条消息，包含起始消息本身。
   *
   * @param botId 当前 QQBot appId。
   * @param contact 查询限定的会话。
   * @param startMsgId 起始消息 ID 或 QQ `REFIDX` 引用索引。
   * @param count 获取消息数量。
   * @returns 命中的历史消息数组；未命中或已过期时返回空数组。
   */
  async getHistory (
    botId: string,
    contact: Contact,
    startMsgId: string,
    count: number
  ): Promise<MessageResponse[]> {
    const limit = Math.trunc(count || 1)
    if (!startMsgId || limit <= 0) return []

    await this.ready
    await this.cleanupIfDue()
    await this.flushQueue()

    const anchor = await this.resolveMessageRow(botId, contact, startMsgId)
    if (!anchor) return []
    if (this.isExpired(anchor)) {
      await this.cleanup()
      return []
    }

    const rows = await this.getRows<MessageRow>(SQL.selectHistory, [
      botId,
      contact.scene,
      contact.peer,
      contact.subPeer || '',
      anchor.time,
      anchor.time,
      anchor.message_ref,
      limit,
    ])

    return Promise.all(rows.map(row => this.rowToResponse(row)))
  }

  /**
   * 初始化 SQLite 连接、表结构和定时清理任务。
   *
   * @returns 初始化完成 Promise。
   */
  private async initialize (): Promise<void> {
    const file = join(karinPathBase, '@karinjs-adapter-qqbot', 'data', 'message-cache.db')
    await mkdir(dirname(file), { recursive: true })
    this.db = await new Promise<Database>((resolve, reject) => {
      const db = new sqlite3.Database(file, (err) => err ? reject(err) : resolve(db))
    })

    await this.run('PRAGMA foreign_keys = ON')
    await this.run('PRAGMA journal_mode = WAL')
    await this.run('PRAGMA synchronous = NORMAL')
    await this.run('PRAGMA temp_store = MEMORY')
    await this.run('PRAGMA busy_timeout = 5000')
    await this.migrate()
    await this.cleanup()

    const timer = setInterval(() => {
      this.cleanup().catch(err => log('warn', '[getMsg] 清理消息缓存失败', err))
    }, CLEANUP_INTERVAL)
    timer.unref()
  }

  /**
   * 投递待落库消息。
   *
   * @param item 待写入 SQLite 的缓存任务。
   */
  private enqueue (item: PendingWrite): void {
    this.pending.push(item)
    if (this.pending.length > MAX_WRITE_QUEUE) {
      this.prunePending()
      if (this.pending.length > MAX_WRITE_QUEUE) {
        const dropped = this.pending.splice(0, this.pending.length - MAX_WRITE_QUEUE)
        log('warn', `[getMsg] SQLite 写入队列过长，已丢弃 ${dropped.length} 条最旧待写缓存`)
      }
    }
    this.scheduleFlush()
  }

  /**
   * 安排一次后台批量落库。
   *
   * 已有 timer 或正在 flush 时不会重复安排。
   */
  private scheduleFlush (): void {
    if (this.flushTimer || this.flushing) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined
      this.flushQueue().catch(err => log('warn', '[getMsg] 批量写入消息缓存失败', err))
    }, FLUSH_INTERVAL)
    this.flushTimer.unref()
  }

  /**
   * 批量落库队列中的消息。
   *
   * 单次最多处理 `FLUSH_BATCH_SIZE` 条，并在一个事务内完成写入。
   *
   * @returns flush 完成 Promise。
   */
  private async flushQueue (): Promise<void> {
    if (this.flushing) return
    this.flushing = true
    try {
      await this.ready
      const batch = this.pending.splice(0, FLUSH_BATCH_SIZE)
      if (!batch.length) return

      await this.transaction(async () => {
        for (const item of batch) {
          if (this.isExpired(item.message)) continue
          await this.writeItem(item)
        }
      })

      if (this.pending.length) this.scheduleFlush()
    } finally {
      this.flushing = false
      if (this.pending.length) this.scheduleFlush()
    }
  }

  /**
   * 写入一条待落库消息。
   *
   * @param item 待写入的消息、alias 和引用上下文标记。
   */
  private async writeItem (item: PendingWrite): Promise<void> {
    const botRef = await this.ensureBot(item.botId)
    const contactRef = await this.ensureContact(botRef, item.message.contact)

    if (item.referenceOnly) {
      const exists = await this.getRow<IdRow>(SQL.selectMessageRef, [botRef, contactRef, item.message.messageId])
      if (exists) return

      const alias = await this.getRow<MessageAliasRow>(
        SQL.selectAlias,
        this.contactKey(item.botId, item.message.contact, item.message.messageId)
      )
      /** 原消息已通过 msg_idx alias 缓存时，不再把引用上下文另存为一条消息。 */
      if (alias) return
    }

    const senderRef = await this.ensureSender(botRef, item.message.sender)
    const messageRef = await this.ensureMessage(botRef, contactRef, senderRef, item.message)

    await this.run(SQL.deleteElements, [messageRef])
    for (const [index, element] of item.message.elements.entries()) {
      await saveElement((sql, params) => this.run(sql, params), messageRef, index, element)
    }

    for (const alias of new Set(item.aliases.filter(id => id && id !== item.message.messageId))) {
      await this.run(SQL.insertAlias, [botRef, contactRef, alias, messageRef])
    }
  }

  /**
   * 清理待写队列中已经过期的消息。
   */
  private prunePending (): void {
    const deadline = Date.now() - MESSAGE_TTL
    for (let index = this.pending.length - 1; index >= 0; index--) {
      if (this.pending[index].message.time <= deadline) this.pending.splice(index, 1)
    }
  }

  /**
   * 写入内存热缓存。
   *
   * @param botId 当前 QQBot appId。
   * @param message 消息缓存。
   * @param aliases 可查询到该消息的额外消息索引。
   */
  private putMemory (botId: string, message: CachedMessage, aliases: string[] = []): void {
    const scoped = this.scopedKey(botId, message.contact, message.messageId)
    this.memory.set(scoped, message)
    this.directIndex.set(this.globalKey(botId, message.messageId), scoped)

    for (const alias of new Set(aliases.filter(id => id && id !== message.messageId))) {
      this.scopedAliasIndex.set(this.scopedKey(botId, message.contact, alias), scoped)
      this.aliasIndex.set(this.globalKey(botId, alias), scoped)
    }
  }

  /**
   * 从内存热缓存读取消息。
   *
   * @param botId 当前 QQBot appId。
   * @param messageId 真实消息 ID 或 alias。
   * @param contact 可选会话范围。
   * @returns 命中的缓存消息；未命中或过期时返回 null。
   */
  private getFromMemory (botId: string, messageId: string, contact?: Contact): CachedMessage | null {
    const scoped = contact
      ? this.scopedKey(botId, contact, messageId)
      : this.directIndex.get(this.globalKey(botId, messageId))
    const alias = contact
      ? this.scopedAliasIndex.get(this.scopedKey(botId, contact, messageId))
      : this.aliasIndex.get(this.globalKey(botId, messageId))
    const key = scoped && this.memory.has(scoped) ? scoped : alias
    if (!key) return null

    const message = this.memory.get(key)
    if (!message) return null
    if (!this.isExpired(message)) return message

    this.cleanupMemory()
    return null
  }

  /**
   * 到达清理间隔时清理内存缓存。
   */
  private cleanupMemoryIfDue (): void {
    if (Date.now() - this.lastCleanup < CLEANUP_INTERVAL) return
    this.cleanupMemory()
  }

  /**
   * 清理三天前的内存消息，并同步清理失效索引。
   */
  private cleanupMemory (): void {
    const deadline = Date.now() - MESSAGE_TTL
    for (const [key, message] of this.memory) {
      if (message.time <= deadline) this.memory.delete(key)
    }
    this.cleanIndex(this.directIndex)
    this.cleanIndex(this.aliasIndex)
    this.cleanIndex(this.scopedAliasIndex)
  }

  /**
   * 清理指向已删除内存消息的索引。
   *
   * @param index 需要清理的索引 Map。
   */
  private cleanIndex (index: Map<string, string>): void {
    for (const [key, scoped] of index) {
      if (!this.memory.has(scoped)) index.delete(key)
    }
  }

  /**
   * 浅拷贝消息缓存，避免后续事件对象被插件侧修改后污染缓存。
   *
   * @param message 原始缓存消息。
   * @returns 可安全放入缓存的消息副本。
   */
  private cloneMessage (message: CachedMessage): CachedMessage {
    return {
      ...message,
      contact: { ...message.contact } as Contact,
      sender: { ...message.sender } as Sender,
      elements: message.elements.map(element => ({ ...element })),
    }
  }

  /**
   * 将内存缓存转换为 Karin `MessageResponse`。
   *
   * @param message 内存缓存消息。
   * @returns Karin 标准消息查询结果。
   */
  private toResponse (message: CachedMessage): MessageResponse {
    return {
      messageId: message.messageId,
      messageSeq: message.messageSeq,
      time: message.time,
      contact: { ...message.contact } as Contact,
      sender: { ...message.sender } as GroupSender,
      elements: message.elements.map(element => ({ ...element })),
    }
  }

  /**
   * 执行数据库版本迁移。
   *
   * 使用 SQLite `PRAGMA user_version` 记录已应用的 schema 版本。
   * 版本 0 只表示“未初始化或开发期旧库”，首个 alpha 发布基线为 v1。
   *
   * @returns 迁移完成 Promise。
   */
  private async migrate (): Promise<void> {
    const latest = migrations.at(-1)?.version || 0
    if (latest !== DATABASE_VERSION) {
      throw new Error(`消息缓存数据库迁移版本不一致: 常量 v${DATABASE_VERSION}，迁移入口 v${latest}`)
    }

    const current = await this.getUserVersion()
    if (current > DATABASE_VERSION) {
      throw new Error(`消息缓存数据库版本过高: 当前 v${current}，适配器支持 v${DATABASE_VERSION}`)
    }

    for (let version = current + 1; version <= DATABASE_VERSION; version++) {
      const migration = migrations.find(item => item.version === version)
      if (!migration) throw new Error(`缺少消息缓存数据库迁移: v${version}`)
      await this.transaction(() => migration.up({
        run: (sql, params) => this.run(sql, params),
        tableColumns: name => this.tableColumns(name),
        tableExists: name => this.tableExists(name),
        markVacuum: () => {
          this.shouldVacuum = true
        },
      }))
      await this.setUserVersion(version)
    }

    if (this.shouldVacuum) {
      await this.run('VACUUM')
      this.shouldVacuum = false
    }
  }

  /**
   * 获取或创建 bot 映射 ID。
   *
   * @param botId 当前 QQBot appId。
   * @returns `qqbot_bots.id`。
   */
  private async ensureBot (botId: string): Promise<number> {
    const cached = this.botRefCache.get(botId)
    if (cached) return cached

    await this.run(SQL.insertBot, [botId])
    const row = await this.getRow<IdRow>(SQL.selectBotId, [botId])
    if (!row) throw new Error(`消息缓存 bot 映射写入失败: ${botId}`)
    this.botRefCache.set(botId, row.id)
    return row.id
  }

  /**
   * 获取或创建会话映射 ID。
   *
   * @param botRef `qqbot_bots.id`。
   * @param contact Karin 会话对象。
   * @returns `qqbot_contacts.id`。
   */
  private async ensureContact (botRef: number, contact: Contact): Promise<number> {
    const key = [botRef, contact.scene, contact.peer, contact.subPeer || ''].join('\x1f')
    const cached = this.contactRefCache.get(key)
    if (cached) return cached

    const values = [
      botRef, contact.scene, contact.peer, contact.subPeer || '',
      contact.name || '', contact.subName || '',
    ]
    await this.run(SQL.upsertContact, values)
    const row = await this.getRow<IdRow>(SQL.selectContactId, values.slice(0, 4))
    if (!row) throw new Error(`消息缓存会话映射写入失败: ${contact.scene}:${contact.peer}`)
    this.contactRefCache.set(key, row.id)
    return row.id
  }

  /**
   * 获取或创建发送者映射 ID。
   *
   * @param botRef `qqbot_bots.id`。
   * @param sender Karin sender 对象。
   * @returns `qqbot_senders.id`。
   */
  private async ensureSender (botRef: number, sender: Sender): Promise<number> {
    const role = (sender as GroupSender).role || 'member'
    const values = [
      botRef,
      sender.userId || '',
      sender.nick || '',
      sender.name || '',
      role,
    ]
    const key = values.join('\x1f')
    const cached = this.senderRefCache.get(key)
    if (cached) return cached

    await this.run(SQL.upsertSender, values)
    const row = await this.getRow<IdRow>(SQL.selectSenderId, values)
    if (!row) throw new Error(`消息缓存发送者映射写入失败: ${sender.userId || ''}`)
    this.senderRefCache.set(key, row.id)
    return row.id
  }

  /**
   * 获取或创建消息主记录。
   *
   * @param botRef `qqbot_bots.id`。
   * @param contactRef `qqbot_contacts.id`。
   * @param senderRef `qqbot_senders.id`。
   * @param message 消息缓存。
   * @returns `qqbot_messages.id`。
   */
  private async ensureMessage (
    botRef: number,
    contactRef: number,
    senderRef: number,
    message: CachedMessage
  ): Promise<number> {
    await this.run(SQL.upsertMessage, [
      botRef, contactRef, senderRef, message.messageId, message.messageSeq, message.time,
    ])
    const row = await this.getRow<IdRow>(SQL.selectMessageRef, [botRef, contactRef, message.messageId])
    if (!row) throw new Error(`消息缓存主记录写入失败: ${message.messageId}`)
    return row.id
  }

  /**
   * 从查询行还原 Karin Contact。
   *
   * @param row 消息主查询结果。
   * @returns Karin Contact。
   */
  private contactFromRow (row: MessageRow): Contact {
    const common = { peer: row.peer, name: row.contact_name }
    switch (row.scene) {
      case 'group': return { scene: 'group', ...common }
      case 'friend': return { scene: 'friend', ...common }
      case 'guild': return { scene: 'guild', ...common, subPeer: row.sub_peer, subName: row.contact_sub_name }
      case 'direct': return { scene: 'direct', ...common, subPeer: row.sub_peer, subName: row.contact_sub_name }
      case 'groupTemp': return { scene: 'groupTemp', ...common, subPeer: row.sub_peer }
    }
  }

  /**
   * 将数据库行还原为 Karin `MessageResponse`。
   *
   * @param row 消息主查询结果。
   * @returns Karin 标准消息查询结果。
   */
  private async rowToResponse (row: MessageRow): Promise<MessageResponse> {
    return {
      messageId: row.message_id,
      messageSeq: row.message_seq,
      time: row.time,
      contact: this.contactFromRow(row),
      sender: {
        userId: row.sender_user_id,
        nick: row.sender_nick,
        name: row.sender_name,
        role: row.sender_role,
      },
      elements: await loadElements((sql, params) => this.getRows(sql, params), row.message_ref),
    }
  }

  /**
   * 在指定会话中解析消息 ID 或 alias 到消息主表行。
   *
   * @param botId 当前 QQBot appId。
   * @param contact Karin 会话对象。
   * @param messageId 真实消息 ID 或 alias。
   * @returns 命中的消息行；未命中时返回 null。
   */
  private async resolveMessageRow (
    botId: string,
    contact: Contact,
    messageId: string
  ): Promise<MessageRow | null> {
    const key = this.contactKey(botId, contact, messageId)
    const direct = await this.getRow<MessageRow>(SQL.selectMessage, key)
    const alias = direct
      ? undefined
      : await this.getRow<MessageAliasRow>(SQL.selectAlias, key)
    if (!direct && !alias) return null

    const row = direct || await this.getRow<MessageRow>(SQL.selectMessageByRef, [alias!.message_ref])
    if (!row) return null

    if (!direct && await this.hasReplyTo(row.message_ref, messageId)) {
      await this.deleteAlias(botId, this.contactFromRow(row), messageId)
      return null
    }
    return row
  }

  /**
   * 构造会话级查询键。
   *
   * @param botId 当前 QQBot appId。
   * @param contact Karin 会话对象。
   * @param messageId 消息 ID 或 alias。
   * @returns 用于 SQL 参数或内存 key 的字段数组。
   */
  private contactKey (botId: string, contact: Contact, messageId: string): string[] {
    return [botId, contact.scene, contact.peer, contact.subPeer || '', messageId]
  }

  /**
   * 构造内存会话级 key。
   *
   * @param botId 当前 QQBot appId。
   * @param contact Karin 会话对象。
   * @param messageId 消息 ID 或 alias。
   * @returns 内存 Map 使用的稳定 key。
   */
  private scopedKey (botId: string, contact: Contact, messageId: string): string {
    return this.contactKey(botId, contact, messageId).join('\x1f')
  }

  /**
   * 构造内存全局 key。
   *
   * @param botId 当前 QQBot appId。
   * @param messageId 消息 ID 或 alias。
   * @returns 不限定会话时使用的内存 key。
   */
  private globalKey (botId: string, messageId: string): string {
    return `${botId}\x1f${messageId}`
  }

  /**
   * 删除指定会话下的 alias。
   *
   * @param botId 当前 QQBot appId。
   * @param contact Karin 会话对象。
   * @param messageId 需要删除的 alias ID。
   */
  private async deleteAlias (botId: string, contact: Contact, messageId: string): Promise<void> {
    await this.run(SQL.deleteAlias, [
      botId, botId, contact.scene, contact.peer, contact.subPeer || '', messageId,
    ])
  }

  /**
   * 判断某条消息是否包含指向指定 ID 的 reply 段。
   *
   * @param messageRef `qqbot_messages.id`。
   * @param replyId 被引用的消息 ID。
   * @returns true 表示该消息包含对应 reply 段。
   */
  private async hasReplyTo (messageRef: number, replyId: string): Promise<boolean> {
    return !!await this.getRow<{ found: number }>(SQL.hasReply, [messageRef, replyId])
  }

  /**
   * 判断消息是否已经超过本地缓存 TTL。
   *
   * @param row 带 `time` 字段的消息对象。
   * @returns true 表示已经超过三天缓存窗口。
   */
  private isExpired (row: Pick<CachedMessage | MessageRow, 'time'>): boolean {
    return row.time <= Date.now() - MESSAGE_TTL
  }

  /**
   * 到达清理间隔时清理内存和 SQLite 过期消息。
   */
  private async cleanupIfDue (): Promise<void> {
    if (Date.now() - this.lastCleanup < CLEANUP_INTERVAL) return
    await this.cleanup()
  }

  /**
   * 清理三天前的缓存消息。
   *
   * SQLite 只删除主消息表，消息段和 alias 通过外键级联删除。
   */
  private async cleanup (): Promise<void> {
    this.cleanupMemory()
    await this.run(SQL.cleanup, [Date.now() - MESSAGE_TTL])
    this.lastCleanup = Date.now()
  }

  /**
   * 判断 SQLite 表是否存在。
   *
   * @param name 表名。
   * @returns true 表示表存在。
   */
  private async tableExists (name: string): Promise<boolean> {
    return !!await this.getRow('SELECT 1 AS found FROM sqlite_master WHERE type = ? AND name = ?', ['table', name])
  }

  /**
   * 读取 SQLite 表字段名。
   *
   * @param name 表名。
   * @returns 字段名数组；表不存在时返回空数组。
   */
  private async tableColumns (name: string): Promise<string[]> {
    if (!(await this.tableExists(name))) return []
    const rows = await this.getRows<{ name: string }>(`PRAGMA table_info(${name})`)
    return rows.map(row => row.name)
  }

  /**
   * 读取 SQLite schema 版本。
   *
   * @returns 当前 `PRAGMA user_version`；新库默认为 0。
   */
  private async getUserVersion (): Promise<number> {
    const row = await this.getRow<{ user_version: number }>('PRAGMA user_version')
    return row?.user_version || 0
  }

  /**
   * 写入 SQLite schema 版本。
   *
   * @param version 已成功应用的数据库版本号。
   */
  private async setUserVersion (version: number): Promise<void> {
    await this.run(`PRAGMA user_version = ${version}`)
  }

  /**
   * 在 `BEGIN IMMEDIATE` 事务中执行写操作。
   *
   * @param fn 事务内执行的异步函数。
   */
  private async transaction (fn: () => Promise<void>): Promise<void> {
    await this.run('BEGIN IMMEDIATE')
    try {
      await fn()
      await this.run('COMMIT')
    } catch (err) {
      await this.run('ROLLBACK').catch(() => undefined)
      throw err
    }
  }

  /**
   * 执行不返回行的 SQL。
   *
   * @param sql SQL 字符串。
   * @param params SQL 参数。
   */
  private async run (sql: string, params: unknown[] = []): Promise<void> {
    const db = this.db
    if (!db) throw new Error('消息缓存数据库尚未初始化')
    await new Promise<void>((resolve, reject) => {
      db.run(sql, params, (err) => err ? reject(err) : resolve())
    })
  }

  /**
   * 查询单行数据。
   *
   * @param sql SQL 字符串。
   * @param params SQL 参数。
   * @returns 查询结果；未命中时返回 undefined。
   */
  private async getRow<T> (sql: string, params: unknown[] = []): Promise<T | undefined> {
    const db = this.db
    if (!db) throw new Error('消息缓存数据库尚未初始化')
    return new Promise<T | undefined>((resolve, reject) => {
      db.get(sql, params, (err, row: T | undefined) => err ? reject(err) : resolve(row))
    })
  }

  /**
   * 查询多行数据。
   *
   * @param sql SQL 字符串。
   * @param params SQL 参数。
   * @returns 查询结果数组。
   */
  private async getRows<T> (sql: string, params: unknown[] = []): Promise<T[]> {
    const db = this.db
    if (!db) throw new Error('消息缓存数据库尚未初始化')
    return new Promise<T[]>((resolve, reject) => {
      db.all(sql, params, (err, rows: T[]) => err ? reject(err) : resolve(rows))
    })
  }
}
