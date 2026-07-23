/**
 * MessageStore 集成测试：v1 旧库迁移 + 全公开 API + 读写一致性。
 *
 * karinPathBase 跟随 cwd，因此先切换到系统临时目录再导入 store，
 * 数据库与配置全部落在沙箱内，不污染仓库。
 */
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repo = dirname(dirname(fileURLToPath(import.meta.url)))
const sandbox = mkdtempSync(join(tmpdir(), 'qqbot-store-test-'))
process.chdir(sandbox)

const require = createRequire(join(repo, 'package.json'))
const sqlite3 = require('node-karin/sqlite3').default ?? require('node-karin/sqlite3')
process.env.TSX_TSCONFIG_PATH = join(repo, 'tsconfig.json')
const { register } = require('tsx/esm/api')
register()

const assert = (cond, msg) => { if (!cond) { console.error('ASSERT FAIL: ' + msg); process.exit(1) } }

// ---------- 1. 预置一个 v1 (2.2.1) 旧库，验证迁移 ----------
const dbFile = join(sandbox, '@karinjs', '@karinjs-adapter-qqbot', 'data', 'message-cache.db')
mkdirSync(dirname(dbFile), { recursive: true })

const rawDb = await new Promise((res, rej) => { const d = new sqlite3.Database(dbFile, e => e ? rej(e) : res(d)) })
const rawRun = (sql, p = []) => new Promise((res, rej) => rawDb.run(sql, p, e => e ? rej(new Error(e.message + '\n' + sql)) : res()))

await rawRun('CREATE TABLE qqbot_bots (id INTEGER PRIMARY KEY, bot_id TEXT NOT NULL UNIQUE)')
await rawRun(`CREATE TABLE qqbot_contacts (id INTEGER PRIMARY KEY, bot_ref INTEGER NOT NULL,
  scene TEXT NOT NULL, peer TEXT NOT NULL, sub_peer TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '', sub_name TEXT NOT NULL DEFAULT '',
  UNIQUE(bot_ref, scene, peer, sub_peer))`)
await rawRun(`CREATE TABLE qqbot_senders (id INTEGER PRIMARY KEY, bot_ref INTEGER NOT NULL,
  user_id TEXT NOT NULL, nick TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member', UNIQUE(bot_ref, user_id, nick, name, role))`)
await rawRun(`CREATE TABLE qqbot_messages (id INTEGER PRIMARY KEY, bot_ref INTEGER NOT NULL,
  contact_ref INTEGER NOT NULL, sender_ref INTEGER NOT NULL, message_id TEXT NOT NULL,
  message_seq INTEGER NOT NULL DEFAULT 0, time INTEGER NOT NULL,
  UNIQUE(bot_ref, contact_ref, message_id))`)
await rawRun(`CREATE TABLE qqbot_message_elements (message_ref INTEGER NOT NULL,
  element_index INTEGER NOT NULL, element_type TEXT NOT NULL, value TEXT NOT NULL,
  PRIMARY KEY (message_ref, element_index)) WITHOUT ROWID`)
await rawRun(`CREATE TABLE qqbot_message_aliases (bot_ref INTEGER NOT NULL, contact_ref INTEGER NOT NULL,
  alias_message_id TEXT NOT NULL, message_ref INTEGER NOT NULL,
  PRIMARY KEY (bot_ref, contact_ref, alias_message_id)) WITHOUT ROWID`)
await rawRun("INSERT INTO qqbot_bots (bot_id) VALUES ('999')")
await rawRun("INSERT INTO qqbot_messages VALUES (1, 1, 1, 1, 'OLD_MSG', 0, 123)")
await rawRun('PRAGMA user_version = 1')
await new Promise(res => rawDb.close(res))

