import type { karinToQQBot } from 'node-karin'

/** 上传富媒体文件场景 */
export type Scene = 'user' | 'group'
/** 上传富媒体文件类型 */
export type MediaType = 'image' | 'video' | 'record' | 'file'

// ==============以下是QQ好友、群聊相关的接口================

/** 发送QQ消息请求参数基类 */
export interface SendQQMessageRequest {
  /** 消息类型：0 是文本，2 是 markdown， 3 ark，4 embed，6 输入中状态（仅单聊），7 media 富媒体 */
  msg_type: 0 | 2 | 3 | 4 | 6 | 7
}

/** 消息引用对象 */
export interface MessageReference {
  /** 需要引用回复的消息 id */
  message_id: string
  /** 是否忽略获取引用消息详情错误，默认否 */
  ignore_get_message_error?: boolean
}

/** 发送QQ被动消息参数 */
export interface QQMessageID {
  /** 前置收到的事件 ID，用于发送被动消息，支持事件："INTERACTION_CREATE"、"C2C_MSG_RECEIVE"、"FRIEND_ADD" */
  event_id?: string
  /** 前置收到的用户发送过来的消息 ID，用于发送被动（回复）消息 */
  msg_id?: string
  /** 回复消息的序号，与 msg_id 联合使用，避免相同消息id回复重复发送，不填默认是1。相同的 msg_id + msg_seq 重复发送会失败。 */
  msg_seq?: number
  /** 指明发送消息为互动召回消息，与 msg_id，event_id 互斥使用 */
  is_wakeup?: boolean
  /** 引用消息对象，QQ单聊和群聊场景均支持 */
  message_reference?: MessageReference
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

/** markdown 消息结构（官方已全量开放原生 markdown，2.0 不再支持模板模式） */
export interface Markdown {
  /** markdown 文本 */
  content: string
}

/** 按钮消息结构（官方已全量开放自定义 keyboard，2.0 不再支持模板按钮） */
export interface Keyboard {
  content: { rows: ReturnType<typeof karinToQQBot> }
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

/** 发送QQ输入中状态请求参数（仅单聊，客户端展示"正在输入"，窗口约 60 秒） */
export interface SendQQInputNotifyRequest extends SendQQMessageRequest, QQMessageID {
  msg_type: 6
  /** 输入状态 */
  input_notify: {
    /** 输入类型，目前固定为 1（正在输入） */
    input_type: 1
    /** 输入状态展示时长（秒） */
    input_second: number
  }
}

/** 发送QQ流式消息请求参数（POST /v2/users/{openid}/stream_messages，仅单聊） */
export interface SendQQStreamMessageRequest {
  /**
   * 输入模式：
   * - append 增量追加（默认），content_raw 为本次新增内容
   * - replace 全量替换，content_raw 为全量内容，且必须保持已下发内容前缀不变
   */
  input_mode?: 'append' | 'replace'
  /** 输入状态：1 生成中 / 10 正文结束 */
  input_state: 1 | 10
  /** 流式序号，从 0 开始逐帧递增，同一次流的 msg_seq 保持一致 */
  index: number
  /** 内容类型，默认 text */
  content_type?: 'text' | 'markdown'
  /** 内容原文 */
  content_raw: string
  /** 首帧由服务端生成并返回，后续帧需携带 */
  stream_msg_id?: string
  /** 前置事件 ID（被动消息，与 msg_id 二选一） */
  event_id?: string
  /** 前置消息 ID（被动消息，与 event_id 二选一） */
  msg_id?: string
  /** 回复序号，与 msg_id 联合使用 */
  msg_seq?: number
  /** 互动召回消息，与 msg_id、event_id 互斥 */
  is_wakeup?: boolean
}

/** 发送QQ流式消息响应 */
export interface SendQQStreamMessageResponse {
  /** 流式消息 ID，后续帧作为 stream_msg_id 携带 */
  id: string
  /** 发送时间 */
  timestamp: number | string
  /** 剩余可发送字数 */
  remain_msg_len?: number
  /** 扩展信息 */
  ext_info?: {
    /** 当前发送消息可被引用时使用的索引 */
    ref_idx?: string
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
  /** 引用消息对象 */
  message_reference?: MessageReference
}

/** 发送频道引用消息参数 */
export interface SendGuildQuoteMessage {
  /** 引用消息的ID */
  message_id?: string
  /** 是否忽略获取引用消息详情错误，默认否 */
  ignore_get_message_error?: boolean
}

/** 发送频道消息请求参数基类 */
export interface SendGuildMessageRequest {
  /** 单独加一个类型 用于区分不同的消息类型 */
  type: 'text' | 'image' | 'embed' | 'ark' | 'markdown'
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
  /** 按钮 */
  keyboard?: Keyboard
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
  timestamp: number | string
  /** 扩展信息；部分 QQ 消息发送响应会返回可用于 message_reference 的 REFIDX。 */
  ext_info?: {
    /** 当前发送消息可被引用时使用的索引。 */
    ref_idx?: string
  }
}

/** 获取群基础信息接口响应（GET /v2/groups/{group_openid}/info，白名单接口） */
export interface QQGroupInfoResponse {
  /** 群 openid */
  group_openid: string
  /** 群名称 */
  group_name: string
  /** 群简介 */
  group_finger_memo?: string
  /** 群分类文本 */
  group_class_text?: string
  /** 群标签 */
  group_tags?: string[]
  /** 群成员人数 */
  group_member_num?: number
}

/** 获取机器人群内状态接口响应（GET /v2/groups/{group_openid}/bot_state，白名单接口） */
export interface GroupBotStateResponse {
  /** 机器人在群内的 member_openid */
  member_openid: string
  /** 入群时间，RFC3339 格式 */
  joined_at?: string
  /** 是否允许主动发消息 */
  allow_proactive_msg?: boolean
  /** 接收消息设置：all / only_mention / mention_and_context */
  recv_msg_setting?: string
  /** 机器人在群内的角色：owner / admin / member */
  member_role?: 'owner' | 'admin' | 'member'
}

/**
 * 获取群成员详情接口响应（GET /v2/groups/{group_openid}/members/{member_openid}）
 *
 * 该接口未出现在公开文档中，仅在腾讯官方 openclaw 插件
 * （@tencent-connect/openclaw-qqbot v2.0.0）中被作为一等接口使用，返回结构未公开，
 * 字段全部按可选处理，实际以平台返回为准。
 */
export interface QQGroupMemberResponse {
  /** 群成员 openid */
  member_openid?: string
  /** 群成员昵称 */
  nick?: string
  /** 入群时间，RFC3339 格式 */
  joined_at?: string
  /** 群内角色：owner / admin / member */
  member_role?: 'owner' | 'admin' | 'member'
  /** 其余未公开字段原样保留 */
  [key: string]: unknown
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
