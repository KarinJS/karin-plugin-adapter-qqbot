import { segment } from 'node-karin'
import { getConfig } from '@/utils/config'
import { EventEnum } from '@/types/event'
import type { ElementTypes } from 'node-karin'
import type {
  C2CMsgEvent, GroupMsgEvent, GuildMsgEvent, DirectMsgEvent,
  GuildUser, QQMention, MessageScene, QQReferencedMessageElement,
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

/** 从 QQ `message_scene.ext` 中提取消息索引。 */
export const getMessageSceneIndex = (
  scene: MessageScene | undefined,
  key: 'msg_idx' | 'ref_msg_idx'
): string => {
  const prefix = `${key}=`
  return scene?.ext?.find(item => item.startsWith(prefix))?.slice(prefix.length) || ''
}

/** 原生 Markdown 不能从 QQ 回显中完全区分，只识别适配器发送后可稳定还原的常用语法。 */
const isNativeMarkdown = (text: string): boolean => {
  return /(^|\n)\s{0,3}(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s)|\*\*|__|~~|`{1,3}|\[[^\]]+\]\([^\s)]+\)|(^|\n)\s*\|.+\|\s*\n\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?/m.test(text)
}

/** 将非图片 Markdown 片段恢复为 text 或 markdown 元素。 */
const pushMarkdownText = (text: string, elements: ElementTypes[]) => {
  if (!text) return
  elements.push(isNativeMarkdown(text) ? segment.markdown(text) : segment.text(text))
}

/**
 * 反向解析适配器发送的 QQ Markdown。
 *
 * 发送侧会将 Karin 图片编码为 `![名称 #宽px #高px](URL)`，并以换行拼接文本、
 * 图片和原生 Markdown；这里按原顺序恢复为 Karin `text`、`image`、`markdown`。
 */
const pushQQMarkdown = (text: string, elements: ElementTypes[]): boolean => {
  const imageReg = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g
  let lastIndex = 0
  let matched = false
  let match: RegExpExecArray | null

  while ((match = imageReg.exec(text))) {
    matched = true
    if (match.index > lastIndex) pushMarkdownText(text.slice(lastIndex, match.index), elements)

    const alt = match[1]
    const dimension = alt.match(/\s+#(\d+)px\s+#(\d+)px\s*$/)
    const name = alt.replace(/\s+#\d+px\s+#\d+px\s*$/, '') || '图片'
    elements.push(segment.image(match[2], {
      name,
      width: dimension ? Number(dimension[1]) : undefined,
      height: dimension ? Number(dimension[2]) : undefined,
    }))
    lastIndex = imageReg.lastIndex
  }

  if (matched && lastIndex < text.length) pushMarkdownText(text.slice(lastIndex), elements)
  return matched
}

/**
 * 只拆 QQ 协议标签，保留普通文本中的 HTML/Markdown 片段。
 *
 * 普通文本或 Markdown 里可能包含 `<br>`、`<table>` 等内容；如果用 `[^<]+`
 * 直接切分，会把这些内容误当成协议标签边界，导致一条文本被拆成多段甚至丢失 `<`。
 */
const tokenizeContent = (content = ''): string[] => {
  const tokens: string[] = []
  const knownTag = /<faceType=\d+,faceId="[^"]*",ext="[^"]*">|<qqbot-at-user id="[^"]+"\s*\/?>|<qqbot-at-everyone\s*\/?>|<@!?[A-Za-z0-9]+>/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = knownTag.exec(content))) {
    if (match.index > lastIndex) tokens.push(content.slice(lastIndex, match.index))
    tokens.push(match[0])
    lastIndex = knownTag.lastIndex
  }

  if (lastIndex < content.length) tokens.push(content.slice(lastIndex))
  return tokens
}

/**
 * 判断 QQ 回显内容是否应恢复成 Karin markdown 段。
 *
 * QQBot 自己收到自己发出的 markdown 时可能是 `message_type=103`；收到其他
 * QQBot 发出的 markdown 时，官方报文仍可能给 `message_type=0`，只能结合
 * `author.bot` 与内容语法做保守识别。
 */
const shouldUseMarkdown = (messageType: number | undefined, fromBot: boolean, text: string): boolean => {
  return (messageType === 103 || fromBot) && isNativeMarkdown(text)
}

/**
 * 从 QQ 表情标签的 base64 ext 中提取可读文本。
 *
 * faceType=4 的表情包套图没有图片附件，只能通过 ext 中的 JSON 文本展示。
 *
 * @param ext QQ 表情标签里的 base64 字段。
 * @returns ext JSON 中的 text；解析失败时返回空字符串。
 */
const getFaceExtText = (ext: string): string => {
  if (!ext) return ''
  try {
    const decoded = Buffer.from(ext, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded) as { text?: unknown }
    return typeof payload.text === 'string' ? payload.text : ''
  } catch {
    return ''
  }
}

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
  const messageType = 'message_type' in data ? data.message_type : undefined
  const fromBot = !!data.author?.bot

  /** mentions 索引 id -> displayName */
  const mentionMap = new Map<string, string>()
  const selfMentionIds = new Set<string>([appid, selfSubId].filter(Boolean))
  if (ev.t === EventEnum.MESSAGE_CREATE || ev.t === EventEnum.AT_MESSAGE_CREATE) {
    (ev.d.mentions as GuildUser[] | undefined)?.forEach(v => {
      mentionMap.set(v.id, v.username)
      if (v.id === selfSubId) selfMentionIds.add(v.id)
    })
  } else if (ev.t === EventEnum.GROUP_MESSAGE_CREATE || ev.t === EventEnum.GROUP_AT_MESSAGE_CREATE) {
    (ev.d.mentions as QQMention[] | undefined)?.forEach(v => {
      mentionMap.set(v.id, v.username)
      mentionMap.set(v.member_openid, v.username)
      if (v.is_you) {
        selfMentionIds.add(v.id)
        selfMentionIds.add(v.member_openid)
      }
    })
  }

  const isSelfAt = (element: ElementTypes): boolean =>
    element.type === 'at' && selfMentionIds.has(element.targetId)

  const hasSelfAt = (): boolean => elements.some(isSelfAt)

  const pushAt = (id: string, name = ''): void => {
    const targetId = selfMentionIds.has(id) ? appid : id
    if (targetId === appid && hasSelfAt()) {
      const prev = elements.at(-1)
      const beforePrev = elements.at(-2)
      if (prev?.type === 'text' && !prev.text.trim() && beforePrev && isSelfAt(beforePrev)) {
        elements.pop()
      }
      return
    }
    elements.push(segment.at(targetId, name))
  }

  /** 将 QQ 附件转换为 Karin 元素。 */
  const attachments = data.attachments || []
  let attachmentIndex = 0
  const pushAttachment = (v: typeof attachments[number]) => {
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
      elements.push(segment.file(url, { name: v.filename, size: v.size }))
    }
  }

  /** content 解析 */
  const tokens = tokenizeContent(data?.content)
  const cfg = getConfig(appid)

  for (const tok of tokens) {
    if (tok.startsWith('<faceType=')) {
      const m = tok.match(/faceType=(\d+),faceId="([^"]*)",ext="([^"]*)"/)
      const faceType = Number(m?.[1])
      const faceIdText = m?.[2] || ''
      const faceId = Number(faceIdText)
      const attachment = attachments[attachmentIndex]
      if (!faceIdText) {
        if (attachment?.content_type.startsWith('image/')) {
          pushAttachment(attachment)
          attachmentIndex++
        } else {
          const text = getFaceExtText(m?.[3] || '')
          if (text) elements.push(segment.text(text))
        }
        continue
      }
      /**
       * QQ 将用户收藏表情图片编码为 `faceId=0` + 图片附件。附件在 content 中
       * 没有独立标签，必须在这个占位符位置消费，才能保留原始元素顺序。
       */
      if (
        faceId === 0 &&
        (messageType === 103 || faceType === 6) &&
        attachment?.content_type.startsWith('image/')
      ) {
        pushAttachment(attachment)
        attachmentIndex++
      } else if (faceType === 6 && faceId === 0) {
        // faceType=6 的零 ID 表情不是 QQ 内置表情，没有图片附件时不能还原为 face(0)。
      } else if (m) {
        elements.push(segment.face(faceId, faceType === 3))
      }
      continue
    }
    if (tok.startsWith('<@')) {
      // QQ 群聊下发 `<@openid>`；频道沿用 `<@!id>`。两者都转换为 Karin at 元素。
      const id = tok.replace(/^<@!?|>$/g, '')
      const name = mentionMap.get(id) || ''
      pushAt(id, name)
      continue
    }
    if (tok.startsWith('<qqbot-at-user')) {
      const m = tok.match(/id="([^"]+)"/)
      const id = m?.[1] || ''
      const name = mentionMap.get(id) || ''
      pushAt(id, name)
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
        text = text.replace(reg, r.rep)
      }
    }
    if (!text) continue
    if (messageType === 103 && pushQQMarkdown(text, elements)) continue
    if (shouldUseMarkdown(messageType, fromBot, text)) {
      elements.push(segment.markdown(text))
      continue
    }
    elements.push(segment.text(text))
  }

  /** content 中未出现占位符的普通附件，按 QQ 报文顺序追加。 */
  for (; attachmentIndex < attachments.length; attachmentIndex++) {
    pushAttachment(attachments[attachmentIndex])
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

/**
 * 将 QQ 引用上下文转换为 Karin 元素。
 *
 * QQ 不会提供引用消息的正式消息 ID；调用方应以 `msg_idx` 作为缓存键。
 */
export const convertReferenceToKarin = (
  appid: string,
  ev: C2CMsgEvent | GroupMsgEvent,
  selfSubId: string,
  reference: QQReferencedMessageElement
): ElementTypes[] => {
  const referenceEvent = {
    ...ev,
    d: {
      ...ev.d,
      content: reference.content,
      attachments: reference.attachments,
      mentions: undefined,
      message_scene: undefined,
      msg_elements: undefined,
      message_type: reference.message_type,
    },
  } as C2CMsgEvent | GroupMsgEvent

  return convertToKarin(appid, referenceEvent, selfSubId)
}
