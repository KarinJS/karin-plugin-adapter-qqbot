import type {
  ElementTypes, ButtonElement, KeyboardElement, MarkdownElement,
} from 'node-karin'

/** 富媒体待发送项（视频/语音/文件） */
export interface PendingMedia {
  kind: 'video' | 'record' | 'file'
  /** 来源：http 链接 / base64 / 本地路径，由 pipeline 处理 */
  source: string
  /** 原始文件名，主要用于 file 消息。 */
  name?: string
}

/** 被动消息归一信息 */
export interface PassiveInfo {
  /** msg(普通被动) / event(事件回复) */
  type: 'msg' | 'event'
  /** msg_id 或 event_id */
  id: string
  /** msg_seq（仅 QQ 场景使用） */
  seq: number
}

/**
 * 消息归类容器
 */
export interface Grouping<T extends 'qq' | 'guild'> {
  /** 已渲染的文本片段（含 at 内嵌标签） */
  text: string[]
  /** QQ 场景：所有图片（统一为待上传） */
  qqImages: string[]
  /** Guild 场景：HTTP url 图片 */
  guildImageUrls: string[]
  /** Guild 场景：本地/base64 图片，需走 FormData */
  guildImageFiles: string[]
  /** 按钮 */
  buttons: ButtonElement[]
  /** keyboard 元素 */
  keyboards: KeyboardElement[]
  /** markdown 元素 */
  markdowns: MarkdownElement[]
  /** 视频 / 语音 / 文件 */
  media: PendingMedia[]
  /** 显式引用回复；QQ 群聊/单聊发送前会把 API 消息 ID 映射为 msg_idx/REFIDX */
  reply: { messageId: string }
  /** 被动消息 */
  pasmsg: PassiveInfo
  /** 频道场景 face 转 `<emoji:id>` 写入 text；这里仅记录用作 debug */
  faces: number[]

  // 仅类型用，区分 qq / guild
  __scope?: T
}

/**
 * 生成 QQ 被动回复使用的 msg_seq 种子。
 *
 * QQ 官方使用 `msg_id + msg_seq` 判重。这里和 openclaw qqbot 适配器一样限制在
 * 16-bit 范围内，后续每发一条再递增取模。
 *
 * @returns 0..65535 范围内的初始 msg_seq。
 */
const createMsgSeqSeed = (): number => {
  const timePart = Date.now() % 100_000_000
  const randomPart = Math.floor(Math.random() * 65536)
  return (timePart ^ randomPart) % 65536
}

/**
 * 创建空容器
 */
export const createGrouping = <T extends 'qq' | 'guild'> (): Grouping<T> => ({
  text: [],
  qqImages: [],
  guildImageUrls: [],
  guildImageFiles: [],
  buttons: [],
  keyboards: [],
  markdowns: [],
  media: [],
  reply: { messageId: '' },
  pasmsg: {
    type: 'msg',
    id: '',
    seq: createMsgSeqSeed(),
  },
  faces: [],
})

/**
 * 将 karin elements 归类到容器
 */
export const groupElements = <T extends 'qq' | 'guild'> (
  scene: 'group' | 'friend' | 'guild' | 'direct',
  elements: ElementTypes[]
): Grouping<T> => {
  const g = createGrouping<T>()
  const isQQ = scene === 'group' || scene === 'friend'

  for (const v of elements) {
    switch (v.type) {
      case 'text':
        g.text.push(v.text)
        break
      case 'image':
        if (isQQ) {
          g.qqImages.push(v.file)
        } else {
          v.file.startsWith('http')
            ? g.guildImageUrls.push(v.file)
            : g.guildImageFiles.push(v.file)
        }
        break
      case 'at':
        // 单聊场景 at 无意义
        if (scene === 'friend') break
        if (v.targetId === 'all') {
          g.text.push('<qqbot-at-everyone />')
        } else {
          g.text.push(`<qqbot-at-user id="${v.targetId}" />`)
        }
        break
      case 'face':
        // QQ 场景不支持自定义表情；Guild 场景用 <emoji:id>
        if (!isQQ) {
          g.text.push(`<emoji:${v.id}>`)
          g.faces.push(Number(v.id))
        }
        break
      case 'reply':
        g.reply.messageId = v.messageId
        break
      case 'pasmsg':
        if ((v as any).source === 'event') g.pasmsg.type = 'event'
        g.pasmsg.id = v.id
        break
      case 'button':
        g.buttons.push(v)
        break
      case 'keyboard':
        g.keyboards.push(v)
        break
      case 'markdown':
        g.markdowns.push(v)
        break
      case 'video':
        g.media.push({ kind: 'video', source: v.file, name: v.name })
        break
      case 'record':
        g.media.push({ kind: 'record', source: v.file, name: v.name })
        break
      case 'file':
        g.media.push({ kind: 'file', source: v.file, name: v.name })
        break
      default:
        // 静默忽略，由 pipeline 决定要不要降级
        break
    }
  }

  return g
}
