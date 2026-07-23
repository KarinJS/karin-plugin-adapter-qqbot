import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import sqlite3, { type Database, type Statement } from 'node-karin/sqlite3'
import { karinPathBase } from 'node-karin'
import { log } from '@/utils/logger'
import { decodeElements, encodeElements } from './codec'
import {
  DATABASE_VERSION, FLUSH_BATCH_SIZE, FLUSH_INTERVAL, MAX_MEDIA_LOCALIZE_QUEUE,
  MAX_MESSAGE_ROWS, MAX_WRITE_QUEUE, MEDIA_LOCALIZE_CONCURRENCY,
  MEDIA_LOCALIZE_INTERVAL, MEDIA_RECOVERY_LIMIT, MESSAGE_TTL,
} from './constants'
import { hashId } from './hash'
import { cleanupMessageMediaCache, hasRemoteFileElement, localizeFileElements } from './media'
import { migrations } from './migrations'
import { SQL } from './sql'
import type { Contact, GroupSender, MessageResponse, Sender } from 'node-karin'
import type { CachedMessage, CountRow, IdRow, MessageRow, SaveOptions } from './types'

interface PendingWrite {
  botId: string
  message: CachedMessage
  /** QQ `msg_idx` 引用索引；无或与 messageId 相同则为 undefined。 */
  refIdx?: string
  /** 是否是机器人自己发送的消息。 */
  isSelf: boolean
  /** 引用上下文写入：数据库已有该 ID（原文或引用索引）时跳过。 */
  referenceOnly: boolean
}

/** 待本地化的媒体缓存任务。 */
interface PendingMediaLocalize {
  botId: string
  /** 包含远程媒体 URL 的消息快照。 */
  message: CachedMessage
  refIdx?: string
  isSelf: boolean
  /** 会话级去重 key，避免同一消息重复排队下载。 */
  key: string
}

/**
 * QQBot 收到的消息缓存。
 *
 * SQLite 是唯一数据层，没有内存镜像：
 * - 写入热路径只入队，后台按批次事务落库，每条消息稳定 2~3 次语句
 *   往返（prepared statement 复用）；
 * - 所有读取直接查 SQLite（WAL + 整数 hash 索引，点查亚毫秒级）；
 *   读取前先排空待写队列，保证"读到自己刚写的数据"。
 */
export class MessageStore {
  private db?: Database
  private readonly ready: Promise<void>
  private shouldVacuum = false
  private flushTimer?: NodeJS.Timeout
  private flushActive?: Promise<void>
  private mediaTimer?: NodeJS.Timeout
  private mediaActive = 0

  private pending: PendingWrite[] = []
  private pendingMedia: PendingMediaLocalize[] = []
  private readonly pendingMediaKeys = new Set<string>()
  private readonly statements = new Map<string, Statement>()
  private readonly contactRefCache = new Map<string, number>()
  private readonly senderRefCache = new Map<string, number>()

  constructor () {
    this.ready = this.initialize()
    this.ready
      .then(() => this.recoverRemoteMedia())
      .catch(err => log('error', '[getMsg] 消息缓存数据库初始化失败', err))
  }

  /**
   * 立即执行一次过期消息和本地媒体缓存清理。
   *
   * 该方法交给 Karin `task` 调度调用；读写路径不再内嵌清理，避免尾延迟。
   *
   * @returns 清理完成 Promise。
   */
  async cleanupExpired (): Promise<void> {
    await this.ready
    await this.cleanup()
  }

  /**
   * 保存实际消息。
   *
   * 只克隆快照并投递后台队列，不等待 SQLite，消息事件创建不会被
   * 数据库写锁或小事务阻塞。
   *
   * @param botId 当前 QQBot appId。
   * @param message 已转换为 Karin elements 的消息缓存。
   * @param options 引用索引与自己消息标记。
   */
  async save (botId: string, message: CachedMessage, options: SaveOptions = {}): Promise<void> {
    if (!message.messageId) return
    if (this.isExpired(message)) return

    const cached = this.cloneMessage(message)
    const refIdx = options.refIdx && options.refIdx !== message.messageId ? options.refIdx : undefined
    const isSelf = !!options.isSelf
    this.enqueue({ botId, message: cached, refIdx, isSelf, referenceOnly: false })
    this.enqueueMediaLocalize(botId, cached, refIdx, isSelf)
  }

