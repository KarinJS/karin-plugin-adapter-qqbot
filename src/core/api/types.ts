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

// ==============以下是自定义菜单相关的接口================

/** 自定义菜单按钮类型 */
export type MenuItemType = 'switch' | 'send_message' | 'link' | 'menu'

/** 自定义菜单开关配置（仅 type=switch 时有效） */
export interface MenuSwitch {
  /**
   * 开关唯一标识
   *
   * 用户切换开关状态后会发送一条消息，消息 `ext` 字段中携带 `{switch_id}=1`；
   * 关闭后不携带该标识。
   */
  switch_id?: string
  /** 开关的初始状态，true 默认打开 */
  default?: boolean
}

/** 自定义菜单二级菜单项（不支持再嵌套子菜单） */
export interface SubMenuItem {
  /** 按钮名称，最多 14 个字符（约 7 个中文汉字） */
  name?: string
  /** 按钮类型，二级菜单仅支持 send_message / link */
  type?: Extract<MenuItemType, 'send_message' | 'link'>
  /** 发送的内容，仅 type=send_message 时有效，用户点击后自动填入输入框 */
  send_message?: string
  /** 跳转链接，仅 type=link 时有效，必须以 https:// 开头 */
  link?: string
}

/** 自定义菜单一级菜单项 */
export interface MenuItem {
  /** 按钮名称，最多 10 个字符（一个中文汉字算 2 个字符） */
  name?: string
  /** 按钮类型 */
  type?: MenuItemType
  /** 子菜单列表，仅 type=menu 时有效，最多 5 个 */
  sub_menu_items?: SubMenuItem[]
  /** 发送的内容，仅 type=send_message 时有效，用户点击后自动填入输入框 */
  send_message?: string
  /** 跳转链接，仅 type=link 时有效，必须以 https:// 开头 */
  link?: string
  /** 开关配置，仅 type=switch 时有效 */
  switch?: MenuSwitch
}

/** 自定义菜单配置 */
export interface Menu {
  /** 菜单项列表，最多 10 个，按列表顺序从左到右展示 */
  items?: MenuItem[]
}

/** 查询全局自定义菜单响应（GET /v2/menu） */
export interface GetMenuResponse {
  /** 当前菜单的版本号 */
  version: number
  /** 当前生效的菜单配置；未设置过菜单时该字段为空 */
  menu?: Menu
}

/** 修改全局自定义菜单响应（PUT /v2/menu） */
export interface UpdateMenuResponse {
  /** 本次修改后的菜单版本号，可用于后续判断配置是否有变更 */
  version: number
}

// ==============以下是指令面板相关的接口================

/** 指令面板生效场景：c2c 单聊 / group 群聊 / channel 文字子频道 / dm 频道私信 */
export type PanelScope = 'c2c' | 'group' | 'channel' | 'dm'

/** 指令面板作用范围：all 全局生效 / specific 指定用户或群生效 */
export type PanelTargetType = 'all' | 'specific'

/** 指令面板元素类型 */
export type PanelItemType = 'command' | 'link'

/** 指令面板元素 */
export interface PanelItem {
  /**
   * 元素名称，最多 14 个字符（约 7 个中文汉字）
   *
   * type=command 时用户点击后该内容会填入聊天输入框；type=link 时仅用于面板展示。
   */
  name?: string
  /** 元素描述，最多 30 个字符（约 15 个中文汉字），在面板中展示给用户 */
  desc?: string
  /** 元素类型 */
  type?: PanelItemType
  /** 是否仅管理员可操作，true 时仅频道/群管理员可点击 */
  only_admin?: boolean
  /** 跳转链接，仅 type=link 时有效，必须以 https:// 开头 */
  link?: string
}

/** 指令面板配置内容 */
export interface Panel {
  /** 面板元素列表，一个面板最多配置 20 个元素 */
  items?: PanelItem[]
  /** 面板备注，最多 255 个字符，不对用户展示 */
  remark?: string
  /** 当前版本号 */
  version?: number
}

