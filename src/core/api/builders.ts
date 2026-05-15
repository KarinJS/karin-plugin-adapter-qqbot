import type {
  Markdown, Keyboard, Embeds, Ark,
  SendQQMsg, SendQQTextMessageRequest, SendQQMarkdownMessageRequest,
  SendQQArkMessageRequest, SendQQMediaMessageRequest,
  SendGuildMsg, SendGuildTextMessageRequest, SendGuildImageMessageRequest,
  SendGuildEmbedMessageRequest, SendGuildArkMessageRequest, SendGuildMarkdownMessageRequest,
} from './types'

/**
 * 构造 QQ 单聊 / 群聊请求体
 */
export const buildQQMsg = {
  text (content: string): SendQQTextMessageRequest {
    return { msg_type: 0, content }
  },
  markdown (markdown: Markdown, keyboard?: Keyboard): SendQQMarkdownMessageRequest {
    return { msg_type: 2, markdown, keyboard }
  },
  ark (ark: SendQQArkMessageRequest['ark']): SendQQArkMessageRequest {
    return { msg_type: 3, ark }
  },
  /** msg_type=7 时 content 字段必填，传一个空格占位 */
  media (fileInfo: string): SendQQMediaMessageRequest {
    return { msg_type: 7, media: { file_info: fileInfo }, content: ' ' }
  },
}

/**
 * 构造频道请求体
 */
export const buildGuildMsg = {
  text (content: string, image?: string): SendGuildTextMessageRequest {
    return { type: 'text', content, image }
  },
  image (image: string): SendGuildImageMessageRequest {
    return { type: 'image', image }
  },
  embed (embed: Embeds): SendGuildEmbedMessageRequest {
    return { type: 'embed', embed }
  },
  ark (ark: Ark): SendGuildArkMessageRequest {
    return { type: 'ark', ark }
  },
  markdown (markdown: Markdown, keyboard?: Keyboard): SendGuildMarkdownMessageRequest {
    return { type: 'markdown', markdown, keyboard }
  },
}

/** 重导出供外部消费 */
export type { SendQQMsg, SendGuildMsg }
