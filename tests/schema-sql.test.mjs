/**
 * v3 schema 与 SQL 语句测试：真实 sqlite3 建库，执行 store 使用的全部语句，
 * 并用 EXPLAIN QUERY PLAN 断言 hash / history 索引命中。
 */
import { createRequire } from 'node:module'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repo = dirname(dirname(fileURLToPath(import.meta.url)))
const require = createRequire(join(repo, 'package.json'))
const sqlite3 = require('node-karin/sqlite3').default ?? require('node-karin/sqlite3')
process.env.TSX_TSCONFIG_PATH = join(repo, 'tsconfig.json')
const { register } = require('tsx/esm/api')
register()

const src = name => pathToFileURL(join(repo, 'src/core/storage/message-store', name)).href
const { SQL } = await import(src('sql.ts'))
const { createSchema, createUploadCacheSchema, dropLegacySchema } = await import(src('schema.ts'))
const { hashId } = await import(src('hash.ts'))

const file = join(mkdtempSync(join(tmpdir(), 'qqbot-test-')), 'test.db')
const db = await new Promise((resolve, reject) => {
  const d = new sqlite3.Database(file, err => err ? reject(err) : resolve(d))
})
const run = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, e => e ? rej(new Error(`${e.message}\nSQL: ${sql}`)) : res()))
const get = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (e, r) => e ? rej(new Error(`${e.message}\nSQL: ${sql}`)) : res(r)))
const all = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, r) => e ? rej(new Error(`${e.message}\nSQL: ${sql}`)) : res(r)))

const assert = (cond, msg) => { if (!cond) { console.error('ASSERT FAIL: ' + msg); process.exit(1) } }

await run('PRAGMA journal_mode = WAL')
await run('PRAGMA auto_vacuum = INCREMENTAL')
await dropLegacySchema(run)
await run('VACUUM')
await createSchema(run)
await createUploadCacheSchema(run)

const bot = '102000001'
const now = Date.now()
const TTL = 24 * 60 * 60 * 1000

await run(SQL.upsertContact, [bot, 'group', 'G1', '', '群名', ''])
const contact = await get(SQL.selectContactId, [bot, 'group', 'G1', ''])
assert(contact?.id, 'contact id')
await run(SQL.upsertSender, [bot, 'U1', 'nick', '', 'member'])
const sender = await get(SQL.selectSenderId, [bot, 'U1', 'nick', '', 'member'])
assert(sender?.id, 'sender id')

const msgId = 'ROBOT1.0_abcdefghijklmnopqrstuvwxyz0123456789ABCD'
const refIdx = 'REFIDX_1234567890abcdefghijklmnopqrstuvwxyz'
const elements = JSON.stringify([{ c: 't', v: 'hello' }, { c: 'i', v: 'media://image/aa.jpg', w: 100, h: 200 }])
await run(SQL.insertMessage, [contact.id, sender.id, msgId, hashId(msgId), refIdx, hashId(refIdx), null, now, 0, 0, 1, elements])

let row = await get(SQL.selectByMsgId, [hashId(msgId), bot, msgId])
assert(row?.msg_id === msgId, 'selectByMsgId')
assert(row.contact_ref === contact.id, 'contact_ref present')
row = await get(SQL.selectByMsgIdScoped, [hashId(msgId), bot, 'group', 'G1', '', msgId])
assert(row?.msg_id === msgId, 'selectByMsgIdScoped')
row = await get(SQL.selectByRefIdx, [hashId(refIdx), bot, refIdx])
assert(row?.msg_id === msgId, 'selectByRefIdx')
row = await get(SQL.selectByRefIdxScoped, [hashId(refIdx), bot, 'group', 'G1', '', refIdx])
assert(row?.msg_id === msgId, 'selectByRefIdxScoped')

const idRow = await get(SQL.selectMessageIdByMsgId, [hashId(msgId), contact.id, msgId])
assert(idRow?.id, 'selectMessageIdByMsgId')
const refRow = await get(SQL.selectMessageIdByRefIdx, [hashId(refIdx), contact.id, refIdx])
assert(refRow?.id === idRow.id, 'selectMessageIdByRefIdx')
await run(SQL.updateMessage, [sender.id, null, null, 'REFIDX_reply_target', now + 1, 1, 1, elements, idRow.id])
row = await get(SQL.selectByMsgId, [hashId(msgId), bot, msgId])
assert(row.is_self === 1 && row.reply_to === 'REFIDX_reply_target' && row.ref_idx === refIdx, 'update preserves refIdx via COALESCE')

