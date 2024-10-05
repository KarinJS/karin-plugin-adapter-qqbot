export const eventToIntentMap: { [key: string]: number } = {
  GUILD_CREATE: 1 << 0,
  GUILD_UPDATE: 1 << 0,
  GUILD_DELETE: 1 << 0,
  CHANNEL_CREATE: 1 << 0,
  CHANNEL_UPDATE: 1 << 0,
  CHANNEL_DELETE: 1 << 0,
  GUILD_MEMBER_ADD: 1 << 1,
  GUILD_MEMBER_UPDATE: 1 << 1,
  GUILD_MEMBER_REMOVE: 1 << 1,
  MESSAGE_CREATE: 1 << 9,
  MESSAGE_DELETE: 1 << 9,
  MESSAGE_REACTION_ADD: 1 << 10,
  MESSAGE_REACTION_REMOVE: 1 << 10,
  DIRECT_MESSAGE_CREATE: 1 << 12,
  DIRECT_MESSAGE_DELETE: 1 << 12,
  C2C_MESSAGE_CREATE: 1 << 25,
  FRIEND_ADD: 1 << 25,
  FRIEND_DEL: 1 << 25,
  C2C_MSG_REJECT: 1 << 25,
  C2C_MSG_RECEIVE: 1 << 25,
  GROUP_AT_MESSAGE_CREATE: 1 << 25,
  GROUP_ADD_ROBOT: 1 << 25,
  GROUP_DEL_ROBOT: 1 << 25,
  GROUP_MSG_REJECT: 1 << 25,
  GROUP_MSG_RECEIVE: 1 << 25,
  INTERACTION_CREATE: 1 << 26,
  MESSAGE_AUDIT_PASS: 1 << 27,
  MESSAGE_AUDIT_REJECT: 1 << 27,
  FORUM_THREAD_CREATE: 1 << 28,
  FORUM_THREAD_UPDATE: 1 << 28,
  FORUM_THREAD_DELETE: 1 << 28,
  FORUM_POST_CREATE: 1 << 28,
  FORUM_POST_DELETE: 1 << 28,
  FORUM_REPLY_CREATE: 1 << 28,
  FORUM_REPLY_DELETE: 1 << 28,
  FORUM_PUBLISH_AUDIT_RESULT: 1 << 28,
  AUDIO_START: 1 << 29,
  AUDIO_FINISH: 1 << 29,
  AUDIO_ON_MIC: 1 << 29,
  AUDIO_OFF_MIC: 1 << 29,
  AT_MESSAGE_CREATE: 1 << 30,
  PUBLIC_MESSAGE_DELETE: 1 << 30,
}

/**
 * 计算事件名称数组对应的 intents 的值
 * @param events 事件名称数组
 * @returns intents 的值
 */
export function Intents (events: string[]): number {
  return events.reduce((acc, event) => {
    const intent = eventToIntentMap[event]
    if (intent !== undefined) acc |= intent
    return acc
  }, 0)
}