/** 查询指令面板列表查询参数（GET /v2/panels） */
export interface GetPanelListParams {
  /** 生效场景，必填 */
  scope: PanelScope
  /** 分页游标，首次请求不传或传空串，后续传上次响应的 next_cursor */
  cursor?: string
  /** 每页拉取条数，默认 20，最大 50 */
  limit?: number
}

/** 指令面板记录 */
export interface PanelRecord {
  /** 面板 ID */
  panel_id: string
  /** 生效场景 */
  scope: PanelScope
  /** 作用范围，仅 c2c/group 场景可能为 specific */
  target_type: PanelTargetType
  /** 面板配置内容 */
  panel: Panel
  /** 面板创建时间，RFC3339 格式 */
  created_at?: string
  /** 面板更新时间，RFC3339 格式 */
  updated_at?: string
  /** 面板版本号 */
  version: number
}

/** 查询指令面板列表响应（GET /v2/panels） */
export interface GetPanelListResponse {
  /** 面板记录列表，按设置时间倒序排列 */
  records: PanelRecord[]
  /** 下一页游标，空串表示已到最后一页 */
  next_cursor: string
  /** 是否已拉取到最后一页 */
  is_end: boolean
}

/** 创建指令面板请求体（POST /v2/panels） */
export interface CreatePanelRequest {
  /** 生效场景，channel / dm 场景 target_type 只能为 all */
  scope: PanelScope
  /** 作用范围，仅 c2c / group 场景支持 specific */
  target_type?: PanelTargetType
  /** 用户 openid 列表，仅 c2c 场景且 target_type=specific 时有效，一次最多 20 个 */
  user_openids?: string[]
  /** 群 openid 列表，仅 group 场景且 target_type=specific 时有效，一次最多 20 个 */
  group_openids?: string[]
  /** 面板配置内容 */
  panel: Panel
}

/** 创建指令面板响应（POST /v2/panels） */
export interface CreatePanelResponse {
  /** 新创建的面板 ID，后续修改、删除、查询详情均需使用此 ID */
  panel_id: string
}

/** 查询指令面板详情响应（GET /v2/panels/{panel_id}） */
export interface GetPanelResponse extends PanelRecord {
  /** 关联的用户 openid 列表，仅 c2c 场景且 target_type=specific 时返回，最多 1000 条 */
  user_openids?: string[]
  /** 关联的群 openid 列表，仅 group 场景且 target_type=specific 时返回，最多 1000 条 */
  group_openids?: string[]
}

/** 修改指令面板响应（PUT /v2/panels/{panel_id}） */
export interface UpdatePanelResponse {
  /** 本次修改后的面板版本号 */
  version: number
}

/** 修改指令面板关联对象请求体（PUT /v2/panels/{panel_id}/target） */
export interface UpdatePanelTargetRequest {
  /** 操作类型：add 添加关联对象 / del 移除关联对象 */
  op: 'add' | 'del'
  /** 用户 openid 列表，仅 c2c 场景有效，一次最多 20 个 */
  user_openids?: string[]
  /** 群 openid 列表，仅 group 场景有效，一次最多 20 个 */
  group_openids?: string[]
}

// ==============以下是频道 / 子频道相关的接口================

/** 频道信息 */
export interface GuildInfo {
  /** 频道 ID */
  id: string
  /** 频道名称 */
  name: string
  /** 频道头像 URL */
  icon?: string
  /** 频道创建者 ID */
  owner_id?: string
  /** 当前机器人是否为频道创建者 */
  owner?: boolean
  /** 加入时间，ISO8601 格式 */
  joined_at?: string
  /** 频道成员数 */
  member_count?: number
  /** 频道成员上限 */
  max_members?: number
  /** 频道简介 */
  description?: string
}

/** 获取机器人加入的频道列表查询参数（GET /users/@me/guilds） */
export interface GetGuildListParams {
  /** 读取此 guild_id 之前的数据，设置时先反序再分页 */
  before?: string
  /** 读取此 guild_id 之后的数据，与 before 同时设置时 after 无效 */
  after?: string
  /** 每次拉取条数，默认 100，最大 100 */
  limit?: number
}

