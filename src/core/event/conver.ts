import { segment } from 'node-karin'
import { getConfig } from '@/utils/config'
import { EventEnum } from '@/types/event'
import type { ElementTypes } from 'node-karin'
import type { DirectMsgEvent, GuildMsgEvent, C2CMsgEvent, GroupMsgEvent, GuildUser } from '../../types/event'

/**
 * QQBot群、私聊转karin消息端
 * @param appid 应用ID
 * @param event 事件
 * @param subBotID 机器人ID 也就是跟用户一样的ID 并非appid
 * @return karin格式消息
 */
export const QQBotConvertKarin = (
  appid: string,
  event: C2CMsgEvent | GroupMsgEvent | GuildMsgEvent | DirectMsgEvent,
  subBotID: string
): Array<ElementTypes> => {
  const elements: Array<ElementTypes> = []

  const data = event.d
  const mentions: Record<string, GuildUser> = {}
  if (event.t === EventEnum.MESSAGE_CREATE || event.t === EventEnum.AT_MESSAGE_CREATE) {
    event.d.mentions?.forEach(v => {
      mentions[v.id] = v
    })
  }

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
      // 优先使用 wav 格式链接，如果没有则使用原始链接
      elements.push(segment.record(v.voice_wav_url || url))
    } else if (v.content_type === 'file') {
      // TODO: node-karin 框架如果支持 file 类型 segment，可以在此处处理
      console.log(v)
    }
  }

  /** 官方会对消息中的特殊字符进行转义，需要反转义 */
  const unescapeContent = (text: string) => text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

  const regex = /<faceType=\d+,faceId="\d+",ext="[^"]+">|<@!\d+>|[^<]+/g
  const result = data?.content?.match(regex) || []
  result.forEach(v => {
    if (v.startsWith('<faceType=')) {
      const Match = v.match(/faceId="(\d+)"/) as RegExpMatchArray
      elements.push(segment.face(Number(Match[1])))
    } if (v.startsWith('<@!')) {
      const id = v.replace(/^<@!|>$/g, '')
      const name = mentions[id]?.username || ''
      elements.push(segment.at(id === subBotID ? appid : id, name))
    } else {
      let text = unescapeContent(v)
      const cfg = getConfig(appid)
      if (cfg?.regex) {
        for (const r of cfg.regex) {
          const reg = r.reg instanceof RegExp ? r.reg : new RegExp(r.reg)
          text = text.trim().replace(reg, r.rep)
        }
      }
      elements.push(segment.text(text))
    }
  })

  if (event.t === EventEnum.GROUP_AT_MESSAGE_CREATE) {
    elements.unshift(segment.at(appid))
  }

  return elements
}
