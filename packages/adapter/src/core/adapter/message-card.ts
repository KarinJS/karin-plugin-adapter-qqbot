import type { MessageCard } from '@/core/api/types'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Karin JSON 可承载官方 MessageCard，或完整的 { msg_type: 8, card } 请求体。 */
export const parseQQCard = (data: string): MessageCard | undefined => {
  let payload: unknown
  try {
    payload = JSON.parse(data)
  } catch {
    return undefined
  }
  if (!isRecord(payload)) return undefined
  const wrapped = payload.msg_type === 8
  const card = wrapped ? payload.card : payload
  if (!isRecord(card) || card.type !== 'tuwen') {
    if (wrapped) throw new Error('图文卡片格式错误：card.type 必须为 tuwen')
    return undefined
  }
  if (!isRecord(card.content)) throw new Error('图文卡片格式错误：缺少 content')
  const { title, description, url, pic_url } = card.content
  if (
    typeof title !== 'string' ||
    typeof description !== 'string' ||
    typeof url !== 'string' ||
    typeof pic_url !== 'string'
  ) {
    throw new Error('图文卡片格式错误：title、description、url、pic_url 必须为字符串')
  }
  return { type: 'tuwen', content: { title, description, url, pic_url } }
}