  /**
   * 保存 QQ 下发的引用上下文。
   *
   * 是否已有同 ID 缓存（原消息或引用索引）由后台 flush 在事务内判断并去重，
   * 避免阻塞事件热路径。
   *
   * @param botId 当前 QQBot appId。
   * @param message 以 `ref_msg_idx` 作为 messageId 的引用上下文。
   */
  async saveReferenceIfAbsent (botId: string, message: CachedMessage): Promise<void> {
    if (!message.messageId) return
    if (this.isExpired(message)) return

    const cached = this.cloneMessage(message)
    this.enqueue({ botId, message: cached, isSelf: false, referenceOnly: true })
    this.enqueueMediaLocalize(botId, cached, undefined, false)
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

    await this.ready
    await this.flushAll()
    const row = await this.queryMessageRow(botId, messageId, contact)
    if (!row || this.isExpired(row)) return null
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
    await this.flushAll()

    const anchor = await this.queryMessageRow(botId, startMsgId, contact)
    if (!anchor || this.isExpired(anchor)) return []

    const rows = await this.allS<MessageRow>(SQL.selectHistory, [
      anchor.contact_ref,
      anchor.time,
      anchor.time,
      anchor.message_ref,
      limit,
    ])
    return rows.map(row => this.rowToResponse(row))
  }

  /**
   * 将 QQ `REFIDX` 引用索引解析为 API 消息 ID。
   *
   * 供撤回等平台接口在内存映射（重启后为空）未命中时回退查询。
   *
   * @param botId 当前 QQBot appId。
   * @param contact 消息所在会话。
   * @param refIdx QQ 引用索引，通常为 REFIDX_...。
   * @returns 对应的 API 消息 ID；未命中时返回 null。
   */
  async resolveApiMessageId (botId: string, contact: Contact, refIdx: string): Promise<string | null> {
    if (!refIdx) return null

    await this.ready
    await this.flushAll()
    const row = await this.getS<MessageRow>(SQL.selectByRefIdxScoped, [
      hashId(refIdx), botId, contact.scene, contact.peer, contact.subPeer || '', refIdx,
    ])
    if (!row || this.isExpired(row)) return null
    return row.msg_id
  }

  /**
   * 判断消息是否由机器人自己发送。
   *
   * 供单聊撤回在内存标记（重启后为空）未命中时回退查询。
   *
   * @param botId 当前 QQBot appId。
   * @param contact 消息所在会话。
   * @param messageId QQ API 消息 ID。
   * @returns true 表示是机器人自己发送的消息。
   */
  async isSelfMessage (botId: string, contact: Contact, messageId: string): Promise<boolean> {
    if (!messageId) return false

    await this.ready
    await this.flushAll()
    const row = await this.queryMessageRow(botId, messageId, contact)
    return !!row && !this.isExpired(row) && row.is_self === 1
  }