for (let i = 0; i < 5; i++) {
  const id = `ROBOT1.0_hist${i}`
  await run(SQL.insertMessage, [contact.id, sender.id, id, hashId(id), null, null, null, now + 10 + i, 0, 0, 0, '[]'])
}
const anchor = await get(SQL.selectByMsgId, [hashId('ROBOT1.0_hist4'), bot, 'ROBOT1.0_hist4'])
const history = await all(SQL.selectHistory, [contact.id, anchor.time, anchor.time, anchor.message_ref, 3])
assert(history.length === 3 && history[0].msg_id === 'ROBOT1.0_hist4', `history: got ${history.length} first=${history[0]?.msg_id}`)

const remote = await all(SQL.selectRemoteMedia, [now - 1000, 500])
assert(remote.length === 1 && remote[0].msg_id === msgId, 'selectRemoteMedia hits has_remote_media=1, got ' + remote.length)

await run(SQL.clearRefIdx, [idRow.id])
row = await get(SQL.selectByRefIdx, [hashId(refIdx), bot, refIdx])
assert(row === undefined, 'refIdx cleared')

await run(SQL.cleanup, [now - TTL])
let count = await get(SQL.countMessages)
assert(count.total === 6, 'count after ttl cleanup = 6, got ' + count.total)
await run(SQL.deleteOverCap, [2])
count = await get(SQL.countMessages)
assert(count.total === 4, 'count after cap delete = 4, got ' + count.total)
await run(SQL.gcSenders)
const senderStill = await get(SQL.selectSenderId, [bot, 'U1', 'nick', '', 'member'])
assert(senderStill?.id, 'referenced sender survives GC')
await run('DELETE FROM qqbot_messages')
await run(SQL.gcSenders)
const senderGone = await get(SQL.selectSenderId, [bot, 'U1', 'nick', '', 'member'])
assert(senderGone === undefined, 'orphan sender GCed')

await run(SQL.upsertUpload, ['k1', '{"file_info":"a"}', 0, now])
await run(SQL.upsertUpload, ['k2', '{"file_info":"b"}', now - 1, now + 1])
await run(SQL.upsertUpload, ['k1', '{"file_info":"a2"}', now + 60000, now + 2])
let upload = await get(SQL.selectUpload, ['k1'])
assert(upload?.response === '{"file_info":"a2"}' && upload.expires_at === now + 60000, 'upload upsert overwrites')
await run(SQL.cleanupUploads, [now])
upload = await get(SQL.selectUpload, ['k2'])
assert(upload === undefined, 'expired upload cleaned')
upload = await get(SQL.selectUpload, ['k1'])
assert(upload?.response === '{"file_info":"a2"}', 'valid upload survives cleanup')
let uploadCount = await get(SQL.countUploads)
assert(uploadCount.total === 1, 'upload count')
await run(SQL.deleteUploadsOverCap, [1])
uploadCount = await get(SQL.countUploads)
assert(uploadCount.total === 0, 'upload cap delete')

await run('PRAGMA incremental_vacuum')
await get('PRAGMA wal_checkpoint(TRUNCATE)')

const plan = await all(`EXPLAIN QUERY PLAN ${SQL.selectByMsgId}`, [1, 'b', 'm'])
const planText = plan.map(p => p.detail).join(' | ')
assert(planText.includes('idx_qqbot_messages_msg_hash'), 'msg hash index used: ' + planText)
const planRef = await all(`EXPLAIN QUERY PLAN ${SQL.selectByRefIdx}`, [1, 'b', 'r'])
const planRefText = planRef.map(p => p.detail).join(' | ')
assert(planRefText.includes('idx_qqbot_messages_ref_hash'), 'ref hash index used: ' + planRefText)
const planHist = await all(`EXPLAIN QUERY PLAN ${SQL.selectHistory}`, [1, 2, 2, 3, 4])
const planHistText = planHist.map(p => p.detail).join(' | ')
assert(planHistText.includes('idx_qqbot_messages_history'), 'history index used: ' + planHistText)

console.log('PASS schema-sql')
process.exit(0)
