import { segment } from 'node-karin'
import type { ElementTypes } from 'node-karin'
import { EventType, type C2CMsgEvent, type GroupMsgEvent } from './types'
import { config } from '@/utils/config'

/**
 * QQBot群、私聊转karin消息端
 * @param appid 应用ID
 * @param event 事件
 * @return karin格式消息
 */
export const QQBotConvertKarin = (appid: string, event: C2CMsgEvent | GroupMsgEvent): Array<ElementTypes> => {
  const elements: Array<ElementTypes> = []

  const data = event.d
  /** 检查是否存在图片 */
  for (const v of data.attachments || []) {
    elements.push(segment.image(v.url, {
      name: v.filename,
      // size: v.size,
      height: v.height,
      width: v.width,
      fileType: 'original',
    }))
  }

  const regex = /<faceType=\d+,faceId="\d+",ext="[^"]+">|[^<]+/g
  const result = data.content.match(regex) || [data.content]
  result.forEach(v => {
    if (v.startsWith('<faceType=')) {
      const Match = v.match(/faceId="(\d+)"/) as RegExpMatchArray
      elements.push(segment.face(Number(Match[1])))
    } else {
      const regex = config()?.[appid]?.regex || []
      for (const r of regex) {
        const reg = r.reg instanceof RegExp ? r.reg : new RegExp(r.reg)
        v = v.trim().replace(reg, r.rep)
      }
      elements.push(segment.text(v))
    }
  })

  event.t === EventType.GROUP_AT_MESSAGE_CREATE && elements.unshift(segment.at(appid))

  return elements
}