// ---------- 2. 实例化真实 MessageStore ----------
const src = name => pathToFileURL(join(repo, 'src', name)).href
const { MessageStore } = await import(src('core/storage/message-store/store.ts'))
const store = new MessageStore()
const bot = '102099999'
const contact = { scene: 'group', peer: 'GROUP_OPENID_1', name: '测试群' }
const contact2 = { scene: 'friend', peer: 'USER_OPENID_9', name: '' }
const sender = { userId: 'U_OPENID_1', nick: '张三', name: '', role: 'member' }
const now = Date.now()

const msg = (id, time, elements) => ({ messageId: id, messageSeq: 0, time, contact, sender, elements })
const text = t => ({ type: 'text', text: t })

await store.save(bot, msg('ROBOT1.0_recv_1', now - 5000, [text('第一条'), { type: 'markdown', markdown: '# md' }]), {
  refIdx: 'REFIDX_recv_1', level: 'standard',
})
await store.save(bot, msg('ROBOT1.0_recv_2', now - 4000, [text('第二条'), { type: 'reply', messageId: 'REFIDX_recv_1' }]), {
  refIdx: 'REFIDX_recv_2', level: 'minimal',
})
await store.save(bot, {
  messageId: 'ROBOT1.0_self_1', messageSeq: 0, time: now - 3000, contact: contact2,
  sender: { userId: 'BOT', nick: 'bot', name: '' },
  elements: [{ type: 'markdown', markdown: '**self**' }],
}, { refIdx: 'REFIDX_self_1', isSelf: true, level: 'full' })
await store.saveReferenceIfAbsent(bot, msg('REFIDX_ctx_1', now - 2000, [text('被引用的旧消息')]))

// ---------- 3. 迁移结果断言 ----------
const chk = await new Promise((res, rej) => { const d = new sqlite3.Database(dbFile, e => e ? rej(e) : res(d)) })
const chkGet = (sql, p = []) => new Promise((res, rej) => chk.get(sql, p, (e, r) => e ? rej(e) : res(r)))
const chkAll = (sql, p = []) => new Promise((res, rej) => chk.all(sql, p, (e, r) => e ? rej(e) : res(r)))

// get() 会排空写队列，顺带保证上面的写都已落库
const got1 = await store.get(bot, 'ROBOT1.0_recv_1')
assert(got1 && got1.elements.length === 1 && got1.elements[0].text === '第一条', 'standard 级丢弃 markdown，保留 text: ' + JSON.stringify(got1?.elements))
assert(got1.contact.scene === 'group' && got1.contact.peer === 'GROUP_OPENID_1', 'contact 还原')
assert(got1.sender.nick === '张三', 'sender 还原')

const ver = await chkGet('PRAGMA user_version')
assert(ver.user_version === 3, '迁移后 user_version=3, got ' + ver.user_version)
const oldTable = await chkGet("SELECT 1 AS f FROM sqlite_master WHERE name='qqbot_bots'")
assert(oldTable === undefined, 'v1 旧表已删除')
const cols = (await chkAll('PRAGMA table_info(qqbot_messages)')).map(c => c.name)
assert(cols.includes('msg_id_hash') && cols.includes('is_self'), 'v2 新列存在: ' + cols.join(','))
const av = await chkGet('PRAGMA auto_vacuum')
assert(av.auto_vacuum === 2, 'auto_vacuum=INCREMENTAL, got ' + JSON.stringify(av))
const oldRow = await chkGet("SELECT 1 AS f FROM qqbot_messages WHERE msg_id='OLD_MSG'")
assert(oldRow === undefined, 'v1 旧数据不保留')

