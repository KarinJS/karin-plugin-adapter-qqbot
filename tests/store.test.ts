/**
 * MessageStore 集成测试：v1 旧库迁移 + 全公开 API + 读写一致性。
 *
 * karinPathBase 跟随 cwd，所以必须先 chdir 到临时沙箱再动态 import store，
 * 数据库与配置全部落在沙箱内，不污染仓库里的开发数据。这也是 vitest 用 forks
 * 池的原因——worker_threads 里没有 process.chdir。
 */
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Contact, ElementTypes } from 'node-karin'
import type { CachedMessage } from '@/core/storage/message-store/types'
import type { MessageStore } from '@/core/storage/message-store/store'

const BOT = '102099999'
const contact = { scene: 'group', peer: 'GROUP_OPENID_1', name: '测试群' } as Contact
const contact2 = { scene: 'friend', peer: 'USER_OPENID_9', name: '' } as Contact
const sender = { userId: 'U_OPENID_1', nick: '张三', name: '', role: 'member' } as CachedMessage['sender']

const text = (t: string) => ({ type: 'text', text: t }) as ElementTypes

let store: MessageStore
let sandbox: string
let originalCwd: string
let dbFile: string
let chk: any
let chkGet: <T = any>(sql: string, params?: unknown[]) => Promise<T | undefined>
let chkAll: <T = any>(sql: string, params?: unknown[]) => Promise<T[]>

const msg = (id: string, time: number, elements: ElementTypes[]): CachedMessage => ({
  messageId: id,
  messageSeq: 0,
  time,
  contact,
  sender,
  elements,
})

let now = 0

/** 预置一个 v1 (2.2.1) 形态的旧库，用来验证迁移把它整表换掉。 */
const seedLegacyDatabase = async (sqlite3: any) => {
  mkdirSync(dirname(dbFile), { recursive: true })
  const raw = await new Promise<any>((resolve, reject) => {
    const handle = new sqlite3.Database(dbFile, (err: Error | null) => err ? reject(err) : resolve(handle))
  })
  const run = (sql: string) => new Promise<void>((resolve, reject) => {
    raw.run(sql, [], (err: Error | null) => err ? reject(new Error(`${err.message}\n${sql}`)) : resolve())
  })

  await run('CREATE TABLE qqbot_bots (id INTEGER PRIMARY KEY, bot_id TEXT NOT NULL UNIQUE)')
  await run(`CREATE TABLE qqbot_contacts (id INTEGER PRIMARY KEY, bot_ref INTEGER NOT NULL,
    scene TEXT NOT NULL, peer TEXT NOT NULL, sub_peer TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '', sub_name TEXT NOT NULL DEFAULT '',
    UNIQUE(bot_ref, scene, peer, sub_peer))`)
  await run(`CREATE TABLE qqbot_senders (id INTEGER PRIMARY KEY, bot_ref INTEGER NOT NULL,
    user_id TEXT NOT NULL, nick TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'member', UNIQUE(bot_ref, user_id, nick, name, role))`)
  await run(`CREATE TABLE qqbot_messages (id INTEGER PRIMARY KEY, bot_ref INTEGER NOT NULL,
    contact_ref INTEGER NOT NULL, sender_ref INTEGER NOT NULL, message_id TEXT NOT NULL,
    message_seq INTEGER NOT NULL DEFAULT 0, time INTEGER NOT NULL,
    UNIQUE(bot_ref, contact_ref, message_id))`)
  await run(`CREATE TABLE qqbot_message_elements (message_ref INTEGER NOT NULL,
    element_index INTEGER NOT NULL, element_type TEXT NOT NULL, value TEXT NOT NULL,
    PRIMARY KEY (message_ref, element_index)) WITHOUT ROWID`)
  await run(`CREATE TABLE qqbot_message_aliases (bot_ref INTEGER NOT NULL, contact_ref INTEGER NOT NULL,
    alias_message_id TEXT NOT NULL, message_ref INTEGER NOT NULL,
    PRIMARY KEY (bot_ref, contact_ref, alias_message_id)) WITHOUT ROWID`)
  await run("INSERT INTO qqbot_bots (bot_id) VALUES ('999')")
  await run("INSERT INTO qqbot_messages VALUES (1, 1, 1, 1, 'OLD_MSG', 0, 123)")
  await run('PRAGMA user_version = 1')
  await new Promise<void>(resolve => raw.close(() => resolve()))
}