/** 子频道类型：0=文字，2=语音，4=分组，10005=直播，10006=应用，10007=论坛 */
export type ChannelType = 0 | 2 | 4 | 10005 | 10006 | 10007

/** 文字子频道子类型：0=闲聊，1=公告，2=攻略，3=开黑 */
export type ChannelSubType = 0 | 1 | 2 | 3

/** 子频道私密类型：0=公开，1=群主管理员可见，2=群主管理员+指定成员 */
export type ChannelPrivateType = 0 | 1 | 2

/** 子频道发言权限：0=无效，1=所有人，2=群主管理员+指定成员 */
export type ChannelSpeakPermission = 0 | 1 | 2

/** 子频道信息 */
export interface ChannelInfo {
  /** 子频道 ID */
  id: string
  /** 所属频道 ID */
  guild_id: string
  /** 子频道名 */
  name: string
  /** 子频道类型 */
  type: ChannelType
  /** 子频道子类型（文字子频道） */
  sub_type?: ChannelSubType
  /** 排序值，从 1 开始 */
  position?: number
  /** 所属分组 ID（仅子频道有效） */
  parent_id?: string
  /** 创建人 ID */
  owner_id?: string
  /** 子频道私密类型 */
  private_type?: ChannelPrivateType
  /** 子频道发言权限 */
  speak_permission?: ChannelSpeakPermission
  /** 应用子频道标识 */
  application_id?: string
  /** 用户拥有的子频道权限 */
  permissions?: string
}

/** 创建子频道请求体（POST /guilds/{guild_id}/channels） */
export interface CreateChannelRequest {
  /** 子频道名称 */
  name?: string
  /** 子频道类型 */
  type?: ChannelType
  /** 子频道子类型 */
  sub_type?: ChannelSubType
  /** 排序值（分组类型必须 >= 2） */
  position?: number
  /** 所属分组 ID */
  parent_id?: string
  /** 私密类型 */
  private_type?: ChannelPrivateType
  /** 私密成员 ID 列表 */
  private_user_ids?: string[]
  /** 发言权限 */
  speak_permission?: ChannelSpeakPermission
  /** 应用子频道 AppID */
  application_id?: string
}

/** 修改子频道请求体（PATCH /channels/{channel_id}），只需传入要修改的字段 */
export interface UpdateChannelRequest {
  /** 子频道名 */
  name?: string
  /** 排序 */
  position?: number
  /** 分组 ID */
  parent_id?: string
  /** 私密类型 */
  private_type?: ChannelPrivateType
  /** 发言权限 */
  speak_permission?: ChannelSpeakPermission
}

/** 生成分享链接请求体（POST /v2/generate_url_link） */
export interface GenerateUrlLinkRequest {
  /** 需要跳转的 URL */
  url_link?: string
  /**
   * 开发者自定义回调数据，最长 32 字符
   *
   * 用户通过该链接添加机器人时会透传回 `FRIEND_ADD` 事件的 `scene_param`。
   */
  callback_data?: string
}

/** 生成分享链接响应（POST /v2/generate_url_link） */
export interface GenerateUrlLinkResponse {
  /** 生成的分享链接 */
  url_link: string
}

// ==============以下是群禁言状态 / 入群审批相关的接口================

/** 全员禁言模式：none 未开启 / always 始终禁言 / schedule 定时或周期性禁言 */
export type GroupMuteMode = 'none' | 'always' | 'schedule'

/** 定时禁言规则 */
export interface MuteScheduleRule {
  /** 任务 ID */
  task_id: string
  /** 禁言开始时间（RFC3339 格式） */
  start_at: string
  /** 禁言结束时间（RFC3339 格式） */
  end_at: string
  /** 此规则是否启用 */
  enabled: boolean
}

