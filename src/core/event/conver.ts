import { segment } from 'node-karin'
import { getConfig } from '@/utils/config'
import { EventEnum } from '@/types/event'
import type { ElementTypes } from 'node-karin'
import type {
  C2CMsgEvent, GroupMsgEvent, GuildMsgEvent, DirectMsgEvent,
  GuildUser, QQMention,
} from '@/types/event'

export interface ConvertOptions {
  /** dispatcher 在 GROUP_AT_MESSAGE_CREATE 时强制补 self at */
  forceAtSelf?: boolean
}

/** 反转义 HTML 实体 */
const unescape = (text: string) => text
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')

/**
 * QQ Bot 报文 → karin elements
 *
 * @param appid 应用 ID（与机器人 sub_id 同一值会被替换为 appid）
 * @param ev 事件
 * @param selfSubId 机器人 user id（非 appid）
 * @param options
 */
export const convertToKarin = (
  appid: string,
  ev: C2CMsgEvent | GroupMsgEvent | GuildMsgEvent | DirectMsgEvent,
  selfSubId: string,
  options: ConvertOptions = {}
): ElementTypes[] => {
  const elements: ElementTypes[] = []
  const data = ev.d

  /** mentions 索引 id -> displayName */
  const mentionMap = new Map<string, string>()
  if (ev.t === EventEnum.MESSAGE_CREATE || ev.t === EventEnum.AT_MESSAGE_CREATE) {
    (ev.d.mentions as GuildUser[] | undefined)?.forEach(v => {
      mentionMap.set(v.id, v.username)
    })
  } else if (ev.t === EventEnum.GROUP_MESSAGE_CREATE || ev.t === EventEnum.GROUP_AT_MESSAGE_CREATE) {
    (ev.d.mentions as QQMention[] | undefined)?.forEach(v => {
      mentionMap.set(v.id, v.username)
      mentionMap.set(v.member_openid, v.username)
    })
  }

  /** 附件 */
  for (const v of data.attachments || []) {
    const url = v.url.startsWith('http') ? v.url : `https://${v.url}`
    if (v.content_type.startsWith('image/')) {
      elements.push(segment.image(url, {
        subType: v.content_type.split('/')[1],
        name: v.filename,
        width: v.width,
        height: v.height,
      }))
    } else if (v.content_type === 'video/mp4') {
      elements.push(segment.video(url))
    } else if (v.content_type === 'voice') {
      elements.push(segment.record(v.voice_wav_url || url))
    } else if (v.content_type === 'file') {
      // karin 暂无 file segment，使用 json 透传
      elements.push(segment.json(JSON.stringify({ type: 'file', attachment: v })))
    }
  }

  /** content 解析 */
  const regex = /<faceType=\d+,faceId="\d+",ext="[^"]+">|<@!\d+>|<qqbot-at-user id="[^"]+"\s*\/?>|<qqbot-at-everyone\s*\/?>|[^<]+/g
  const tokens = data?.content?.match(regex) || []
  const cfg = getConfig(appid)

  for (const tok of tokens) {
    if (tok.startsWith('<faceType=')) {
      const m = tok.match(/faceId="(\d+)"/)
      if (m) elements.push(segment.face(Number(m[1])))
      continue
    }
    if (tok.startsWith('<@!')) {
      const id = tok.replace(/^<@!|>$/g, '')
      const name = mentionMap.get(id) || ''
      elements.push(segment.at(id === selfSubId ? appid : id, name))
      continue
    }
    if (tok.startsWith('<qqbot-at-user')) {
      const m = tok.match(/id="([^"]+)"/)
      const id = m?.[1] || ''
      const name = mentionMap.get(id) || ''
      elements.push(segment.at(id === selfSubId ? appid : id, name))
      continue
    }
    if (tok.startsWith('<qqbot-at-everyone')) {
      elements.push(segment.at('all'))
      continue
    }
    let text = unescape(tok)
    if (cfg?.regex) {
      for (const r of cfg.regex) {
        const reg = r.reg instanceof RegExp ? r.reg : new RegExp(r.reg)
        text = text.trim().replace(reg, r.rep)
      }
    }
    elements.push(segment.text(text))
  }

  /** 群消息是否需要在头部补 self at */
  if (ev.t === EventEnum.GROUP_AT_MESSAGE_CREATE || ev.t === EventEnum.GROUP_MESSAGE_CREATE) {
    const mentions = (ev.d.mentions as QQMention[] | undefined) || []
    const youMention = mentions.find(m => m.is_you)
    const shouldAtSelf = options.forceAtSelf || !!youMention
    if (shouldAtSelf) {
      // 仅在 content 中不存在 self at 时补一个
      const hasSelfAt = elements.some(e =>
        e.type === 'at' && (e.targetId === appid || e.targetId === selfSubId)
      )
      if (!hasSelfAt) {
        elements.unshift(segment.at(appid, youMention?.username || ''))
      }
    }
  }

  return elements
}
