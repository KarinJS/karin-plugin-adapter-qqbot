/**
 * v3 schema 与 SQL 语句：真实 sqlite3 建库，执行 store 使用的全部语句，
 * 并用 EXPLAIN QUERY PLAN 断言 hash / history 索引命中。
 *
 * 各 describe 之间共享同一个库且**顺序相关**：清理与配额会删数据，必须排在查询之后。
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sqlite3 from 'node-karin/sqlite3'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hashId } from '@/core/storage/message-store/hash'
import { createSchema, createUploadCacheSchema, dropLegacySchema } from '@/core/storage/message-store/schema'
import { SQL } from '@/core/storage/message-store/sql'

const BOT = '102000001'
const TTL = 24 * 60 * 60 * 1000
const MSG_ID = 'ROBOT1.0_abcdefghijklmnopqrstuvwxyz0123456789ABCD'
const REF_IDX = 'REFIDX_1234567890abcdefghijklmnopqrstuvwxyz'
const ELEMENTS = JSON.stringify([
  { c: 't', v: 'hello' },
  { c: 'i', v: 'media://image/aa.jpg', w: 100, h: 200 },
])

let dir: string
let db: any
let run: (sql: string, params?: unknown[]) => Promise<void>
let get: <T = any>(sql: string, params?: unknown[]) => Promise<T | undefined>
let all: <T = any>(sql: string, params?: unknown[]) => Promise<T[]>

let now = 0
let contactId = 0
let senderId = 0
let messageId = 0

/** 把 EXPLAIN QUERY PLAN 的多行输出压成一行，便于断言索引名。 */
const planOf = async (sql: string, params: unknown[]) => {
  const rows = await all<{ detail: string }>(`EXPLAIN QUERY PLAN ${sql}`, params)
  return rows.map(row => row.detail).join(' | ')
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'qqbot-schema-test-'))
  db = await new Promise((resolve, reject) => {
    const handle = new sqlite3.Database(join(dir, 'test.db'), (err: Error | null) => {
      err ? reject(err) : resolve(handle)
    })
  })

  const fail = (err: Error, sql: string) => new Error(`${err.message}\nSQL: ${sql}`)
  run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, (err: Error | null) => err ? reject(fail(err, sql)) : resolve())
  })
  get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err: Error | null, row: any) => err ? reject(fail(err, sql)) : resolve(row))
  })
  all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err: Error | null, rows: any[]) => err ? reject(fail(err, sql)) : resolve(rows))
  })

  await run('PRAGMA journal_mode = WAL')
  await run('PRAGMA auto_vacuum = INCREMENTAL')
  await dropLegacySchema(run)
  await run('VACUUM')
  await createSchema(run)
  await createUploadCacheSchema(run)

  now = Date.now()

  await run(SQL.upsertContact, [BOT, 'group', 'G1', '', '群名', ''])
  contactId = (await get<{ id: number }>(SQL.selectContactId, [BOT, 'group', 'G1', '']))!.id
  await run(SQL.upsertSender, [BOT, 'U1', 'nick', '', 'member'])
  senderId = (await get<{ id: number }>(SQL.selectSenderId, [BOT, 'U1', 'nick', '', 'member']))!.id

  await run(SQL.insertMessage, [
    contactId, senderId, MSG_ID, hashId(MSG_ID), REF_IDX, hashId(REF_IDX), null, now, 0, 0, 1, ELEMENTS,
  ])
  messageId = (await get<{ id: number }>(SQL.selectMessageIdByMsgId, [hashId(MSG_ID), contactId, MSG_ID]))!.id

  /** 5 条历史消息，时间递增，用于 selectHistory 的锚点分页。 */
  for (let i = 0; i < 5; i++) {
    const id = `ROBOT1.0_hist${i}`
    await run(SQL.insertMessage, [contactId, senderId, id, hashId(id), null, null, null, now + 10 + i, 0, 0, 0, '[]'])
  }
})

afterAll(async () => {
  await new Promise<void>(resolve => db.close(() => resolve()))
  try {
    rmSync(dir, { recursive: true, force: true })
  } catch { /* Windows 上句柄未释放时忽略 */ }
})

describe('建表与 upsert', () => {
  it('contact / sender / message 都能反查主键', () => {
    expect(contactId).toBeGreaterThan(0)
    expect(senderId).toBeGreaterThan(0)
    expect(messageId).toBeGreaterThan(0)
  })
})

describe('四条索引查询路径', () => {
  it('按 msg_id 查询，带出 contact_ref', async () => {
    const row = await get(SQL.selectByMsgId, [hashId(MSG_ID), BOT, MSG_ID])
    expect(row?.msg_id).toBe(MSG_ID)
    expect(row?.contact_ref).toBe(contactId)
  })

  it('按 msg_id + 会话范围查询', async () => {
    const row = await get(SQL.selectByMsgIdScoped, [hashId(MSG_ID), BOT, 'group', 'G1', '', MSG_ID])
    expect(row?.msg_id).toBe(MSG_ID)
  })

  it('按 REFIDX 查询回原消息', async () => {
    const row = await get(SQL.selectByRefIdx, [hashId(REF_IDX), BOT, REF_IDX])
    expect(row?.msg_id).toBe(MSG_ID)
  })

  it('按 REFIDX + 会话范围查询回原消息', async () => {
    const row = await get(SQL.selectByRefIdxScoped, [hashId(REF_IDX), BOT, 'group', 'G1', '', REF_IDX])
    expect(row?.msg_id).toBe(MSG_ID)
  })

  it('msg_id 与 REFIDX 解析到同一行主键', async () => {
    const byRef = await get<{ id: number }>(SQL.selectMessageIdByRefIdx, [hashId(REF_IDX), contactId, REF_IDX])
    expect(byRef?.id).toBe(messageId)
  })
})

