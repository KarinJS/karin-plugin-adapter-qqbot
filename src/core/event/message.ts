import { convertReferenceToKarin, convertToKarin, getMessageSceneIndex } from './conver'
import {
  karin, segment,
  createGroupMessage, createFriendMessage,
  createGuildMessage, createDirectMessage,
} from 'node-karin'
import { log } from '@/utils/logger'
import type { AdapterQQBot } from '@/core/adapter/base'
import type {
  C2CMsgEvent, DirectMsgEvent, GroupMsgEvent, GuildMsgEvent,
} from '@/types/event'
import type { Contact, ElementTypes, Sender } from 'node-karin'

interface GroupOptions {
  /** AT_MESSAGE 走 true；GROUP_MESSAGE 由 mentions.is_you 自动决定 */
  forceAtSelf: boolean
}

/**
 * 写入 getMsg 热缓存并投递 SQLite 后台队列。
 * 不等待数据库落库，避免缓存特性拖慢 Karin 消息事件下发。
 */
const cacheMessage = (
  client: AdapterQQBot,
  message: {
    messageId: string
    time: number
    contact: Contact
    sender: Sender
    elements: ElementTypes[]
  },
  aliases: string[] = []
) => {
  if (!client.cfg.messageCache.enable) return
  client.messageStore
    .save(String(client.cfg.appId), { ...message, messageSeq: 0 }, aliases)
    .catch(err => log('warn', `[getMsg] 写入消息缓存失败: ${message.messageId}`, err))
}

/** 引用上下文没有正式消息 ID 时，以 QQ 的 `ref_msg_idx` 建立只写入一次的缓存。 */
const cacheReference = (
  client: AdapterQQBot,
  message: {
    messageId: string
    time: number
    contact: Contact
    sender: Sender
    elements: ElementTypes[]
  }
) => {
  if (!client.cfg.messageCache.enable) return
  client.messageStore
    .saveReferenceIfAbsent(String(client.cfg.appId), { ...message, messageSeq: 0 })
    .catch(err => log('warn', `[getMsg] 写入引用上下文失败: ${message.messageId}`, err))
}

/**
 * 群消息（@机器人 / 普通消息合并入口）
 */
export const onGroupMsg = (client: AdapterQQBot, ev: GroupMsgEvent, opts: GroupOptions) => {
  const selfId = client.selfId
  const userId = ev.d.author.member_openid || ev.d.author.id
  const username = ev.d.author.username || ''
  if (userId && username) client.nicknameCache.set(userId, username)
  ev.d.mentions?.forEach((m) => {
    if (m.member_openid && m.username) client.nicknameCache.set(m.member_openid, m.username)
  })
  const contact = karin.contactGroup(ev.d.group_openid || ev.d.group_id)
  // `member_role` 是 QQ 官方在群消息事件中下发的真实身份；旧报文不含时保留为未知。
  const sender = karin.groupSender(userId, ev.d.author.member_role || 'unknown', username)
  const elements = convertToKarin(selfId, ev, client.selfSubId('id'), { forceAtSelf: opts.forceAtSelf })
  const messageIndex = getMessageSceneIndex(ev.d.message_scene, 'msg_idx')
  const referenceIndex = getMessageSceneIndex(ev.d.message_scene, 'ref_msg_idx')

  if (referenceIndex) elements.unshift(segment.reply(referenceIndex))

  const time = Number(new Date(ev.d.timestamp).getTime() || ev.d.timestamp)
  cacheMessage(client, {
    messageId: ev.d.id,
    time,
    contact,
    sender,
    elements,
  }, [messageIndex].filter(id => id && id !== referenceIndex))

  const reference = ev.d.msg_elements?.find(item => item.msg_idx === referenceIndex)
  if (reference && referenceIndex) {
    cacheReference(client, {
      messageId: referenceIndex,
      time,
      contact,
      sender: karin.groupSender('', 'member', reference.author?.username || ''),
      elements: convertReferenceToKarin(selfId, ev, client.selfSubId('id'), reference),
    })
  }

  const e = createGroupMessage({
    bot: client,
    elements,
    eventId: ev.id,
    messageId: ev.d.id,
    messageSeq: 0,
    rawEvent: ev,
    time,
    contact,
    sender,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(ev.d.id)]),
  })

  return e
}