/** 周期禁言规则 */
export interface MuteRecurringRule {
  /** 任务 ID */
  task_id: string
  /** 生效星期几列表，取值 1~7（1=周一，7=周日） */
  weekdays: number[]
  /** 时段开始时间，格式 HH:mm（北京时间） */
  start_time: string
  /** 时段结束时间，格式 HH:mm（北京时间）；小于 start_time 表示跨天到次日 */
  end_time: string
  /** 此规则是否启用 */
  enabled: boolean
}

/** 群级禁言规则（全员禁言配置） */
export interface GlobalMuteRule {
  /** 全员禁言模式 */
  mode: GroupMuteMode
  /** 定时禁言规则列表 */
  schedule_rules?: MuteScheduleRule[]
  /** 周期禁言规则列表 */
  recurring_rules?: MuteRecurringRule[]
}

/** 成员禁言状态 */
export interface MemberMuteState {
  /** 被禁言成员的 openid */
  member_openid: string
  /** 禁言到期时间（RFC3339 格式） */
  mute_expire_at: string
  /** 被禁言成员的昵称 */
  username?: string
  /** 用户在应用/开放平台下的统一标识 */
  union_openid?: string
}

/** 查询群禁言状态响应（GET /v2/groups/{group_openid}/restrict_chat_setting） */
export interface GetGroupMuteSettingResponse {
  /** 群级禁言规则 */
  global_rule?: GlobalMuteRule
  /** 当前处于禁言中的用户列表（不含已过期） */
  members?: MemberMuteState[]
}

/** 入群验证方式 */
export interface JoinRequestVerifyInfo {
  /** 入群验证方式 */
  method: 'verify_message' | 'admin_review_qa'
  /** 验证消息内容，仅 method=verify_message 时可能携带 */
  verify_message?: string
  /** 问答列表，仅 method=admin_review_qa 时可能携带 */
  review_qa_list?: {
    /** 管理员设置的问题 */
    question: string
    /** 申请人填写的答案 */
    answer: string
  }[]
}

/** 入群申请 */
export interface JoinRequest {
  /** 申请 ID，需要在审批接口回传 */
  join_request_id: string
  /** 安全提示语 */
  risk_tips?: string
  /** 用户在应用/开放平台下的统一标识 */
  union_openid?: string
  /** 申请人 openid */
  member_openid: string
  /** 申请人昵称 */
  username?: string
  /** 申请时间戳（RFC3339 格式） */
  apply_at?: string
  /** 申请来源：self_apply 主动申请，invited 被邀请 */
  apply_source?: 'self_apply' | 'invited'
  /** 邀请人 openid（apply_source=invited 时有效） */
  invited_by?: string
  /** 是否为机器人账号 */
  bot?: boolean
  /** 用户入群验证方式 */
  verify_info?: JoinRequestVerifyInfo
}

/** 入群申请列表查询参数（GET /v2/groups/{group_openid}/join_request_list） */
export interface GetJoinRequestListParams {
  /** 分页游标，首次请求可不传或传空串 */
  cursor?: string
  /** 单页数量，默认 20，最大 100 */
  limit?: number
}

/** 入群申请列表响应（GET /v2/groups/{group_openid}/join_request_list） */
export interface GetJoinRequestListResponse {
  /** 入群申请列表 */
  list: JoinRequest[]
  /** 下一页游标，空串表示已到末页 */
  next_cursor: string
}

/** 入群申请审批请求体（POST /v2/groups/{group_openid}/approval_join_request/{member_openid}） */
export interface ApprovalJoinRequestBody {
  /** 审批动作：approve 通过，decline 拒绝 */
  op: 'approve' | 'decline'
  /** 申请 ID */
  join_request_id?: string
  /** 拒绝理由，op=decline 时可填 */
  reject_reason?: string
  /** 是否同时加入群黑名单，默认 false，op=decline 时可填 */
  add_to_member_blacklist?: boolean
}

// ==============以下是入群自动审批策略相关的接口================

