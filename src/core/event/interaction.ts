import {
  karin, segment,
  createGroupMessage, createFriendMessage, createGuildMessage,
} from 'node-karin'
import type { AdapterQQBot } from '@/core/adapter/base'
import type { InteractionEvent } from '@/types/event'

/**
 * 取得互动事件真正用于 ACK 的平台 ID。
 *
 * WebSocket Dispatch 外层也有一个 `id`，形如 `INTERACTION_CREATE:uuid`；按钮 ACK
 * 接口需要的是事件体内的 `d.id`，也就是不带事件名前缀的 uuid。
 *
 * @param ev QQBot 原始互动事件。
 * @returns 可传给 `/interactions/{interaction_id}` 的 ID。
 */
const getInteractionId = (ev: InteractionEvent): string => ev.d.id || ev.id

/** 按钮回调元信息的 JSON 值类型。 */
type ButtonInteractionMetaValue = string | number

/**
 * QQBot 按钮回调事件转换到 Karin 消息时附加的元信息。
 *
 * 这里保留 QQ 平台关键字段，插件可以从 json 消息段读取；字段名保持
 * snake_case，和 QQBot 原始报文字段风格一致。
 */
interface ButtonInteractionMeta {
  /** 元信息标识，插件可用它判断该 json 是否由 QQBot 按钮回调生成。 */
  tag: 'qqbot-button-click'
  /** 平台方互动事件 ID，用于 ACK：PUT /interactions/{id}。 */
  interaction_id: string
  /** WebSocket Dispatch 外层事件 ID，形如 `INTERACTION_CREATE:uuid`。 */
  dispatch_id: string
  /** 事件类型：11=消息按钮，12=单聊快捷菜单。 */
  interaction_type: number
  /** data.type：通常与 interaction_type 一致，平台配置类回调也会使用该字段区分类型。 */
  data_type?: number
  /** 场景类型：0=频道，1=群聊，2=单聊。 */
  chat_type?: number
  /** 场景：c2c / group / guild。 */
  scene?: string
  /** 按钮 action.data 值。 */
  button_data?: string
  /** 按钮 id。 */
  button_id?: string
  /** 触发互动事件的应用 ID。 */
  application_id?: string
  /** 群 openid（仅群聊场景）。 */
  group_openid?: string
  /** 群内触发用户 openid（仅群聊场景）。 */
  group_member_openid?: string
  /** 单聊用户 openid（仅 c2c 场景）。 */
  user_openid?: string
  /** 频道 openid（仅频道场景）。 */
  guild_id?: string
  /** 子频道 openid（仅频道场景）。 */
  channel_id?: string
  /** 操作用户 userid（仅频道场景）。 */
  guild_user_id?: string
  /** 自定义菜单 id（仅菜单场景）。 */
  feature_id?: string
  /** 操作的消息 id（仅频道场景）。 */
  message_id?: string
  /** 配置更新：群消息模式，mention=@机器人时激活，always=总是激活。 */
  require_mention?: string
  /** 配置更新：群消息策略。 */
  group_policy?: string
  /** 配置更新：@文本的名称提及 BOT 名，多个使用英文逗号分隔。 */
  mention_patterns?: string
  /** 事件版本。 */
  version?: number
  [key: string]: ButtonInteractionMetaValue | undefined
}

/**
 * 构造按钮回调附加给 Karin 消息的元信息。
 *
 * QQBot 不同场景下下发字段差异很大：群聊通常只有 button_data/button_id，
 * 频道才可能带 user_id/message_id/feature_id。这里只写入实际存在的字段，
 * 避免插件侧看到一堆语义不明的空值。
 *
 * @param ev QQBot 原始互动事件。
 * @param interactionId 已确认可用于 ACK 的平台互动 ID。
 * @returns 可放入 segment.json 的精简元信息。
 */
const createInteractionMeta = (
  ev: InteractionEvent,
  interactionId: string
): ButtonInteractionMeta => {
  const resolved = ev.d.data?.resolved
  const meta: ButtonInteractionMeta = {
    tag: 'qqbot-button-click',
    interaction_id: interactionId,
    dispatch_id: ev.id,
    interaction_type: ev.d.type,
  }

  const optional: Record<string, string | number | undefined> = {
    data_type: ev.d.data?.type,
    chat_type: ev.d.chat_type,
    scene: ev.d.scene,
    button_id: resolved?.button_id,
    button_data: resolved?.button_data,
    application_id: ev.d.application_id,
    group_openid: ev.d.group_openid,
    group_member_openid: ev.d.group_member_openid,
    user_openid: ev.d.user_openid,
    guild_id: ev.d.guild_id,
    channel_id: ev.d.channel_id,
    guild_user_id: resolved?.user_id,
    feature_id: resolved?.feature_id,
    message_id: resolved?.message_id,
    require_mention: resolved?.require_mention,
    group_policy: resolved?.group_policy,
    mention_patterns: resolved?.mention_patterns,
    version: ev.d.version,
  }

  for (const [key, value] of Object.entries(optional)) {
    if (value !== undefined && value !== '') meta[key] = value
  }

  return meta
}

