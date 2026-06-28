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

/**
 * INTERACTION_CREATE 处理
 *
 * - 先 ack 客户端（必须在 3s 内），失败仅 warn
 * - 借用普通消息事件投递给业务层，业务层通过 e.rawEvent.t === 'INTERACTION_CREATE' 区分
 * - elements: [self at] + text(button_data) + json(meta)
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
  const selfId = client.selfId
  const buttonData = ev.d.data?.resolved?.button_data || ''
  const meta = segment.json(JSON.stringify({
    tag: 'qqbot-button-click',
    interaction_id: interactionId,
    dispatch_id: ev.id,
    type: ev.d.type,
    chat_type: ev.d.chat_type,
    scene: ev.d.scene,
    button_id: ev.d.data?.resolved?.button_id,
    button_data: ev.d.data?.resolved?.button_data,
    feature_id: ev.d.data?.resolved?.feature_id,
    message_id: ev.d.data?.resolved?.message_id,
    user_id: ev.d.data?.resolved?.user_id,
    version: ev.d.version,
  }))
  const time = Number(new Date(ev.d.timestamp).getTime() || Date.now())

  // 1 = 群聊
  if (ev.d.chat_type === 1 && ev.d.group_openid) {
    const userId = ev.d.group_member_openid || ''
    const contact = karin.contactGroup(ev.d.group_openid)
    const sender = karin.groupSender(userId, 'unknown')
    const elements = [segment.at(selfId), segment.text(buttonData), meta]

    const e = createGroupMessage({
      bot: client,
      elements,
      eventId: ev.id,
      messageId: interactionId,
      messageSeq: 0,
      rawEvent: ev,
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
    const elements = [segment.at(selfId), segment.text(buttonData), meta]

    const e = createFriendMessage({
      bot: client,
      elements,
      eventId: ev.id,
      messageId: interactionId,
      messageSeq: 0,
      rawEvent: ev,
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
    const elements = [segment.text(buttonData), meta]

    const e = createGuildMessage({
      bot: client,
      elements,
      eventId: ev.id,
      messageId: interactionId,
      messageSeq: 0,
      rawEvent: ev,
      time,
      contact,
      sender,
      srcReply: (els) => client.srcReply(e, [...els, segment.pasmsg(ev.id, 'event')]),
    })
    return
  }

  client.logger('debug', `[INTERACTION] 未识别的 chat_type=${ev.d.chat_type}`)
}