/**
 * 单聊消息
 */
export const onFriendMsg = (client: AdapterQQBot, ev: C2CMsgEvent) => {
  const selfId = client.selfId
  const userId = ev.d.author.user_openid || ev.d.author.id
  const username = ev.d.author.username || ''
  if (userId && username) client.nicknameCache.set(userId, username)
  const contact = karin.contactFriend(userId)
  const sender = karin.friendSender(userId, username)
  const elements = convertToKarin(selfId, ev, client.selfSubId('id'))
  const messageIndex = getMessageSceneIndex(ev.d.message_scene, 'msg_idx')
  const referenceIndex = getMessageSceneIndex(ev.d.message_scene, 'ref_msg_idx')

  if (referenceIndex) elements.unshift(segment.reply(referenceIndex))

  const time = Number(new Date(ev.d.timestamp).getTime() || ev.d.timestamp)
  cacheMessage(client, {
    messageId: ev.d.id,
    time,
    contact,
    sender,
    elements,
  }, [messageIndex].filter(id => id && id !== referenceIndex))

  const reference = ev.d.msg_elements?.find(item => item.msg_idx === referenceIndex)
  if (reference && referenceIndex) {
    cacheReference(client, {
      messageId: referenceIndex,
      time,
      contact,
      sender: karin.friendSender('', reference.author?.username || ''),
      elements: convertReferenceToKarin(selfId, ev, client.selfSubId('id'), reference),
    })
  }

  const e = createFriendMessage({
    bot: client,
    elements,
    eventId: ev.id,
    messageId: ev.d.id,
    messageSeq: 0,
    rawEvent: ev,
    time,
    contact,
    sender,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(ev.d.id)]),
  })

  return e
}

/**
 * 频道消息
 */
export const onChannelMsg = (client: AdapterQQBot, ev: GuildMsgEvent) => {
  const selfId = client.selfId
  const userId = ev.d.author.id
  const contact = karin.contact('guild', ev.d.guild_id, ev.d.channel_id)
  const sender = karin.groupSender(userId, 'unknown', ev.d.author.username || '')
  const elements = convertToKarin(selfId, ev, client.selfSubId('id'))
  const time = Number(new Date(ev.d.timestamp).getTime() || ev.d.timestamp)
  cacheMessage(client, {
    messageId: ev.d.id,
    time,
    contact,
    sender,
    elements,
  })

  const e = createGuildMessage({
    bot: client,
    elements,
    eventId: ev.id,
    messageId: ev.d.id,
    messageSeq: 0,
    rawEvent: ev,
    time,
    contact,
    sender,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(ev.d.id)]),
  })

  return e
}

/**
 * 频道私信
 */
export const onDirectMsg = (client: AdapterQQBot, ev: DirectMsgEvent) => {
  const selfId = client.selfId
  const userId = ev.d.author.id
  const contact = karin.contact('direct', ev.d.guild_id, ev.d.channel_id)
  const sender = karin.friendSender(userId, ev.d.author.username || '')
  const elements = convertToKarin(selfId, ev, client.selfSubId('id'))
  const time = Number(new Date(ev.d.timestamp).getTime() || ev.d.timestamp)
  cacheMessage(client, {
    messageId: ev.d.id,
    time,
    contact,
    sender,
    elements,
  })

  const e = createDirectMessage({
    bot: client,
    elements,
    eventId: ev.id,
    messageId: ev.d.id,
    messageSeq: 0,
    rawEvent: ev,
    time,
    contact,
    sender,
    srcGuildId: ev.d.src_guild_id,
    srcReply: (elements) => client.srcReply(e, [...elements, segment.pasmsg(ev.d.id)]),
  })

  return e
}