/**
 * INTERACTION_CREATE 处理
 *
 * - 先 ack 客户端（必须在 3s 内），失败仅 warn
 * - 借用普通消息事件投递给业务层，业务层通过 e.rawEvent.t === 'INTERACTION_CREATE' 区分
 * - elements 只放 button_data 文本，避免 at/json 段污染 e.msg 导致 command 无法精确匹配
 */
export const onInteraction = (client: AdapterQQBot, ev: InteractionEvent): void => {
  // 先 ack，避免客户端 loading
  const interactionId = getInteractionId(ev)
  const ackStart = Date.now()
  client.logger('debug', `[INTERACTION] ack 准备: ${interactionId} dispatch=${ev.id}`)
  client.super.interaction.ack(interactionId, 0).then(() => {
    client.logger('debug', `[INTERACTION] ack 成功: ${interactionId} (${Date.now() - ackStart}ms)`)
  }).catch(err => {
    client.logger('warn', '[INTERACTION] ack 失败:', err)
  }).finally(() => {
    emitInteractionMessage(client, ev, interactionId)
  })
}

/**
 * 将按钮互动事件转换为 Karin 消息事件。
 *
 * ACK 请求先发出并结束后再投递业务层，避免业务回复请求抢在 ACK 前占用回调窗口。
 *
 * @param client 当前 QQBot 适配器实例。
 * @param ev QQBot 原始互动事件。
 * @param interactionId 已确认可用于 ACK 的平台互动 ID。
 */
const emitInteractionMessage = (
  client: AdapterQQBot,
  ev: InteractionEvent,
  interactionId: string
): void => {
  const buttonData = ev.d.data?.resolved?.button_data || ''
  const rawEvent = {
    ...ev,
    buttonMeta: createInteractionMeta(ev, interactionId),
  }
  const time = Number(ev.d.timestamp ? new Date(ev.d.timestamp).getTime() : Date.now()) || Date.now()

  // 1 = 群聊
  if (ev.d.chat_type === 1 && ev.d.group_openid) {
    const userId = ev.d.group_member_openid || ''
    const contact = karin.contactGroup(ev.d.group_openid)
    const sender = karin.groupSender(userId, 'unknown')
    const elements = [segment.text(buttonData)]

    const e = createGroupMessage({
      bot: client,
      elements,
      eventId: ev.id,
      messageId: interactionId,
      messageSeq: 0,
      rawEvent,
      time,
      contact,
      sender,
      srcReply: (els) => client.srcReply(e, [...els, segment.pasmsg(ev.id, 'event')]),
    })
    return
  }

  // 2 = 单聊
  if (ev.d.chat_type === 2 && ev.d.user_openid) {
    const userId = ev.d.user_openid
    const contact = karin.contactFriend(userId)
    const sender = karin.friendSender(userId, '')
    const elements = [segment.text(buttonData)]

    const e = createFriendMessage({
      bot: client,
      elements,
      eventId: ev.id,
      messageId: interactionId,
      messageSeq: 0,
      rawEvent,
      time,
      contact,
      sender,
      srcReply: (els) => client.srcReply(e, [...els, segment.pasmsg(ev.id, 'event')]),
    })
    return
  }

  // 0 = 频道
  if (ev.d.chat_type === 0 && ev.d.guild_id && ev.d.channel_id) {
    const userId = ev.d.data?.resolved?.user_id || ''
    const contact = karin.contact('guild', ev.d.guild_id, ev.d.channel_id)
    const sender = karin.groupSender(userId, 'unknown')
    const elements = [segment.text(buttonData)]

    const e = createGuildMessage({
      bot: client,
      elements,
      eventId: ev.id,
      messageId: interactionId,
      messageSeq: 0,
      rawEvent,
      time,
      contact,
      sender,
      srcReply: (els) => client.srcReply(e, [...els, segment.pasmsg(ev.id, 'event')]),
    })
    return
  }

  client.logger('debug', `[INTERACTION] 未识别的 chat_type=${ev.d.chat_type}`)
}
