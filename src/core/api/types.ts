import type { karinToQQBot } from 'node-karin'

/** 上传富媒体文件场景 */
export type Scene = 'users' | 'groups'
/** 上传富媒体文件类型 */
export type MediaType = 'image' | 'video' | 'record' | 'file'

// ==============以下是QQ好友、群聊相关的接口================

/** 发送QQ消息请求参数基类 */
export interface SendQQMessageRequest {
  /** 消息类型：0 是文本，2 是 markdown， 3 ark，4 embed，7 media 富媒体 */
  msg_type: 0 | 2 | 3 | 4 | 7
}

/** 发送QQ被动消息参数 */
export interface QQMessageID {
  /** 前置收到的事件 ID，用于发送被动消息，支持事件："INTERACTION_CREATE"、"C2C_MSG_RECEIVE"、"FRIEND_ADD" */
  event_id?: string
  /** 前置收到的用户发送过来的消息 ID，用于发送被动（回复）消息 */
  msg_id?: string
  /** 回复消息的序号，与 msg_id 联合使用，避免相同消息id回复重复发送，不填默认是1。相同的 msg_id + msg_seq 重复发送会失败。 */
  msg_seq?: number
}

/** 发送QQ文本消息请求参数 */
export interface SendQQTextMessageRequest extends SendQQMessageRequest, QQMessageID {
  msg_type: 0
  /**
   * 消息内容 支持如下内嵌格式
   * - `<qqbot-at-user id="" />` `@用户` **注意双引号不能省略**
   * - `<qqbot-at-everyone />` `@所有人`
   */
  content: string
}

/** markdown消息结构 */
export type Markdown = {
  /** markdown 文本 */
  content: string
} | {
  /** markdown 模版id，申请模版后获得 */
  custom_template_id: string
  /** 模版内变量与填充值的kv映射 */
  params: { key: string, values: [string] }[]
}

/** 按钮消息结构 */
export type Keyboard = {
  content: { rows: ReturnType<typeof karinToQQBot> }
} | {
  /** 按钮模版id */
  id: string
}

/** 发送QQ Markdown 消息请求参数 */
export interface SendQQMarkdownMessageRequest extends SendQQMessageRequest, QQMessageID {
  msg_type: 2
  /**
   * markdown 消息内容 支持如下内嵌格式
   * - `<qqbot-cmd-enter text="xxx" />` `回车按钮: 点击后，文本直接发送`
   * - `<qqbot-cmd-input text="xxx" show="xxx" reference="false" />` `点击后，文本输入框弹出`
   * - `text 用户点击后插入输入框的文本，参数必填，最大限制 100 字符，传值时需要 urlencode`
   * - `show 用户在消息内看到的文本，参数选填，默认取 text 值，最大限制 100 字符，传值时需要 urlencode。`
   * - `reference 插入输入框时是否带消息原文回复引用，参数选填，默认为 false，填入 true 时则带引用回复到输入框中。`
   *
   * {@link https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/trans/text-chain.html}
   */
  markdown: Markdown
  /** 按钮 */
  keyboard?: Keyboard
}

/** 发送QQ Ark 消息请求参数 */
export interface SendQQArkMessageRequest extends SendQQMessageRequest, QQMessageID {
  msg_type: 3
  /** ark 消息内容 */
  ark: {
    /** ark 模版id */
    template_id: number
    /** 模版内变量与填充值的kv映射 tips: 未经测试 先any */
    kv: any[]
  }
}

/** 发送QQ Embed 消息请求参数 文档没看到发送接口 */
// export interface SendQQEmbedMessageRequest extends SendQQMessageRequest, QQMessageID {
//   msg_type: 4
// }

/** 发送QQ Media 消息请求参数 */
export interface SendQQMediaMessageRequest extends SendQQMessageRequest, QQMessageID {
  msg_type: 7
  /** media 消息内容 */
  media: {
    /** 文件信息，用于发消息接口的 media 字段使用 */
    file_info: string
  }
}

/** 发送QQ消息请求参数 */
export type SendQQMsg = SendQQTextMessageRequest
  | SendQQMarkdownMessageRequest
  | SendQQArkMessageRequest
  | SendQQMediaMessageRequest

// ==============以下是频道相关的接口================

/** 发送频道被动消息参数 */
export interface SendGuildMessageID {
  /** 消息ID */
  msg_id?: string
  /** 事件id */
  event_id?: string
}