beforeAll(async () => {
  originalCwd = process.cwd()
  sandbox = mkdtempSync(join(tmpdir(), 'qqbot-store-test-'))
  process.chdir(sandbox)

  dbFile = join(sandbox, '@karinjs', '@karinjs-adapter-qqbot', 'data', 'message-cache.db')
  const sqlite3 = (await import('node-karin/sqlite3')).default
  await seedLegacyDatabase(sqlite3)

  /** chdir 之后再 import，store 才会把库建在沙箱里。 */
  const { MessageStore } = await import('@/core/storage/message-store/store')
  store = new MessageStore()
  now = Date.now()

  await store.save(BOT, msg('ROBOT1.0_recv_1', now - 5000, [
    text('第一条'),
    { type: 'markdown', markdown: '# md' } as ElementTypes,
  ]), { refIdx: 'REFIDX_recv_1', level: 'standard' })

  await store.save(BOT, msg('ROBOT1.0_recv_2', now - 4000, [
    text('第二条'),
    { type: 'reply', messageId: 'REFIDX_recv_1' } as ElementTypes,
  ]), { refIdx: 'REFIDX_recv_2', level: 'minimal' })

  await store.save(BOT, {
    messageId: 'ROBOT1.0_self_1',
    messageSeq: 0,
    time: now - 3000,
    contact: contact2,
    sender: { userId: 'BOT', nick: 'bot', name: '' } as CachedMessage['sender'],
    elements: [{ type: 'markdown', markdown: '**self**' } as ElementTypes],
  }, { refIdx: 'REFIDX_self_1', isSelf: true, level: 'full' })

  await store.saveReferenceIfAbsent(BOT, msg('REFIDX_ctx_1', now - 2000, [text('被引用的旧消息')]))

  /** get() 会排空写队列，保证后面用裸连接读到的是已落库的数据。 */
  await store.get(BOT, 'ROBOT1.0_recv_1')

  chk = await new Promise<any>((resolve, reject) => {
    const handle = new sqlite3.Database(dbFile, (err: Error | null) => err ? reject(err) : resolve(handle))
  })
  chkGet = (sql, params = []) => new Promise((resolve, reject) => {
    chk.get(sql, params, (err: Error | null, row: any) => err ? reject(err) : resolve(row))
  })
  chkAll = (sql, params = []) => new Promise((resolve, reject) => {
    chk.all(sql, params, (err: Error | null, rows: any[]) => err ? reject(err) : resolve(rows))
  })
})

afterAll(async () => {
  await new Promise<void>(resolve => chk ? chk.close(() => resolve()) : resolve())
  process.chdir(originalCwd)
  try {
    rmSync(sandbox, { recursive: true, force: true })
  } catch { /* Windows 上 db 句柄未释放时忽略 */ }
})

describe('v1 旧库迁移', () => {
  it('迁移到 v3 并删除 v1 旧表', async () => {
    expect((await chkGet('PRAGMA user_version'))?.user_version).toBe(3)
    expect(await chkGet("SELECT 1 AS f FROM sqlite_master WHERE name='qqbot_bots'")).toBeUndefined()
  })

  it('建出 v2 之后新增的列', async () => {
    const cols = (await chkAll('PRAGMA table_info(qqbot_messages)')).map(c => c.name)
    expect(cols).toContain('msg_id_hash')
    expect(cols).toContain('is_self')
  })

  it('开启 INCREMENTAL auto_vacuum', async () => {
    expect((await chkGet('PRAGMA auto_vacuum'))?.auto_vacuum).toBe(2)
  })

  it('不保留 v1 旧数据', async () => {
    expect(await chkGet("SELECT 1 AS f FROM qqbot_messages WHERE msg_id='OLD_MSG'")).toBeUndefined()
  })
})

describe('存储分级', () => {
  it('standard 丢弃 markdown 但保留 text，contact / sender 原样还原', async () => {
    const got = await store.get(BOT, 'ROBOT1.0_recv_1')
    expect(got?.elements).toHaveLength(1)
    expect(got?.elements[0]).toMatchObject({ type: 'text', text: '第一条' })
    expect(got?.contact).toMatchObject({ scene: 'group', peer: 'GROUP_OPENID_1' })
    expect(got?.sender.nick).toBe('张三')
  })

  it('minimal 只留 reply', async () => {
    const got = await store.get(BOT, 'ROBOT1.0_recv_2')
    expect(got?.elements).toHaveLength(1)
    expect(got?.elements[0].type).toBe('reply')
  })

  it('full 保留 markdown 原文', async () => {
    const got = await store.get(BOT, 'ROBOT1.0_self_1', contact2)
    expect(got?.elements[0]).toMatchObject({ markdown: '**self**' })
  })
})

