import { C2CMessageEvent, GroupAtMessageEvent, GuildMessageDirectEvent, GuildMessageEvent, PathType } from '@/types'
import { karin, EventType, KarinMessage, MessageSubType, Role, Scene, button, segment } from 'node-karin'
import { adapterConvertKarin } from './convert'
import { AdapterQQBot } from '@/adapter'
import { sendQQMessage } from './send'
import { sendMarkdown } from '@/markdown/markdown'

/**
 * QQBot群消息事件处理
 * @param data
 */
export const groupMessage = (bot: AdapterQQBot, selfId: string, data: GroupAtMessageEvent) => {
  const userId = data.d.author.id
  const groupId = data.d.group_id
  const time = new Date(data.d.timestamp).getTime()

  const message = {
    event: EventType.Message as EventType.Message,
    sub_event: MessageSubType.GroupMessage as MessageSubType.GroupMessage,
    raw_event: data,
    event_id: data.id,
    self_id: selfId,
    user_id: userId,
    time,
    message_id: data.d.id,
    message_seq: data.s,
    sender: {
      uid: userId,
      uin: userId,
      nick: '',
      role: Role.Unknown as Role.Unknown,
    },
    elements: adapterConvertKarin(selfId, data),
    contact: {
      scene: Scene.Group as Scene.Group,
      peer: groupId,
      sub_peer: '',
    },
    group_id: groupId,
    raw_message: '',
  }

  const e = new KarinMessage(message)
  e.bot = bot
  e.replyCallback = async elements => {
    /** 被动消息 */
    elements.push(segment.pasmsg(e.message_id))
    switch (Number(bot.config.sendMode)) {
      case 0: {
        const result = await sendQQMessage(bot.super, groupId, PathType.Groups, elements)
        return result
      }
      case 1: {
        const list = await button(e.msg)
        elements.push(...list)
        const result = await sendMarkdown.SendMessage(bot, message.contact, elements)
        return result
      }
      default: {
        throw new Error('暂未适配的发送模式')
      }
    }
  }

  karin.emit('adapter.message', e)
}

/**
 * QQBot单聊消息事件处理
 * @param data
 */
export const friendMessage = (bot: AdapterQQBot, selfId: string, data: C2CMessageEvent) => {
  const userId = data.d.author.user_openid
  const time = new Date(data.d.timestamp).getTime()

  const message = {
    event: EventType.Message as EventType.Message,
    sub_event: MessageSubType.PrivateMessage as MessageSubType.PrivateMessage,
    raw_event: data,
    event_id: data.id,
    self_id: selfId,
    user_id: userId,
    time,
    message_id: data.d.id,
    message_seq: data.s,
    sender: {
      uid: userId,
      uin: userId,
      nick: '',
      role: Role.Unknown as Role.Unknown,
    },
    elements: adapterConvertKarin(selfId, data),
    contact: {
      scene: Scene.Private as Scene.Private,
      peer: userId,
      sub_peer: '',
    },
    group_id: '',
    raw_message: '',
  }

  const e = new KarinMessage(message)
  e.bot = bot
  e.replyCallback = async elements => {
    /** 被动消息 */
    elements.push(segment.pasmsg(e.message_id))
    switch (Number(bot.config.sendMode)) {
      case 0: {
        const result = await sendQQMessage(bot.super, userId, PathType.Friends, elements)
        return result
      }
      case 1: {
        const list = await button(e.msg)
        elements.push(...list)
        const result = await sendMarkdown.SendMessage(bot, message.contact, elements)
        return result
      }
      default: {
        throw new Error('暂未适配的发送模式')
      }
    }
  }

  karin.emit('adapter.message', e)
}

/**
 * QQBot频道消息事件处理
 * @param data
 */
export const guildMessage = (bot: AdapterQQBot, selfId: string, data: GuildMessageEvent) => {
  const userId = 'qg_' + data.d.author.id
  const time = new Date(data.d.timestamp).getTime()

  const message = {
    event: EventType.Message as EventType.Message,
    sub_event: MessageSubType.GuildMessage as MessageSubType.GuildMessage,
    raw_event: data,
    event_id: data.id,
    self_id: selfId,
    user_id: userId,
    time,
    message_id: data.d.id,
    message_seq: data.s,
    sender: {
      uid: userId,
      uin: userId,
      nick: '',
      role: Role.Unknown as Role.Unknown,
    },
    elements: adapterConvertKarin(selfId, data),
    contact: {
      scene: Scene.Guild as Scene.Guild,
      peer: 'qg_' + data.d.guild_id,
      sub_peer: data.d.channel_id,
    },
    group_id: '',
    raw_message: '',
  }

  const e = new KarinMessage(message)
  e.bot = bot
  e.replyCallback = async elements => {
    /** 被动消息 */
    elements.push(segment.pasmsg(e.message_id))
    switch (Number(bot.config.sendMode)) {
      case 0: {
        const result = await sendQQMessage(bot.super, data.d.channel_id, PathType.Channels, elements)
        return result
      }
      case 1: {
        const list = await button(e.msg)
        elements.push(...list)
        const result = await sendMarkdown.SendMessage(bot, message.contact, elements)
        return result
      }
      default: {
        throw new Error('暂未适配的发送模式')
      }
    }
  }

  karin.emit('adapter.message', e)
}

/**
 * QQBot频道私信消息事件处理
 * @param data
 */
export const guildDirectMessage = (bot: AdapterQQBot, selfId: string, data: GuildMessageDirectEvent) => {
  const userId = 'qg_' + data.d.author.id
  const time = new Date(data.d.timestamp).getTime()

  const message = {
    event: EventType.Message as EventType.Message,
    sub_event: MessageSubType.GuildPrivateMessage as MessageSubType.GuildPrivateMessage,
    raw_event: data,
    event_id: data.id,
    self_id: selfId,
    user_id: userId,
    time,
    message_id: data.d.id,
    message_seq: data.s,
    sender: {
      uid: userId,
      uin: userId,
      nick: '',
      role: Role.Unknown as Role.Unknown,
    },
    elements: adapterConvertKarin(selfId, data),
    contact: {
      scene: Scene.GuildDirect as Scene.GuildDirect,
      peer: 'qg_' + data.d.guild_id,
      sub_peer: '',
    },
    group_id: '',
    raw_message: '',
  }

  const e = new KarinMessage(message)
  e.bot = bot
  e.replyCallback = async elements => {
    /** 被动消息 */
    elements.push(segment.pasmsg(e.message_id))
    switch (Number(bot.config.sendMode)) {
      case 0: {
        const result = await sendQQMessage(bot.super, data.d.guild_id, PathType.Dms, elements)
        return result
      }
      case 1: {
        const list = await button(e.msg)
        elements.push(...list)
        const result = await sendMarkdown.SendMessage(bot, message.contact, elements)
        return result
      }
      default: {
        throw new Error('暂未适配的发送模式')
      }
    }
  }

  karin.emit('adapter.message', e)
}
