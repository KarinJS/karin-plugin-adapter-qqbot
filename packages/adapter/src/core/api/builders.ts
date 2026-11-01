import type {
  Markdown,
  Keyboard,
  MessageCard,
  Embeds,
  Ark,
  SendQQMsg,
  SendQQTextMessageRequest,
  SendQQMarkdownMessageRequest,
  SendQQArkMessageRequest,
  SendQQMediaMessageRequest,
  SendQQCardMessageRequest,
  SendGuildMsg,
  SendGuildTextMessageRequest,
  SendGuildImageMessageRequest,
  SendGuildEmbedMessageRequest,
  SendGuildArkMessageRequest,
  SendGuildMarkdownMessageRequest,
} from './types'

/**
 * 构造 QQ 单聊 / 群聊请求体
 */
export const buildQQMsg = {
  text(content: string): SendQQTextMessageRequest {
    return { msg_type: 0, content }
  },
  markdown(markdown: Markdown, keyboard?: Keyboard): SendQQMarkdownMessageRequest {
    return { msg_type: 2, markdown, keyboard }
  },
  ark(ark: SendQQArkMessageRequest['ark']): SendQQArkMessageRequest {
    return { msg_type: 3, ark }
  },
  /**
   * 构造 msg_type=7 富媒体消息体
   *
   * @param fileInfo 上传富媒体返回的 file_info。
   * @param keyboard 可选内嵌键盘，用于按钮随富媒体一起发送。
   */
  media(fileInfo: string, keyboard?: Keyboard): SendQQMediaMessageRequest {
    return { msg_type: 7, media: { file_info: fileInfo }, keyboard }
  },
  /**
   * 构造 msg_type=8 图文卡片消息体
   *
   * 仅 QQ 单聊 / 群聊支持；`card.content.url` 与 `pic_url` 必须是公网 https 地址。
   * 实测卡片不能携带 keyboard，需要按钮时请另发一条带 keyboard 的消息。
   *
   * @param card 图文卡片内容（type=tuwen）。
   */
  card(card: MessageCard): SendQQCardMessageRequest {
    return { msg_type: 8, card }
  },
}

/**
 * 构造频道请求体
 */
export const buildGuildMsg = {
  text(content: string, image?: string): SendGuildTextMessageRequest {
    return { type: 'text', content, image }
  },
  image(image: string): SendGuildImageMessageRequest {
    return { type: 'image', image }
  },
  embed(embed: Embeds): SendGuildEmbedMessageRequest {
    return { type: 'embed', embed }
  },
  ark(ark: Ark): SendGuildArkMessageRequest {
    return { type: 'ark', ark }
  },
  markdown(markdown: Markdown, keyboard?: Keyboard): SendGuildMarkdownMessageRequest {
    return { type: 'markdown', markdown, keyboard }
  },
}

/** 重导出供外部消费 */
export type { SendQQMsg, SendGuildMsg }