/** 入群自动审批策略 */
export interface JoinApprovalStrategy {
  /** 策略 ID */
  strategy_id: string
  /** 关联的群 openid 列表（创建时使用 group_openids 时返回） */
  group_openids?: string[]
  /** 关联的 QQ 群号列表（创建时使用 group_ids 时返回） */
  group_ids?: string[]
  /** 白名单中的号码数量（估算，可能存在少量误差） */
  whitelist_user_count?: number
  /** 策略是否启用：on 启用 / off 关闭 */
  is_enable: 'on' | 'off'
  /** 过期时间（RFC3339 格式） */
  expire_at?: string
  /** 创建时间（RFC3339 格式） */
  created_at?: string
  /** 最近更新时间（RFC3339 格式） */
  updated_at?: string
  /** 策略备注 */
  remark?: string
}

/** 查询入群自动审批策略列表查询参数（GET /v2/groups/join_approval_strategy） */
export interface GetJoinApprovalStrategyListParams {
  /** 分页游标，首次请求可不传或传空串 */
  cursor?: string
  /** 单页数量，默认 20，最大 100 */
  limit?: number
}

/** 查询入群自动审批策略列表响应 */
export interface GetJoinApprovalStrategyListResponse {
  /** 生效中的策略列表 */
  strategies: JoinApprovalStrategy[]
  /** 下一页游标，空串表示已到末页 */
  next_cursor: string
}

/** 创建入群自动审批策略请求体（POST /v2/groups/join_approval_strategy） */
export interface CreateJoinApprovalStrategyRequest {
  /** 关联的群 openid 列表，最多 100 个；与 group_ids 互斥且二选一必填 */
  group_openids?: string[]
  /** 关联的 QQ 群号列表，最多 100 个；与 group_openids 互斥且二选一必填 */
  group_ids?: string[]
  /** 是否启用策略，默认 on */
  is_enable?: 'on' | 'off'
  /** 过期时间（RFC3339 格式），不传默认一年过期 */
  expire_at?: string
  /** 策略备注，最多 255 个汉字 */
  remark?: string
}

/** 创建入群自动审批策略响应 */
export interface CreateJoinApprovalStrategyResponse {
  /** 服务端生成的策略 ID */
  strategy_id: string
  /** 是否启用 */
  is_enable: 'on' | 'off'
  /** 过期时间（RFC3339 格式） */
  expire_at?: string
}

/** 修改入群自动审批策略请求体（PATCH /v2/groups/join_approval_strategy/{strategy_id}） */
export interface UpdateJoinApprovalStrategyRequest {
  /** 是否启用策略 */
  is_enable?: 'on' | 'off'
  /** 过期时间（RFC3339 格式） */
  expire_at?: string
  /** 关联群增删操作；群标识形式须与创建时一致 */
  group_action?: {
    /** 操作类型：add 新增关联群，del 删除关联群 */
    op: 'add' | 'del'
    /** 待操作的群 openid 列表；与 group_ids 互斥 */
    group_openids?: string[]
    /** 待操作的 QQ 群号列表；与 group_openids 互斥 */
    group_ids?: string[]
  }
  /** 策略备注，最多 255 个汉字 */
  remark?: string
}

/** 修改入群自动审批策略响应 */
export interface UpdateJoinApprovalStrategyResponse {
  /** 是否启用 */
  is_enable: 'on' | 'off'
  /** 过期时间（RFC3339 格式） */
  expire_at?: string
}

/** 修改策略白名单号码请求体（POST /v2/groups/join_approval_strategy/{strategy_id}/whitelist_users） */
export interface UpdateWhitelistUsersRequest {
  /** 操作类型：add 新增号码，del 删除号码 */
  op: 'add' | 'del'
  /** QQ 号码列表，单次最多 10000 个；使用字符串类型避免 JS 精度问题 */
  whitelist_users: string[]
}

/** 修改策略白名单号码响应 */
export interface UpdateWhitelistUsersResponse {
  /** 策略 ID */
  strategy_id: string
  /** 操作后策略当前白名单号码数（估算） */
  whitelist_user_count: number
  /** 策略更新时间（RFC3339 格式） */
  updated_at?: string
}
