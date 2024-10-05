import { MessageEvent } from '@/types'
import { config } from '@/utils'
import { KarinElement, segment } from 'node-karin'

/**
 * QQBot转karin
 * @param selfId Bot自身id
 * @param event 事件对象
 */
export const adapterConvertKarin = (selfId: string, event: MessageEvent): Array<KarinElement> => {
  const elements: Array<KarinElement> = []

  const data = event.d
  /** 检查是否存在图片 */
  for (const v of data.attachments || []) {
    elements.push(segment.image(v.url, {
      name: v.filename,
      // size: v.size,
      height: v.height,
      width: v.width,
      file_type: 'original',
    }))
  }

  const regex = /<faceType=\d+,faceId="\d+",ext="[^"]+">|<@!\d+>|[^<]+/g
  const result = data.content.match(regex) || [data.content]
  result.forEach(v => {
    if (v.startsWith('<faceType=')) {
      const Match = v.match(/faceId="(\d+)"/) as RegExpMatchArray
      elements.push(segment.face(Number(Match[1])))
    } if (v.startsWith('<@!')) {
      const id = v.replace(/^<@!|>$/g, '')
      // todo: 通过循环User拿名称
      elements.push(segment.at(id))
    } else {
      const { regex } = config.getBotConfig(selfId) || { regex: [] }
      for (const r of regex) {
        const reg = r.reg
        v = v.trim().replace(reg, r.rep)
      }
      elements.push(segment.text(v))
    }
  })

  return elements
}