describe('查询链路', () => {
  it('REFIDX 查回原消息', async () => {
    expect((await store.get(BOT, 'REFIDX_recv_1', contact))?.messageId).toBe('ROBOT1.0_recv_1')
  })

  it('引用上下文可查', async () => {
    expect((await store.get(BOT, 'REFIDX_ctx_1', contact))?.elements[0]).toMatchObject({ text: '被引用的旧消息' })
  })

  it('REFIDX 与 API 消息 ID 双向解析', async () => {
    expect(await store.resolveApiMessageId(BOT, contact, 'REFIDX_recv_2')).toBe('ROBOT1.0_recv_2')
    expect(await store.resolveRefIdx(BOT, contact2, 'ROBOT1.0_self_1')).toBe('REFIDX_self_1')
  })

  it('isSelfMessage 区分自己发的与收到的', async () => {
    expect(await store.isSelfMessage(BOT, contact2, 'ROBOT1.0_self_1')).toBe(true)
    expect(await store.isSelfMessage(BOT, contact, 'ROBOT1.0_recv_1')).toBe(false)
  })

  it('未命中与跨 bot 都返回 null', async () => {
    expect(await store.get(BOT, 'ROBOT1.0_nope')).toBeNull()
    expect(await store.get('other_bot', 'ROBOT1.0_recv_1')).toBeNull()
  })
})

describe('历史消息', () => {
  it('从锚点向更早取，倒序且不含比锚点更新的消息', async () => {
    const history = await store.getHistory(BOT, contact, 'ROBOT1.0_recv_2', 10)
    expect(history.map(h => h.messageId)).toEqual(['ROBOT1.0_recv_2', 'ROBOT1.0_recv_1'])
  })

  it('以最新消息为锚点时取到全部', async () => {
    const history = await store.getHistory(BOT, contact, 'REFIDX_ctx_1', 10)
    expect(history).toHaveLength(3)
    expect(history[0].messageId).toBe('REFIDX_ctx_1')
  })
})

describe('上传缓存与清理', () => {
  const key = 'k\x1fa'
  const expired = 'k\x1fb'

  it('未过期的可读回，已过期的直接不命中', async () => {
    await store.setUploadCache(key, '{"file_info":"FI"}', now + 3600_000)
    await store.setUploadCache(expired, '{"file_info":"X"}', now - 1)
    expect(await store.getUploadCache(key)).toBe('{"file_info":"FI"}')
    expect(await store.getUploadCache(expired)).toBeNull()
  })

  it('清理删掉过期行、保住有效行', async () => {
    await store.cleanupExpired()
    expect(await store.getUploadCache(key)).toBe('{"file_info":"FI"}')
    expect(await chkGet('SELECT 1 AS f FROM qqbot_upload_cache WHERE cache_key=?', [expired])).toBeUndefined()
  })
})

describe('写入语义', () => {
  it('超过 TTL 的消息直接不入库', async () => {
    await store.save(BOT, msg('ROBOT1.0_old', now - 48 * 3600_000, [text('过期')]), {})
    expect(await store.get(BOT, 'ROBOT1.0_old')).toBeNull()
  })

  it('同 ID 重复保存走更新，不产生重复行', async () => {
    await store.save(BOT, msg('ROBOT1.0_recv_1', now - 5000, [text('更新后')]), {
      refIdx: 'REFIDX_recv_1',
      level: 'standard',
    })
    const updated = await store.get(BOT, 'ROBOT1.0_recv_1')
    expect(updated?.elements[0]).toMatchObject({ text: '更新后' })
    const dup = await chkGet("SELECT COUNT(*) AS n FROM qqbot_messages WHERE msg_id='ROBOT1.0_recv_1'")
    expect(dup?.n).toBe(1)
  })

  it('更新后 ref_idx 仍然保留', async () => {
    expect(await store.resolveRefIdx(BOT, contact, 'ROBOT1.0_recv_1')).toBe('REFIDX_recv_1')
  })
})