/** 发送频道引用消息参数 */
export interface SendGuildQuoteMessage {
  /** 引用消息的ID */
  message_id: string
  /** 是否忽略获取引用消息详情错误，默认否 */
  ignore_get_message_error?: boolean
}

/** 发送频道消息请求参数基类 */
export interface SendGuildMessageRequest {
  /** 单独加一个类型 用于区分不同的消息类型 */
  msg_type: 'text' | 'image' | 'embed' | 'ark' | 'markdown'
}

/** 发送频道 文本 消息请求参数 */
export interface SendGuildTextMessageRequest extends SendGuildMessageID, SendGuildQuoteMessage, SendGuildMessageRequest {
  type: 'text'
  /**
   * 消息内容 支持如下内嵌格式
   * - `<@user_id>` `@用户`
   * - `@everyone` `@所有人`
   * - `<#channel_id>` `#子频道`
   * - `<emoji:id>` `表情`
   */
  content: string
  /** 图片url地址 */
  image?: string
}

/** 发送频道 图片 消息请求参数 */
export interface SendGuildImageMessageRequest extends SendGuildMessageID, SendGuildQuoteMessage, SendGuildMessageRequest {
  type: 'image'
  /** 图片url地址 */
  image: string
}

/** embeds消息结构 */
export interface Embeds {
  /** 标题 */
  title: string
  /** 消息弹窗内容 */
  prompt: string
  /** 缩略图 */
  thumbnail: {
    /** 图片地址 */
    url: string
  }
  /** embed 字段数据 */
  fields: Record<string, any>[]
}

/** 发送频道 embed 消息请求参数 */
export interface SendGuildEmbedMessageRequest extends SendGuildMessageID, SendGuildMessageRequest {
  type: 'embed'
  /** embed 消息内容 */
  embed: Embeds
}

/** ark消息结构 */
export interface Ark {
  /** 模版id */
  template_id: number
  /** 模版内变量与填充值的kv映射 */
  kv: {
    key: string
    value: string
    /** 这个嵌套是认真的嘛... */
    obj: {
      obj_kv: {
        key: string
        value: string
      }[]
    }[]
  }[]
}

/** 发送频道 ark 消息请求参数 */
export interface SendGuildArkMessageRequest extends SendGuildMessageID, SendGuildMessageRequest {
  type: 'ark'
  /** ark 消息内容 */
  ark: Ark
}

/** 发送频道 markdown 消息请求参数 */
export interface SendGuildMarkdownMessageRequest extends SendGuildMessageID, SendGuildMessageRequest {
  type: 'markdown'
  /** markdown 消息内容 */
  markdown: Markdown
}

/** 发送频道消息请求参数 */
export type SendGuildMsg = SendGuildTextMessageRequest
  | SendGuildImageMessageRequest
  | SendGuildEmbedMessageRequest
  | SendGuildArkMessageRequest
  | SendGuildMarkdownMessageRequest

// ==============以下是接口响应================

/** 获取当前机器人详情接口响应 */
export interface GetMeResponse {
  /** 机器人的频道ID */
  id: string
  /** 机器人的昵称 */
  username: string
  /** 用户头像 */
  avatar: string
  /** 特殊关联应用的 openid */
  union_openid: string
  /** 机器人关联的互联应用的用户信息 */
  union_user_account: string
  /** 机器人的分享url */
  share_url: string
  /** 机器人介绍 */
  welcome_msg: string
}

/** 创建私信会话接口响应 */
export interface DmsResponse {
  /** 频道ID 用于私信会话使用 */
  guild_id: string
  /** 子频道ID 用于私信会话使用 */
  channel_id: string
  /** 创建时间 */
  create_time: string
}

/** 发送QQ消息后响应 */
export interface SendQQMsgResponse {
  /** 消息唯一 ID */
  id: string
  /** 发送时间 */
  timestamp: number
}

/** 发送频道消息后响应 */
export interface SendGuildResponse {
  /** 消息唯一 ID */
  id: string
  /** 发送时间 ISO8601 timestamp */
  timestamp: string
}

/** 上传富媒体文件响应 */
export interface UploadMediaResponse {
  /** 文件 ID */
  file_uuid: string
  /** 文件信息，用于发消息接口的 media 字段使用 */
  file_info: string
  /** 有效期，表示剩余多少秒到期，到期后 file_info 失效，当等于 0 时，表示可长期使用 */
  ttl: number
  /** 发送消息的唯一ID，当srv_send_msg设置为true时返回 */
  id: string
}
