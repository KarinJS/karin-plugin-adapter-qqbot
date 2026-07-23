/**
 * 消息主表查询字段。
 *
 * 长 ID 只在 `qqbot_messages` 存一份原文；查询统一走整数 hash 索引，
 * 命中后由调用方比对原文防碰撞。
 */
const messageSelectFields = `
  m.id AS message_ref,
  m.contact_ref,
  c.bot_id,
  m.msg_id,
  m.ref_idx,
  m.reply_to,
  m.time,
  m.is_self,
  m.elements,
  c.scene,
  c.peer,
  c.sub_peer,
  c.name AS contact_name,
  c.sub_name AS contact_sub_name,
  s.user_id AS sender_user_id,
  s.nick AS sender_nick,
  s.name AS sender_name,
  s.role AS sender_role`

const messageJoins = `
  FROM qqbot_messages m
  JOIN qqbot_contacts c ON c.id = m.contact_ref
  JOIN qqbot_senders s ON s.id = m.sender_ref`

export const SQL = {
  upsertContact: `INSERT INTO qqbot_contacts (bot_id, scene, peer, sub_peer, name, sub_name)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(bot_id, scene, peer, sub_peer) DO UPDATE SET
      name = excluded.name,
      sub_name = excluded.sub_name`,
  selectContactId: `SELECT id FROM qqbot_contacts
    WHERE bot_id = ? AND scene = ? AND peer = ? AND sub_peer = ?`,
  upsertSender: `INSERT INTO qqbot_senders (bot_id, user_id, nick, name, role)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(bot_id, user_id, nick, name, role) DO NOTHING`,
  selectSenderId: `SELECT id FROM qqbot_senders
    WHERE bot_id = ? AND user_id = ? AND nick = ? AND name = ? AND role = ?`,

  /** 写入侧按 hash 定位既有行；同一 flush 循环串行执行，无并发写竞争。 */
  selectMessageIdByMsgId: `SELECT id FROM qqbot_messages
    WHERE msg_id_hash = ? AND contact_ref = ? AND msg_id = ?`,
  selectMessageIdByRefIdx: `SELECT id FROM qqbot_messages
    WHERE ref_idx_hash = ? AND ref_idx_hash IS NOT NULL AND contact_ref = ? AND ref_idx = ?`,
  insertMessage: `INSERT INTO qqbot_messages (
    contact_ref, sender_ref, msg_id, msg_id_hash, ref_idx, ref_idx_hash,
    reply_to, time, is_self, is_ref_context, has_remote_media, elements
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  updateMessage: `UPDATE qqbot_messages SET
    sender_ref = ?,
    ref_idx = COALESCE(?, ref_idx),
    ref_idx_hash = COALESCE(?, ref_idx_hash),
    reply_to = ?,
    time = ?,
    is_self = ?,
    has_remote_media = ?,
    elements = ?
    WHERE id = ?`,

  selectByMsgId: `SELECT ${messageSelectFields} ${messageJoins}
    WHERE m.msg_id_hash = ? AND c.bot_id = ? AND m.msg_id = ?
    LIMIT 1`,
  selectByMsgIdScoped: `SELECT ${messageSelectFields} ${messageJoins}
    WHERE m.msg_id_hash = ? AND c.bot_id = ? AND c.scene = ? AND c.peer = ? AND c.sub_peer = ?
      AND m.msg_id = ?
    LIMIT 1`,
  selectByRefIdx: `SELECT ${messageSelectFields} ${messageJoins}
    WHERE m.ref_idx_hash = ? AND m.ref_idx_hash IS NOT NULL AND c.bot_id = ? AND m.ref_idx = ?
    LIMIT 1`,
  selectByRefIdxScoped: `SELECT ${messageSelectFields} ${messageJoins}
    WHERE m.ref_idx_hash = ? AND m.ref_idx_hash IS NOT NULL
      AND c.bot_id = ? AND c.scene = ? AND c.peer = ? AND c.sub_peer = ?
      AND m.ref_idx = ?
    LIMIT 1`,
  /** 清除指向错误消息的引用索引（历史缓存中 alias 污染的兜底）。 */
  clearRefIdx: 'UPDATE qqbot_messages SET ref_idx = NULL, ref_idx_hash = NULL WHERE id = ?',

  selectHistory: `SELECT ${messageSelectFields} ${messageJoins}
    WHERE m.contact_ref = ?
      AND (m.time < ? OR (m.time = ? AND m.id <= ?))
    ORDER BY m.time DESC, m.id DESC
    LIMIT ?`,
  selectRemoteMedia: `SELECT ${messageSelectFields} ${messageJoins}
    WHERE m.has_remote_media = 1 AND m.time > ?
    ORDER BY m.time DESC
    LIMIT ?`,

  cleanup: 'DELETE FROM qqbot_messages WHERE time <= ?',
  countMessages: 'SELECT COUNT(*) AS total FROM qqbot_messages',
  /** 超过硬上限时删除最旧的行；id 单调递增，等价于按写入顺序删除。 */
  deleteOverCap: `DELETE FROM qqbot_messages WHERE id IN (
    SELECT id FROM qqbot_messages ORDER BY id ASC LIMIT ?
  )`,
  /** 清理不再被任何消息引用的 sender 行，避免昵称变化导致的永久膨胀。 */
  gcSenders: `DELETE FROM qqbot_senders WHERE id NOT IN (
    SELECT DISTINCT sender_ref FROM qqbot_messages
  )`,

  selectUpload: 'SELECT response, expires_at FROM qqbot_upload_cache WHERE cache_key = ?',
  upsertUpload: `INSERT INTO qqbot_upload_cache (cache_key, response, expires_at, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(cache_key) DO UPDATE SET
      response = excluded.response,
      expires_at = excluded.expires_at,
      created_at = excluded.created_at`,
  /** expires_at = 0 表示长期有效，只受行数上限淘汰。 */
  cleanupUploads: 'DELETE FROM qqbot_upload_cache WHERE expires_at != 0 AND expires_at <= ?',
  countUploads: 'SELECT COUNT(*) AS total FROM qqbot_upload_cache',
  deleteUploadsOverCap: `DELETE FROM qqbot_upload_cache WHERE cache_key IN (
    SELECT cache_key FROM qqbot_upload_cache ORDER BY created_at ASC LIMIT ?
  )`,
} as const