  /**
   * 初始化 SQLite 连接、表结构，并执行一次启动清理。
   *
   * 远程媒体补救不在这里执行，避免阻塞 `ready` 拖慢首批消息落库。
   *
   * @returns 初始化完成 Promise。
   */
  private async initialize (): Promise<void> {
    const file = join(karinPathBase, '@karinjs-adapter-qqbot', 'data', 'message-cache.db')
    await mkdir(dirname(file), { recursive: true })
    this.db = await new Promise<Database>((resolve, reject) => {
      const db = new sqlite3.Database(file, (err) => err ? reject(err) : resolve(db))
    })

    await this.exec('PRAGMA journal_mode = WAL')
    await this.exec('PRAGMA synchronous = NORMAL')
    await this.exec('PRAGMA temp_store = MEMORY')
    await this.exec('PRAGMA busy_timeout = 5000')
    /** 在迁移 VACUUM 前设置才会生效；生效后清理任务通过增量 vacuum 归还空间。 */
    await this.exec('PRAGMA auto_vacuum = INCREMENTAL')
    await this.migrate()
    await this.cleanup()
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
        const dropCount = this.pending.length - MAX_WRITE_QUEUE
        this.pending.splice(0, dropCount)
        log('warn', `[getMsg] SQLite 写入队列过长，已丢弃 ${dropCount} 条最旧待写缓存`)
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
    if (this.flushTimer || this.flushActive) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined
      this.flushQueue().catch(() => undefined)
    }, FLUSH_INTERVAL)
    this.flushTimer.unref()
  }

  /**
   * 触发一次批量落库；已有进行中的 flush 时复用其 Promise。
   *
   * @returns 当前批次落库完成的 Promise。
   */
  private flushQueue (): Promise<void> {
    if (!this.flushActive) {
      this.flushActive = this.doFlushBatch()
        .catch(err => log('warn', '[getMsg] 批量写入消息缓存失败', err))
        .finally(() => {
          this.flushActive = undefined
          if (this.pending.length) this.scheduleFlush()
        })
    }
    return this.flushActive
  }

  /**
   * 等待写入队列完全清空。
   *
   * 所有读取入口先经过它，保证"读到自己刚写的数据"；队列为空时零开销。
   */
  private async flushAll (): Promise<void> {
    while (this.pending.length || this.flushActive) {
      await this.flushQueue()
    }
  }

  /**
   * 批量落库队列中的消息。
   *
   * 单次最多处理 `FLUSH_BATCH_SIZE` 条，并在一个事务内完成写入。
   *
   * @returns flush 完成 Promise。
   */
  private async doFlushBatch (): Promise<void> {
    await this.ready
    const batch = this.pending.splice(0, FLUSH_BATCH_SIZE)
    if (!batch.length) return

    await this.transaction(async () => {
      for (const item of batch) {
        if (this.isExpired(item.message)) continue
        await this.writeItem(item)
      }
    })
  }

  /**
   * 写入一条待落库消息。
   *
   * 稳定状态下（contact/sender 已缓存）每条消息 2 次语句往返：
   * 定位既有行 + INSERT 或 UPDATE。
   *
   * @param item 待写入的消息任务。
   */
  private async writeItem (item: PendingWrite): Promise<void> {
    const contactRef = await this.ensureContact(item.botId, item.message.contact)
    const msgHash = hashId(item.message.messageId)

    const existing = await this.getS<IdRow>(SQL.selectMessageIdByMsgId, [
      msgHash, contactRef, item.message.messageId,
    ])
    if (item.referenceOnly) {
      if (existing) return
      /** 原消息已把该 REFIDX 作为自己的引用索引缓存时，不再另存引用上下文。 */
      const asRefIdx = await this.getS<IdRow>(SQL.selectMessageIdByRefIdx, [
        msgHash, contactRef, item.message.messageId,
      ])
      if (asRefIdx) return
    }

    const senderRef = await this.ensureSender(item.botId, item.message.sender)
    const encoded = encodeElements(item.message.elements)
    const hasRemote = hasRemoteFileElement(item.message.elements) ? 1 : 0
    const refIdx = item.refIdx || null
    const refHash = refIdx ? hashId(refIdx) : null

    if (existing) {
      await this.runS(SQL.updateMessage, [
        senderRef, refIdx, refHash, encoded.replyTo, item.message.time,
        item.isSelf ? 1 : 0, hasRemote, encoded.json, existing.id,
      ])
      return
    }
    await this.runS(SQL.insertMessage, [
      contactRef, senderRef, item.message.messageId, msgHash, refIdx, refHash,
      encoded.replyTo, item.message.time, item.isSelf ? 1 : 0,
      item.referenceOnly ? 1 : 0, hasRemote, encoded.json,
    ])
  }

  /**
   * 清理待写队列中已经过期的消息。
   */
  private prunePending (): void {
    const deadline = Date.now() - MESSAGE_TTL
    const kept = this.pending.filter(item => item.message.time > deadline)
    if (kept.length !== this.pending.length) this.pending = kept
  }

  /**
   * 投递媒体本地化任务。
   *
   * 原消息会先保留短期 URL 写入缓存；本地化成功后再覆盖同一条消息。队列会按
   * message scoped key 去重，避免高频更新同一条消息时重复下载。
   *
   * @param botId 当前 QQBot appId。
   * @param message 可能包含远程媒体 URL 的消息快照。
   * @param refIdx 该消息的引用索引，成功本地化后随消息一并回写。
   * @param isSelf 是否机器人自己发送。
   */
  private enqueueMediaLocalize (
    botId: string,
    message: CachedMessage,
    refIdx: string | undefined,
    isSelf: boolean
  ): void {
    if (!hasRemoteFileElement(message.elements)) return
    if (this.isExpired(message)) return

    const key = [botId, message.contact.scene, message.contact.peer,
      message.contact.subPeer || '', message.messageId].join('\x1f')
    if (this.pendingMediaKeys.has(key)) return

    this.pendingMedia.push({
      botId,
      message: this.cloneMessage(message),
      refIdx,
      isSelf,
      key,
    })
    this.pendingMediaKeys.add(key)

    if (this.pendingMedia.length > MAX_MEDIA_LOCALIZE_QUEUE) {
      this.prunePendingMedia()
      if (this.pendingMedia.length > MAX_MEDIA_LOCALIZE_QUEUE) {
        const dropped = this.pendingMedia.splice(0, this.pendingMedia.length - MAX_MEDIA_LOCALIZE_QUEUE)
        dropped.forEach(item => this.pendingMediaKeys.delete(item.key))
        log('warn', `[getMsg] 媒体本地缓存队列过长，已丢弃 ${dropped.length} 条最旧任务`)
      }
    }

    this.scheduleMediaLocalize()
  }

  /**
   * 安排媒体本地化队列处理。
   *
   * @returns 已存在定时器或队列为空时直接返回。
   */
  private scheduleMediaLocalize (): void {
    if (this.mediaTimer) return
    if (!this.pendingMedia.length) return
    this.mediaTimer = setTimeout(() => {
      this.mediaTimer = undefined
      this.drainMediaLocalizeQueue()
    }, MEDIA_LOCALIZE_INTERVAL)
    this.mediaTimer.unref()
  }

  /**
   * 按固定并发处理媒体本地化任务。
   *
   * @returns 队列为空或达到并发上限时返回。
   */
  private drainMediaLocalizeQueue (): void {
    while (
      this.mediaActive < MEDIA_LOCALIZE_CONCURRENCY &&
      this.pendingMedia.length
    ) {
      const item = this.pendingMedia.shift()!
      this.mediaActive++
      this.localizeMediaItem(item)
        .catch(err => log('warn', `[getMsg] 媒体本地缓存失败: ${item.message.messageId}`, err))
        .finally(() => {
          this.mediaActive--
          this.pendingMediaKeys.delete(item.key)
          if (this.pendingMedia.length) this.scheduleMediaLocalize()
        })
    }
  }

  /**
   * 本地化单条消息中的远程媒体字段，并在成功后覆盖内存与 SQLite。
   *
   * @param item 待处理的媒体本地化任务。
   * @returns 本地化与回写完成 Promise。
   */
  private async localizeMediaItem (item: PendingMediaLocalize): Promise<void> {
    if (this.isExpired(item.message)) return

    const result = await localizeFileElements(item.message.elements)
    for (const failure of result.failures) {
      log('debug', `[getMsg] 媒体本地缓存跳过: ${item.message.messageId} ${failure}`)
    }
    if (!result.changed) return

    const localized = this.cloneMessage({
      ...item.message,
      elements: result.elements,
    })
    this.enqueue({
      botId: item.botId,
      message: localized,
      refIdx: item.refIdx,
      isSelf: item.isSelf,
      referenceOnly: false,
    })
  }

  /**
   * 清理已经过期的媒体本地化待处理任务。
   */
  private prunePendingMedia (): void {
    const deadline = Date.now() - MESSAGE_TTL
    const kept: PendingMediaLocalize[] = []
    for (const item of this.pendingMedia) {
      if (item.message.time > deadline) {
        kept.push(item)
      } else {
        this.pendingMediaKeys.delete(item.key)
      }
    }
    if (kept.length !== this.pendingMedia.length) this.pendingMedia = kept
  }

  /**
   * 启动时扫描 SQLite 中尚未本地化的远程媒体消息，并重新投递队列补救。
   *
   * `has_remote_media` 是部分索引列，扫描不再需要 LIKE 全表匹配。
   *
   * @returns 扫描和投递完成 Promise。
   */
  private async recoverRemoteMedia (): Promise<void> {
    const rows = await this.allS<MessageRow>(SQL.selectRemoteMedia, [
      Date.now() - MESSAGE_TTL,
      MEDIA_RECOVERY_LIMIT,
    ])
    if (!rows.length) return

    for (const row of rows) {
      const response = this.rowToResponse(row)
      this.enqueueMediaLocalize(row.bot_id, {
        messageId: response.messageId,
        messageSeq: response.messageSeq,
        time: response.time,
        contact: response.contact,
        sender: response.sender,
        elements: response.elements,
      }, row.ref_idx || undefined, row.is_self === 1)
    }
    log('debug', `[getMsg] 已投递 ${rows.length} 条远程媒体缓存补救任务`)
  }

  /**
   * 按消息 ID 或引用索引查询消息行。
   *
   * @param botId 当前 QQBot appId。
   * @param messageId 真实消息 ID 或 `REFIDX` 引用索引。
   * @param contact 可选会话范围。
   * @returns 命中的消息行；未命中时返回 null。
   */
  private async queryMessageRow (
    botId: string,
    messageId: string,
    contact?: Contact
  ): Promise<MessageRow | null> {
    const hash = hashId(messageId)
    const direct = contact
      ? await this.getS<MessageRow>(SQL.selectByMsgIdScoped, [
        hash, botId, contact.scene, contact.peer, contact.subPeer || '', messageId,
      ])
      : await this.getS<MessageRow>(SQL.selectByMsgId, [hash, botId, messageId])
    if (direct) return direct

    const byRef = contact
      ? await this.getS<MessageRow>(SQL.selectByRefIdxScoped, [
        hash, botId, contact.scene, contact.peer, contact.subPeer || '', messageId,
      ])
      : await this.getS<MessageRow>(SQL.selectByRefIdx, [hash, botId, messageId])
    if (!byRef) return null

    if (byRef.reply_to === messageId) {
      /** 该行的引用索引错误指向它引用的消息，属于旧缓存污染，清除后按未命中处理。 */
      await this.runS(SQL.clearRefIdx, [byRef.message_ref])
      return null
    }
    return byRef
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
   * 将数据库行还原为 Karin `MessageResponse`。
   *
   * @param row 消息主查询结果。
   * @returns Karin 标准消息查询结果。
   */
  private rowToResponse (row: MessageRow): MessageResponse {
    return {
      messageId: row.msg_id,
      messageSeq: 0,
      time: row.time,
      contact: this.contactFromRow(row),
      sender: {
        userId: row.sender_user_id,
        nick: row.sender_nick,
        name: row.sender_name,
        role: row.sender_role,
      },
      elements: decodeElements(row.elements),
    }
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
   * 获取或创建会话映射 ID。
   *
   * @param botId 当前 QQBot appId。
   * @param contact Karin 会话对象。
   * @returns `qqbot_contacts.id`。
   */
  private async ensureContact (botId: string, contact: Contact): Promise<number> {
    const key = [botId, contact.scene, contact.peer, contact.subPeer || ''].join('\x1f')
    const cached = this.contactRefCache.get(key)
    if (cached) return cached

    const values = [
      botId, contact.scene, contact.peer, contact.subPeer || '',
      contact.name || '', contact.subName || '',
    ]
    await this.runS(SQL.upsertContact, values)
    const row = await this.getS<IdRow>(SQL.selectContactId, values.slice(0, 4))
    if (!row) throw new Error(`消息缓存会话映射写入失败: ${contact.scene}:${contact.peer}`)
    this.contactRefCache.set(key, row.id)
    return row.id
  }

  /**
   * 获取或创建发送者映射 ID。
   *
   * sender 按 (userId, nick, name, role) 去重；不再被引用的行由清理任务 GC，
   * 不会随昵称变化永久膨胀。
   *
   * @param botId 当前 QQBot appId。
   * @param sender Karin sender 对象。
   * @returns `qqbot_senders.id`。
   */
  private async ensureSender (botId: string, sender: Sender): Promise<number> {
    const role = (sender as GroupSender).role || 'member'
    const values = [
      botId,
      sender.userId || '',
      sender.nick || '',
      sender.name || '',
      role,
    ]
    const key = values.join('\x1f')
    const cached = this.senderRefCache.get(key)
    if (cached) return cached

    await this.runS(SQL.upsertSender, values)
    const row = await this.getS<IdRow>(SQL.selectSenderId, values)
    if (!row) throw new Error(`消息缓存发送者映射写入失败: ${sender.userId || ''}`)
    this.senderRefCache.set(key, row.id)
    return row.id
  }

  /**
   * 判断消息是否已经超过本地缓存 TTL。
   *
   * @param row 带 `time` 字段的消息对象。
   * @returns true 表示已经超过一天缓存窗口。
   */
  private isExpired (row: Pick<CachedMessage | MessageRow, 'time'>): boolean {
    return row.time <= Date.now() - MESSAGE_TTL
  }

  /**
   * 清理一天前的缓存消息，并执行体积治理。
   *
   * 依次执行：TTL 删除、硬上限删除、sender GC（写空闲时）、
   * 增量 vacuum 归还空间、WAL checkpoint 截断、媒体文件清理。
   */
  private async cleanup (): Promise<void> {
    await this.runS(SQL.cleanup, [Date.now() - MESSAGE_TTL])

    const count = await this.getS<CountRow>(SQL.countMessages)
    if (count && count.total > MAX_MESSAGE_ROWS) {
      const excess = count.total - MAX_MESSAGE_ROWS
      await this.runS(SQL.deleteOverCap, [excess])
      log('warn', `[getMsg] 消息缓存超过 ${MAX_MESSAGE_ROWS} 条硬上限，已删除最旧 ${excess} 条`)
    }

    /** sender GC 与批量写并发会产生悬空 sender_ref，只在写队列空闲时执行。 */
    if (!this.pending.length && !this.flushActive) {
      await this.runS(SQL.gcSenders)
      this.senderRefCache.clear()
    }

    await this.exec('PRAGMA incremental_vacuum')
    await this.rawGet('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => undefined)
    await cleanupMessageMediaCache()
  }

  /**
   * 执行数据库版本迁移。
   *
   * 使用 SQLite `PRAGMA user_version` 记录已应用的 schema 版本。
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
        run: (sql, params) => this.exec(sql, params),
        tableColumns: name => this.tableColumns(name),
        tableExists: name => this.tableExists(name),
        markVacuum: () => {
          this.shouldVacuum = true
        },
      }))
      await this.exec(`PRAGMA user_version = ${version}`)
    }

    if (this.shouldVacuum) {
      await this.exec('VACUUM')
      this.shouldVacuum = false
    }
  }

  /**
   * 判断 SQLite 表是否存在。
   *
   * @param name 表名。
   * @returns true 表示表存在。
   */
  private async tableExists (name: string): Promise<boolean> {
    return !!await this.rawGet(
      'SELECT 1 AS found FROM sqlite_master WHERE type = ? AND name = ?',
      ['table', name]
    )
  }

  /**
   * 读取 SQLite 表字段名。
   *
   * @param name 表名。
   * @returns 字段名数组；表不存在时返回空数组。
   */
  private async tableColumns (name: string): Promise<string[]> {
    if (!(await this.tableExists(name))) return []
    const rows = await this.rawAll<{ name: string }>(`PRAGMA table_info(${name})`)
    return rows.map(row => row.name)
  }

  /**
   * 读取 SQLite schema 版本。
   *
   * @returns 当前 `PRAGMA user_version`；新库默认为 0。
   */
  private async getUserVersion (): Promise<number> {
    const row = await this.rawGet<{ user_version: number }>('PRAGMA user_version')
    return row?.user_version || 0
  }

  /**
   * 在 `BEGIN IMMEDIATE` 事务中执行写操作。
   *
   * @param fn 事务内执行的异步函数。
   */
  private async transaction (fn: () => Promise<void>): Promise<void> {
    await this.exec('BEGIN IMMEDIATE')
    try {
      await fn()
      await this.exec('COMMIT')
    } catch (err) {
      await this.exec('ROLLBACK').catch(() => undefined)
      throw err
    }
  }

  /**
   * 获取当前数据库连接。
   *
   * @returns 已初始化的 sqlite3 Database。
   */
  private database (): Database {
    if (!this.db) throw new Error('消息缓存数据库尚未初始化')
    return this.db
  }

  /**
   * 获取（并缓存）prepared statement。
   *
   * 热路径 SQL 只 parse 一次，重复执行只做参数绑定。
   *
   * @param sql SQL 字符串。
   * @returns 复用的 Statement。
   */
  private prepared (sql: string): Statement {
    let stmt = this.statements.get(sql)
    if (!stmt) {
      stmt = this.database().prepare(sql)
      this.statements.set(sql, stmt)
    }
    return stmt
  }

  /**
   * 以 prepared statement 执行不返回行的 SQL。
   *
   * @param sql SQL 字符串。
   * @param params SQL 参数。
   */
  private runS (sql: string, params: unknown[] = []): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.prepared(sql).run(params, (err) => err ? reject(err) : resolve())
    })
  }

  /**
   * 以 prepared statement 查询单行数据。
   *
   * @param sql SQL 字符串。
   * @param params SQL 参数。
   * @returns 查询结果；未命中时返回 undefined。
   */
  private getS<T> (sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve, reject) => {
      this.prepared(sql).get(params, (err, row: T | undefined) => err ? reject(err) : resolve(row))
    })
  }

  /**
   * 以 prepared statement 查询多行数据。
   *
   * @param sql SQL 字符串。
   * @param params SQL 参数。
   * @returns 查询结果数组。
   */
  private allS<T> (sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      this.prepared(sql).all(params, (err, rows: T[]) => err ? reject(err) : resolve(rows))
    })
  }

  /**
   * 执行一次性 SQL（DDL、PRAGMA、事务控制），不走 prepared statement 缓存。
   *
   * @param sql SQL 字符串。
   * @param params SQL 参数。
   */
  private exec (sql: string, params: unknown[] = []): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.database().run(sql, params, (err) => err ? reject(err) : resolve())
    })
  }

  /**
   * 一次性查询单行（PRAGMA / 系统表）。
   *
   * @param sql SQL 字符串。
   * @param params SQL 参数。
   * @returns 查询结果；未命中时返回 undefined。
   */
  private rawGet<T> (sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise<T | undefined>((resolve, reject) => {
      this.database().get(sql, params, (err, row: T | undefined) => err ? reject(err) : resolve(row))
    })
  }

  /**
   * 一次性查询多行（PRAGMA / 系统表）。
   *
   * @param sql SQL 字符串。
   * @param params SQL 参数。
   * @returns 查询结果数组。
   */
  private rawAll<T> (sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      this.database().all(sql, params, (err, rows: T[]) => err ? reject(err) : resolve(rows))
    })
  }
}