// ---------- 4. 查询链路断言 ----------
const byRef = await store.get(bot, 'REFIDX_recv_1', contact)
assert(byRef?.messageId === 'ROBOT1.0_recv_1', 'REFIDX 查到原消息')
const got2 = await store.get(bot, 'ROBOT1.0_recv_2')
assert(got2.elements.length === 1 && got2.elements[0].type === 'reply', 'minimal 只保留 reply: ' + JSON.stringify(got2.elements))
const gotSelf = await store.get(bot, 'ROBOT1.0_self_1', contact2)
assert(gotSelf?.elements[0]?.markdown === '**self**', 'full 保留 markdown')
const gotCtx = await store.get(bot, 'REFIDX_ctx_1', contact)
assert(gotCtx?.elements[0]?.text === '被引用的旧消息', '引用上下文可查')
const apiId = await store.resolveApiMessageId(bot, contact, 'REFIDX_recv_2')
assert(apiId === 'ROBOT1.0_recv_2', 'resolveApiMessageId: ' + apiId)
const refIdx = await store.resolveRefIdx(bot, contact2, 'ROBOT1.0_self_1')
assert(refIdx === 'REFIDX_self_1', 'resolveRefIdx: ' + refIdx)
assert(await store.isSelfMessage(bot, contact2, 'ROBOT1.0_self_1') === true, 'isSelfMessage true')
assert(await store.isSelfMessage(bot, contact, 'ROBOT1.0_recv_1') === false, 'isSelfMessage false')

// 历史：从锚点向更早取（含锚点），比锚点新的 ctx_1 不应出现
const history = await store.getHistory(bot, contact, 'ROBOT1.0_recv_2', 10)
assert(history.length === 2 && history[0].messageId === 'ROBOT1.0_recv_2' && history[1].messageId === 'ROBOT1.0_recv_1',
  `history 锚点向前 2 条倒序: ${history.map(h => h.messageId).join(',')}`)
const historyAll = await store.getHistory(bot, contact, 'REFIDX_ctx_1', 10)
assert(historyAll.length === 3 && historyAll[0].messageId === 'REFIDX_ctx_1',
  `history 全量 3 条: ${historyAll.map(h => h.messageId).join(',')}`)

assert(await store.get(bot, 'ROBOT1.0_nope') === null, '未命中返回 null')
assert(await store.get('other_bot', 'ROBOT1.0_recv_1') === null, 'bot 隔离')

// ---------- 5. 上传缓存 + 清理 ----------
await store.setUploadCache('k\x1fa', '{"file_info":"FI"}', now + 3600_000)
assert(await store.getUploadCache('k\x1fa') === '{"file_info":"FI"}', 'upload cache roundtrip')
await store.setUploadCache('k\x1fb', '{"file_info":"X"}', now - 1)
assert(await store.getUploadCache('k\x1fb') === null, '过期 upload 未命中')
await store.cleanupExpired()
assert(await store.getUploadCache('k\x1fa') === '{"file_info":"FI"}', '清理后有效 upload 保留')
const gone = await chkGet("SELECT 1 AS f FROM qqbot_upload_cache WHERE cache_key='k\x1fb'")
assert(gone === undefined, '清理删除过期 upload 行')

await store.save(bot, msg('ROBOT1.0_old', now - 48 * 3600_000, [text('过期')]), {})
assert(await store.get(bot, 'ROBOT1.0_old') === null, '过期消息不可查')

// 重复保存走更新而非重复行，且 COALESCE 保留 ref_idx
await store.save(bot, msg('ROBOT1.0_recv_1', now - 5000, [text('更新后')]), { refIdx: 'REFIDX_recv_1', level: 'standard' })
const updated = await store.get(bot, 'ROBOT1.0_recv_1')
assert(updated.elements[0].text === '更新后', '重复保存走更新')
const dup = await chkGet("SELECT COUNT(*) AS n FROM qqbot_messages WHERE msg_id='ROBOT1.0_recv_1'")
assert(dup.n === 1, '无重复行: ' + dup.n)
const stillRef = await store.resolveRefIdx(bot, contact, 'ROBOT1.0_recv_1')
assert(stillRef === 'REFIDX_recv_1', '更新后 ref_idx 保留')

// 沙箱清理（Windows 上 db 句柄未关时可能失败，忽略）
try {
  process.chdir(tmpdir())
  rmSync(sandbox, { recursive: true, force: true })
} catch { /* best effort */ }

console.log('PASS store')
process.exit(0)
