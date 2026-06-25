/**
 * 消息主表查询字段。
 *
 * 主表只保存整数外键，读取时再 JOIN 联系人和发送者映射表，避免在每条消息和每个
 * 消息段上重复写入 bot、群号、用户 ID 等长字符串。
 */
export const messageSelectFields = (): string => `
  m.id AS message_ref,
  m.bot_ref,
  m.contact_ref,
  m.sender_ref,
  b.bot_id,
  m.message_id,
  m.message_seq,
  m.time,
  c.scene,
  c.peer,
  c.sub_peer,
  c.name AS contact_name,
  c.sub_name AS contact_sub_name,
  s.user_id AS sender_user_id,
  s.nick AS sender_nick,
  s.name AS sender_name,
  s.role AS sender_role`

export const SQL = {
  insertBot: 'INSERT INTO qqbot_bots (bot_id) VALUES (?) ON CONFLICT(bot_id) DO NOTHING',
  selectBotId: 'SELECT id FROM qqbot_bots WHERE bot_id = ?',
  upsertContact: `INSERT INTO qqbot_contacts (bot_ref, scene, peer, sub_peer, name, sub_name)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(bot_ref, scene, peer, sub_peer) DO UPDATE SET
      name = excluded.name,
      sub_name = excluded.sub_name`,
  selectContactId: `SELECT id FROM qqbot_contacts
    WHERE bot_ref = ? AND scene = ? AND peer = ? AND sub_peer = ?`,
  upsertSender: `INSERT INTO qqbot_senders (bot_ref, user_id, nick, name, role)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(bot_ref, user_id, nick, name, role) DO NOTHING`,
  selectSenderId: `SELECT id FROM qqbot_senders
    WHERE bot_ref = ? AND user_id = ? AND nick = ? AND name = ? AND role = ?`,
  upsertMessage: `INSERT INTO qqbot_messages (
    bot_ref, contact_ref, sender_ref, message_id, message_seq, time
  ) VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(bot_ref, contact_ref, message_id) DO UPDATE SET
    sender_ref = excluded.sender_ref,
    message_seq = excluded.message_seq,
    time = excluded.time`,
  selectMessageRef: `SELECT id FROM qqbot_messages
    WHERE bot_ref = ? AND contact_ref = ? AND message_id = ?`,
  deleteElements: 'DELETE FROM qqbot_message_elements WHERE message_ref = ?',
  insertElement: `INSERT INTO qqbot_message_elements (
    message_ref, element_index, element_type, value
  ) VALUES (?, ?, ?, ?)`,
  insertAlias: `INSERT INTO qqbot_message_aliases (
    bot_ref, contact_ref, alias_message_id, message_ref
  ) VALUES (?, ?, ?, ?)
  ON CONFLICT(bot_ref, contact_ref, alias_message_id) DO UPDATE SET
    message_ref = excluded.message_ref`,
  selectMessage: `SELECT ${messageSelectFields()}
    FROM qqbot_messages m
    JOIN qqbot_bots b ON b.id = m.bot_ref
    JOIN qqbot_contacts c ON c.id = m.contact_ref
    JOIN qqbot_senders s ON s.id = m.sender_ref
    WHERE b.bot_id = ? AND c.scene = ? AND c.peer = ? AND c.sub_peer = ? AND m.message_id = ?`,
  selectMessageById: `SELECT ${messageSelectFields()}
    FROM qqbot_messages m
    JOIN qqbot_bots b ON b.id = m.bot_ref
    JOIN qqbot_contacts c ON c.id = m.contact_ref
    JOIN qqbot_senders s ON s.id = m.sender_ref
    WHERE b.bot_id = ? AND m.message_id = ?
    LIMIT 1`,
  selectMessageByRef: `SELECT ${messageSelectFields()}
    FROM qqbot_messages m
    JOIN qqbot_bots b ON b.id = m.bot_ref
    JOIN qqbot_contacts c ON c.id = m.contact_ref
    JOIN qqbot_senders s ON s.id = m.sender_ref
    WHERE m.id = ?`,
  selectElements: `SELECT element_index, element_type, value
    FROM qqbot_message_elements
    WHERE message_ref = ?
    ORDER BY element_index ASC`,
  selectAlias: `SELECT a.message_ref
    FROM qqbot_message_aliases a
    JOIN qqbot_bots b ON b.id = a.bot_ref
    JOIN qqbot_contacts c ON c.id = a.contact_ref
    WHERE b.bot_id = ? AND c.scene = ? AND c.peer = ? AND c.sub_peer = ? AND a.alias_message_id = ?`,
  selectAliasById: `SELECT a.message_ref
    FROM qqbot_message_aliases a
    JOIN qqbot_bots b ON b.id = a.bot_ref
    WHERE b.bot_id = ? AND a.alias_message_id = ?
    LIMIT 1`,
  deleteAlias: `DELETE FROM qqbot_message_aliases
    WHERE bot_ref = (SELECT id FROM qqbot_bots WHERE bot_id = ?)
      AND contact_ref = (
        SELECT id FROM qqbot_contacts
        WHERE bot_ref = (SELECT id FROM qqbot_bots WHERE bot_id = ?)
          AND scene = ? AND peer = ? AND sub_peer = ?
      )
      AND alias_message_id = ?`,
  hasReply: `SELECT 1 AS found FROM qqbot_message_elements
    WHERE message_ref = ? AND element_type = 'reply' AND value = ?
    LIMIT 1`,
  cleanup: 'DELETE FROM qqbot_messages WHERE time <= ?',
} as const