describe('更新与引用索引', () => {
  it('updateMessage 用 COALESCE 保住已有 ref_idx', async () => {
    await run(SQL.updateMessage, [senderId, null, null, 'REFIDX_reply_target', now + 1, 1, 1, ELEMENTS, messageId])
    const row = await get(SQL.selectByMsgId, [hashId(MSG_ID), BOT, MSG_ID])
    expect(row.is_self).toBe(1)
    expect(row.reply_to).toBe('REFIDX_reply_target')
    expect(row.ref_idx).toBe(REF_IDX)
  })

  it('clearRefIdx 后 REFIDX 不再命中', async () => {
    await run(SQL.clearRefIdx, [messageId])
    expect(await get(SQL.selectByRefIdx, [hashId(REF_IDX), BOT, REF_IDX])).toBeUndefined()
  })
})

describe('历史分页与远端媒体', () => {
  it('从锚点向更早取，含锚点自身且倒序', async () => {
    const anchor = await get(SQL.selectByMsgId, [hashId('ROBOT1.0_hist4'), BOT, 'ROBOT1.0_hist4'])
    const history = await all(SQL.selectHistory, [contactId, anchor.time, anchor.time, anchor.message_ref, 3])
    expect(history).toHaveLength(3)
    expect(history[0].msg_id).toBe('ROBOT1.0_hist4')
  })

  it('selectRemoteMedia 只捞 has_remote_media=1 的行', async () => {
    const remote = await all(SQL.selectRemoteMedia, [now - 1000, 500])
    expect(remote).toHaveLength(1)
    expect(remote[0].msg_id).toBe(MSG_ID)
  })
})

describe('清理、配额与 GC', () => {
  it('TTL 清理不误删未过期消息', async () => {
    await run(SQL.cleanup, [now - TTL])
    expect((await get(SQL.countMessages)).total).toBe(6)
  })

  it('超出条数上限时从最旧开始删', async () => {
    await run(SQL.deleteOverCap, [2])
    expect((await get(SQL.countMessages)).total).toBe(4)
  })

  it('仍被引用的 sender 不被 GC', async () => {
    await run(SQL.gcSenders)
    expect(await get(SQL.selectSenderId, [BOT, 'U1', 'nick', '', 'member'])).toBeDefined()
  })

  it('没有任何消息引用后 sender 被 GC', async () => {
    await run('DELETE FROM qqbot_messages')
    await run(SQL.gcSenders)
    expect(await get(SQL.selectSenderId, [BOT, 'U1', 'nick', '', 'member'])).toBeUndefined()
  })
})

describe('上传缓存', () => {
  it('同 key 重复 upsert 覆盖响应与过期时间', async () => {
    await run(SQL.upsertUpload, ['k1', '{"file_info":"a"}', 0, now])
    await run(SQL.upsertUpload, ['k2', '{"file_info":"b"}', now - 1, now + 1])
    await run(SQL.upsertUpload, ['k1', '{"file_info":"a2"}', now + 60_000, now + 2])
    const row = await get(SQL.selectUpload, ['k1'])
    expect(row?.response).toBe('{"file_info":"a2"}')
    expect(row?.expires_at).toBe(now + 60_000)
  })

  it('清理只删过期行', async () => {
    await run(SQL.cleanupUploads, [now])
    expect(await get(SQL.selectUpload, ['k2'])).toBeUndefined()
    expect((await get(SQL.selectUpload, ['k1']))?.response).toBe('{"file_info":"a2"}')
    expect((await get(SQL.countUploads)).total).toBe(1)
  })

  it('超出条数上限时按过期时间删', async () => {
    await run(SQL.deleteUploadsOverCap, [1])
    expect((await get(SQL.countUploads)).total).toBe(0)
  })
})

describe('查询计划', () => {
  it('incremental_vacuum 与 wal checkpoint 可执行', async () => {
    await run('PRAGMA incremental_vacuum')
    await expect(get('PRAGMA wal_checkpoint(TRUNCATE)')).resolves.toBeDefined()
  })

  it('msg_id / ref_idx / history 三条查询都命中索引', async () => {
    expect(await planOf(SQL.selectByMsgId, [1, 'b', 'm'])).toContain('idx_qqbot_messages_msg_hash')
    expect(await planOf(SQL.selectByRefIdx, [1, 'b', 'r'])).toContain('idx_qqbot_messages_ref_hash')
    expect(await planOf(SQL.selectHistory, [1, 2, 2, 3, 4])).toContain('idx_qqbot_messages_history')
  })
})
