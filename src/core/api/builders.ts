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
  /**
   * 构造 msg_type=7 富媒体消息体
   *
   * @param fileInfo 上传富媒体返回的 file_info。
   * @param keyboard 可选内嵌键盘，用于按钮随富媒体一起发送。
   */
  media (fileInfo: string, keyboard?: Keyboard): SendQQMediaMessageRequest {
    return { msg_type: 7, media: { file_info: fileInfo }, keyboard }
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
