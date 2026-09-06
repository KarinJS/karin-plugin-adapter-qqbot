import { Opcode } from './opcode'

/**
 * 富媒体内容类型（附件 MIME 类型）
 *
 * - `image/gif`：GIF 图片
 * - `image/jpeg`：JPEG 图片
 * - `image/png`：PNG 图片
 * - `video/mp4`：MP4 视频
 * - `voice`：语音消息
 * - `file`：官方文档标注为群文件，实测私聊发送的文件也使用该类型
 */
export type ContentType = 'image/gif' | 'image/jpeg' | 'image/png' | 'file' | 'video/mp4' | 'voice'

/**
 * 富媒体附件（官方 `MessageAttachment`）
 */
export interface Attachment {
  /** 附件内容类型（MIME 类型） */
  content_type: ContentType
  /** 附件内容，官方文档未列出该字段 */
  content?: string
  /** 文件名 */
  filename: string
  /** 图片高度（像素），非图片附件无此字段 */
  height?: number
  /** 图片宽度（像素），非图片附件无此字段 */
  width?: number
  /** 文件大小（字节） */
  size: number
  /** 附件下载 URL */
  url: string
  /** 语音消息 SILK 等转换后的 WAV 文件 URL */
  voice_wav_url?: string
  /** 语音消息 ASR 参考结果 */
  asr_refer_text?: string
}

/**
 * 子事件类型（网关下行 payload 的 `t` 字段）
 *
 * 每类事件都需要在开放平台订阅对应的 intents 才会下发，
 * 括号内标注的即为该事件所属的 intents 位。
 */
export const enum EventEnum {
  /** 鉴权成功，网关下发的第一个 Dispatch 事件（仅 WebSocket） */
  READY = 'READY',
  /** 断线重连补发完成（仅 WebSocket） */
  RESUMED = 'RESUMED',
  /** 频道消息（所有消息，需要私域权限）（GUILD_MESSAGES 1<<9） */
  MESSAGE_CREATE = 'MESSAGE_CREATE',
  /** @机器人的频道消息（公域可收）（PUBLIC_GUILD_MESSAGES） */
  AT_MESSAGE_CREATE = 'AT_MESSAGE_CREATE',
  /** 频道私信（DIRECT_MESSAGE 1<<12） */
  DIRECT_MESSAGE_CREATE = 'DIRECT_MESSAGE_CREATE',
  /** 用户单聊机器人（GROUP_AND_C2C_EVENT 1<<25） */
  C2C_MESSAGE_CREATE = 'C2C_MESSAGE_CREATE',
  /** 群聊 @机器人（GROUP_AND_C2C_EVENT 1<<25） */
  GROUP_AT_MESSAGE_CREATE = 'GROUP_AT_MESSAGE_CREATE',
  /** 群聊普通消息，需开通「接收所有消息」（GROUP_AND_C2C_EVENT 1<<25） */
  GROUP_MESSAGE_CREATE = 'GROUP_MESSAGE_CREATE',
  /** 群成员加入（GROUP_AND_C2C_EVENT 1<<25） */
  GROUP_MEMBER_ADD = 'GROUP_MEMBER_ADD',
  /** 群成员退出或被移出（GROUP_AND_C2C_EVENT 1<<25） */
  GROUP_MEMBER_REMOVE = 'GROUP_MEMBER_REMOVE',
  /** 用户添加机器人（GROUP_AND_C2C_EVENT 1<<25） */
  FRIEND_ADD = 'FRIEND_ADD',
  /** 用户删除机器人（GROUP_AND_C2C_EVENT 1<<25） */
  FRIEND_DEL = 'FRIEND_DEL',
  /** 用户在机器人资料卡关闭主动消息推送（GROUP_AND_C2C_EVENT 1<<25） */
  C2C_MSG_REJECT = 'C2C_MSG_REJECT',
  /** 用户在机器人资料卡开启主动消息推送（GROUP_AND_C2C_EVENT 1<<25） */
  C2C_MSG_RECEIVE = 'C2C_MSG_RECEIVE',
  /** 机器人被添加到群聊（GROUP_AND_C2C_EVENT 1<<25） */
  GROUP_ADD_ROBOT = 'GROUP_ADD_ROBOT',
  /** 机器人被移出群聊（GROUP_AND_C2C_EVENT 1<<25） */
  GROUP_DEL_ROBOT = 'GROUP_DEL_ROBOT',
  /** 群管理员在机器人资料页关闭通知（GROUP_AND_C2C_EVENT 1<<25） */
  GROUP_MSG_REJECT = 'GROUP_MSG_REJECT',
  /** 群管理员在机器人资料页开启通知（GROUP_AND_C2C_EVENT 1<<25） */
  GROUP_MSG_RECEIVE = 'GROUP_MSG_RECEIVE',
  /** 互动事件：按钮点击、快捷菜单、消息反馈、授权等（INTERACTION 1<<26） */
  INTERACTION_CREATE = 'INTERACTION_CREATE',
  /** 消息审核通过（MESSAGE_AUDIT 1<<27） */
  MESSAGE_AUDIT_PASS = 'MESSAGE_AUDIT_PASS',
  /** 消息审核不通过（MESSAGE_AUDIT 1<<27） */
  MESSAGE_AUDIT_REJECT = 'MESSAGE_AUDIT_REJECT',
  /** 用户申请加群，仅机器人是群管理员时下发（GROUP_MEMBER_EVENT 1<<24，接口文档 v1.28.0 由 GROUP_AND_C2C_EVENT 调整而来） */
  GROUP_JOIN_REQUEST = 'GROUP_JOIN_REQUEST'
}

/**
 * QQ 消息发送者（官方 `User`）
 *
 * 群聊使用 member_openid；单聊使用 user_openid
 */
export interface QQAuthor {
  /** 用户唯一标识（OpenID 格式），与 user_openid / member_openid 一致 */
  id: string
  /** 用户 OpenID（单聊场景使用） */
  user_openid?: string
  /** 群成员 OpenID（群聊场景使用） */
  member_openid?: string
  /**
   * 消息发送者在群内的身份。
   *
   * 仅群聊消息事件提供：`member`=普通成员，`admin`=管理员，`owner`=群主。
   */
  member_role?: 'owner' | 'admin' | 'member'
  /** 跨应用统一用户 OpenID，需特殊申请，未开通为空字符串 */
  union_openid?: string
  /** 跨应用统一用户账号，需特殊申请，可能为空 */
  union_user_account?: string
  /** 用户昵称（群昵称 / QQ 昵称） */
  username?: string
  /** 是否为机器人 */
  bot?: boolean
}

/**
 * QQ 群消息 mentions 元素
 *
 * 官方文档中 `mentions` 标注为 `User` 数组且不含 @机器人自身，
 * 实际下行报文额外附带 `is_you`、`scope` 两个字段。
 */
export interface QQMention {
  /** 是否为机器人 */
  bot: boolean
  /** 用户唯一标识（OpenID 格式） */
  id: string
  /** 被 @ 成员的群成员 OpenID */
  member_openid: string
  /** 是否 @ 当前机器人 */
  is_you: boolean
  /** @ 范围：`single`=@单人，`everyone`=@全体成员 */
  scope: string
  /** 用户昵称 */
  username: string
}

/**
 * 消息场景上下文（官方 `MessageScene`）
 */
export interface MessageScene {
  /**
   * 扩展数据列表，`key=value` 格式。
   *
   * - `msg_idx=REFIDX_xxx`：当前消息可被引用时使用的索引；
   * - `ref_msg_idx=REFIDX_xxx`：当前消息引用的目标索引；
   * - `auth_token=xxx`：鉴权令牌。
   */
  ext?: string[]
  /** 场景来源：`default`=默认聊天窗口 */
  source?: string
}

/**
 * 结构化卡片消息数据（官方 `ARKData`）
 *
 * 仅 `message_type=3` 时有值。
 */
export interface ARKData {
  /** 卡片消息中的用户操作提示文本 */
  prompt?: string
  /**
   * 卡片消息类型标识。
   *
   * - `tuwen`：图文 H5（如快手分享链接）
   * - `feed`：图文卡片（群相册、频道帖子、分享卡片）
   * - `miniapp`：小程序（微信小程序、QQ 小程序、哔哩哔哩等）
   * - `map`：位置卡片
   * - `contact_card`：好友名片
   * - `video_share`：视频分享
   * - `music_together`：一起听歌
   */
  ark_type?: string
  /** 卡片消息类型的中文名称，如「图文 H5」「小程序」「图文卡片」 */
  ark_name?: string
  /**
   * 卡片消息字段。
   *
   * 常见键名：`tag`/`tags`=来源标签，`title`=标题，`desc`=描述，
   * `jump_url`=跳转链接，`preview`=预览图，`source`=来源名称，
   * `source_logo`=来源图标，`tag_icon`=标签图标，`nickname`=昵称，
   * `avatar`=头像，`address`=地址。
   */
  fields?: Record<string, string>
}

/**
 * QQ 消息元素（官方 `MsgElement`），在引用消息事件中附带引用上下文。
 *
 * 官方报文只提供 `msg_idx`，不会提供被引用消息的正式消息 ID 与发送时间；
 * 适配器以该索引作为 `bot.getMsg` 的可查询消息 ID。
 */
export interface QQReferencedMessageElement {
  /** 该元素对应的消息发送者 */
  author?: Pick<QQAuthor, 'bot' | 'username'>
  /** 消息正文内容 */
  content: string
  /**
   * 消息内容类型。
   *
   * `0`=普通文本，`3`=结构化卡片，`101`=并行消息，`102`=聊天记录，`103`=引用消息。
   */
  message_type?: number
  /** 消息元素在列表中的引用消息索引 */
  msg_idx: string
  /** 该元素携带的附件 */
  attachments?: Attachment[]
  /** 结构化卡片消息数据（message_type=3 时有值） */
  ark_data?: ARKData
  /** 嵌套消息元素列表（递归结构） */
  msg_elements?: QQReferencedMessageElement[]
}

/**
 * 子事件基类
 *
 * 对应网关 payload 中除 `id`、`d` 以外的公共字段。
 */
export interface BaseEvent {
  /** opcode，事件推送固定为 `0` Dispatch */
  op: Opcode.Dispatch
  /** 下行消息序列号，标识消息唯一性，发送心跳时需携带收到的最新值 */
  s: number
  /** 事件类型 */
  t: EventEnum
}

/**
 * READY 事件
 *
 * 仅 WebSocket 模式下发，鉴权成功后网关推送的第一个 Dispatch 事件。
 */
export interface ReadyEvent extends BaseEvent {
  t: EventEnum.READY
  d: {
    /** 协议版本号 */
    version: number
    /** 会话 ID，断线后 resume 时需要回传 */
    session_id: string
    /** 机器人自身信息 */
    user: {
      /** 机器人 ID */
      id: string
      /** 机器人名称 */
      username: string
      /** 是否为机器人，固定为 true */
      bot: boolean
      /** 状态，官方文档未列出该字段 */
      status: number
    }
    /** 分片信息，`[当前分片序号, 分片总数]` */
    shard: number[]
  }
}

/**
 * RESUMED 事件
 *
 * 仅 WebSocket 模式下发，恢复连接后遗漏事件补发完成时推送。
 */
export interface ResumedEvent extends BaseEvent {
  t: EventEnum.RESUMED
}

/**
 * C2C_MESSAGE_CREATE 单聊消息事件
 *
 * 用户给机器人发送单聊消息时触发。
 *
 * 为确保消息可达，相同消息 ID 可能重复推送，
 * 需结合 `message_scene.ext` 中的 `msg_idx` 做去重。
 */
export interface C2CMsgEvent extends BaseEvent {
  t: EventEnum.C2C_MESSAGE_CREATE
  id: string
  d: {
    /** 发送者，单聊场景 `user_openid` 有值 */
    author: QQAuthor
    /** 消息文本内容 */
    content: string
    /** 消息 ID，可用于被动回复和撤回 */
    id: string
    /** 消息发送时间，RFC3339 格式 */
    timestamp: string
    /** 消息附件（图片、文件、语音等） */
    attachments?: Attachment[]
    /** 消息场景上下文（含消息索引、鉴权令牌等） */
    message_scene?: MessageScene
    /** 消息元素列表，`message_type=103` 引用消息时包含被引用内容 */
    msg_elements?: QQReferencedMessageElement[]
    /**
     * 消息内容类型。
     *
     * `0`=普通文本，`3`=结构化卡片（`ark_data` 有值），
     * `101`=并行消息，`102`=聊天记录，
     * `103`=引用消息（`msg_elements` 有值，`message_scene.ext` 含 `ref_msg_idx`）。
     */
    message_type?: number
    /** 结构化卡片消息数据（message_type=3 时有值） */
    ark_data?: ARKData
  }
}

/**
 * 群聊消息事件
 *
 * - GROUP_AT_MESSAGE_CREATE：用户在群里 @机器人，`content` 已去除 @机器人的前缀
 * - GROUP_MESSAGE_CREATE：开启「接收所有消息」后群内的每一条消息，各字段含义与上者一致
 *
 * 为确保消息可达，相同消息 ID 可能重复推送，需结合 `msg_seq` /
 * `message_scene.ext` 中的 `msg_idx` 做去重。
 */
export interface GroupMsgEvent extends BaseEvent {
  t: EventEnum.GROUP_AT_MESSAGE_CREATE | EventEnum.GROUP_MESSAGE_CREATE
  id: string
  d: {
    /** 发送者，群聊场景 `member_openid` 有值 */
    author: QQAuthor
    /** 消息文本内容（已去除 @机器人的前缀） */
    content: string
    /** 与 group_openid 一致 */
    group_id: string
    /** 群 OpenID */
    group_openid: string
    /** 消息 ID，可用于被动回复和撤回 */
    id: string
    /** 消息发送时间，RFC3339 格式 */
    timestamp: string
    /** 消息附件 */
    attachments?: Attachment[]
    /**
     * 消息中 @的用户列表，不含 @机器人自身。
     *
     * GROUP_MESSAGE_CREATE 必带；GROUP_AT_MESSAGE_CREATE 也开始下发。
     */
    mentions?: QQMention[]
    /** 消息场景上下文 */
    message_scene?: MessageScene
    /** 消息元素列表，`message_type=103` 引用消息时包含被引用内容 */
    msg_elements?: QQReferencedMessageElement[]
    /**
     * 消息内容类型，取值同 {@link C2CMsgEvent}。
     *
     * `0`=普通文本，`3`=结构化卡片，`101`=并行消息，`102`=聊天记录，`103`=引用消息。
     */
    message_type?: number
    /** 结构化卡片消息数据（message_type=3 时有值） */
    ark_data?: ARKData
  }
}

/**
 * 频道用户（官方 `User`）
 *
 * 其中的 ID 类数据仅在机器人场景流通，与真实 ID 无关。
 */
export interface GuildUser {
  /** 用户头像地址 */
  avatar: string
  /** 是否为机器人 */
  bot: boolean
  /** 用户 id */
  id: string
  /** 用户名 */
  username: string
}

/**
 * 频道成员信息（官方 `Member`）
 */
export interface GuildMember {
  /** 用户加入频道的时间，ISO8601 格式 */
  joined_at: string
  /** 用户在频道内的昵称 */
  nick: string
  /** 用户在频道内的身份组 ID 列表 */
  roles: string[]
}

/**
 * 频道消息公共字段（官方 `Message` 对象的子集）
 */
export interface GuildBaseEvent {
  /** 消息 id */
  id: string
  /** 消息内容 */
  content: string
  /** 消息创建时间，ISO8601 格式 */
  timestamp: string
  /** 消息创建者 */
  author: GuildUser
  /** 子频道 id */
  channel_id: string
  /** 频道 id */
  guild_id: string
  /**
   * 用于消息间排序，同一子频道内按先后递增，不同子频道之间无法排序。
   *
   * @deprecated 官方标注仅在消息事件中有值，`2022年8月1日` 后续废弃，请使用 `seq_in_channel`
   */
  seq: number
  /** 子频道消息 seq，用于消息间排序，同一子频道内按先后递增 */
  seq_in_channel: number
  /** 消息创建者的 member 信息 */
  member: GuildMember
  /** 引用消息对象 */
  message_reference?: {
    /** 被引用回复的消息 id */
    message_id: string
    /** 是否忽略获取引用消息详情错误，默认否 */
    ignore_get_message_error: boolean
  }
  /** 附件 */
  attachments?: Attachment[]
}

/**
 * 频道消息事件
 *
 * - AT_MESSAGE_CREATE：用户发送消息 @当前机器人或回复机器人消息时
 * - MESSAGE_CREATE：用户在文字子频道内发送的所有聊天消息，仅私域机器人可订阅
 *
 * 为保障投递速度，官方不保证消息严格有序，对顺序敏感时可缓冲后基于 `seq` 排序。
 */
export interface GuildMsgEvent extends BaseEvent {
  t: EventEnum.MESSAGE_CREATE | EventEnum.AT_MESSAGE_CREATE
  id: string
  d: GuildBaseEvent & {
    /** 消息中 @的人 */
    mentions?: GuildUser[]
    /** 是否为 @全员消息 */
    mention_everyone?: boolean
  }
}

/**
 * DIRECT_MESSAGE_CREATE 频道私信
 *
 * 收到用户发给机器人的频道私信消息时触发。
 */
export interface DirectMsgEvent extends BaseEvent {
  t: EventEnum.DIRECT_MESSAGE_CREATE
  id: string
  d: GuildBaseEvent & {
    /** 是否为私信消息 */
    direct_message: boolean
    /** 私信来源频道 id，回复私信时需要使用 */
    src_guild_id: string
  }
}

/**
 * 机器人加入群聊
 *
 * 机器人被添加到群聊时触发。
 */
export interface GroupAddRobotEvent extends BaseEvent {
  t: EventEnum.GROUP_ADD_ROBOT
  id: string
  d: {
    /** 加入时间戳（Unix 秒） */
    timestamp: number
    /** 群 OpenID */
    group_openid: string
    /** 操作添加机器人进群的群成员 OpenID */
    op_member_openid: string
  }
}

/**
 * 机器人退出群聊
 *
 * 机器人被移出群聊时触发。
 */
export interface GroupDelRobotEvent extends BaseEvent {
  t: EventEnum.GROUP_DEL_ROBOT
  id: string
  d: {
    /** 移除时间戳（Unix 秒） */
    timestamp: number
    /** 群 OpenID */
    group_openid: string
    /** 操作移除机器人退群的群成员 OpenID */
    op_member_openid: string
  }
}

/**
 * 群成员加入事件。
 *
 * 有新成员加入群聊时触发。
 * 官方事件只提供加入成员的 OpenID，不提供操作人或加入方式。
 */
export interface GroupMemberAddEvent extends BaseEvent {
  t: EventEnum.GROUP_MEMBER_ADD
  id: string
  d: {
    /** 事件时间戳（Unix 秒） */
    timestamp: number
    /** 群 OpenID */
    group_openid: string
    /** 新加入成员的 OpenID */
    member_openid: string
    /** 新成员的用户 OpenID（跨应用统一标识，可能为空） */
    user_openid?: string
  }
}

/**
 * 群成员退出事件。
 *
 * 群成员退出或被移出群聊时触发。
 * 官方事件只提供退出成员的 OpenID，不提供操作人或退出原因。
 */
export interface GroupMemberRemoveEvent extends BaseEvent {
  t: EventEnum.GROUP_MEMBER_REMOVE
  id: string
  d: {
    /** 事件时间戳（Unix 秒） */
    timestamp: number
    /** 群 OpenID */
    group_openid: string
    /** 退出成员的 OpenID */
    member_openid: string
    /** 退出成员的用户 OpenID（可能为空） */
    user_openid?: string
  }
}

/**
 * 群聊消息接收关闭
 *
 * 群管理员在机器人资料页操作关闭通知时触发，关闭后机器人无法向该群发送主动消息。
 */
export interface GroupMsgRejectEvent extends BaseEvent {
  t: EventEnum.GROUP_MSG_REJECT
  id: string
  d: {
    /** 操作时间戳（Unix 秒） */
    timestamp: number
    /** 群 OpenID */
    group_openid: string
    /** 操作群成员 OpenID */
    op_member_openid: string
  }
}

/**
 * 群聊消息接收开启
 *
 * 群管理员在机器人资料页操作开启通知时触发。
 */
export interface GroupMsgReceiveEvent extends BaseEvent {
  t: EventEnum.GROUP_MSG_RECEIVE
  id: string
  d: {
    /** 操作时间戳（Unix 秒） */
    timestamp: number
    /** 群 OpenID */
    group_openid: string
    /** 操作群成员 OpenID */
    op_member_openid: string
  }
}

/**
 * 用户添加好友
 *
 * 用户添加机器人为好友时触发。
 * 通过 `scene_param` 中的 callback_data 可区分不同来源的添加好友场景。
 */
export interface FriendAddEvent extends BaseEvent {
  t: EventEnum.FRIEND_ADD
  id: string
  d: {
    /** 添加时间戳（Unix 秒） */
    timestamp: number
    /** 用户 OpenID */
    openid: string
    /**
     * 加好友场景值
     *
     * - 1000=缺省默认
     * - 1001=网络搜索（全部 tab）
     * - 1002=网络搜索（机器人 tab），
     * - 1003=群场景，1004=空间场景
     * - 2001=站内分享资料页
     * - 2002=站外分享资料页，
     * - 2003=开发者生成的分享链接（站内）
     * - 2004=开发者生成的分享链接（站外）
     */
    scene?: number
    /** 开发者自定义的回调数据（callback_data），用于区分不同来源 */
    scene_param?: string
    /** 用户信息 */
    author?: {
      /** 用户统一 OpenID（跨应用标识） */
      union_openid: string
    }
    /** 机器人分享链接的短链 code */
    short_code?: string
  }
}

/**
 * 用户删除好友
 *
 * 用户删除机器人好友时触发。
 */
export interface FriendDelEvent extends BaseEvent {
  t: EventEnum.FRIEND_DEL
  id: string
  d: {
    /** 删除时间戳（Unix 秒） */
    timestamp: number
    /** 用户 OpenID */
    openid: string
    /** 用户信息 */
    author?: {
      /** 用户统一 OpenID（跨应用标识） */
      union_openid: string
    }
  }
}

/**
 * 单聊消息接收关闭
 *
 * 用户在机器人资料卡手动关闭「主动消息」推送时触发，
 * 关闭后机器人无法向该用户发送主动消息。
 */
export interface C2CMsgRejectEvent extends BaseEvent {
  t: EventEnum.C2C_MSG_REJECT
  id: string
  d: {
    /** 操作时间戳（Unix 秒） */
    timestamp: number
    /** 用户 OpenID */
    openid: string
  }
}

/**
 * 单聊消息接收开启
 *
 * 用户在机器人资料卡手动开启「主动消息」推送开关时触发，
 * 开启后机器人可向该用户发送主动消息。
 */
export interface C2CMsgReceiveEvent extends BaseEvent {
  t: EventEnum.C2C_MSG_RECEIVE
  id: string
  d: {
    /** 操作时间戳（Unix 秒） */
    timestamp: number
    /** 用户 OpenID */
    openid: string
  }
}

/**
 * 用户申请加群事件
 *
 * 用户申请加群请求触发此事件，只有当机器人是群管理员时才可以收到。
 */
export interface GroupJoinRequestEvent extends BaseEvent {
  t: EventEnum.GROUP_JOIN_REQUEST
  id: string
  d: {
    /** 群 OpenID */
    group_openid: string
    /** 申请 ID，需要在审批接口回传 */
    join_request_id: string
    /**
     * 安全提示语。
     *
     * 可疑消息直接返回 warning_tips；普通消息命中 sec_risk_rules 时返回 top_tips。
     */
    risk_tips: string
    /** 用户在应用 / 开放平台下的统一标识（如有） */
    union_openid?: string
    /** 申请人 openid */
    member_openid: string
    /** 申请人昵称 */
    username: string
    /** 申请时间戳（RFC3339 格式） */
    apply_at: string
    /** 申请来源：`self_apply`=主动申请，`invited`=被邀请 */
    apply_source: 'self_apply' | 'invited'
    /** 邀请人 openid（apply_source=invited 时有效） */
    invited_by?: string
    /** 是否为机器人账号 */
    bot: boolean
    /** 用户入群验证方式 */
    verify_info?: {
      /** 入群验证方式：`verify_message`=验证消息，`admin_review_qa`=管理员问答审核 */
      method: 'verify_message' | 'admin_review_qa'
      /** 验证消息内容；仅 method=verify_message 时可能携带 */
      verify_message: string
      /** 问答列表；仅 method=admin_review_qa 时可能携带 */
      review_qa_list: {
        /** 管理员设置的问题 */
        question: string
        /** 申请人填写的答案 */
        answer: string
      }[]
    },
    /** 自动审批通过的扩展信息，只有在下行事件中会携带 */
    auto_approved?: {
      /** 自动审批通过的策略 ID */
      strategy_id: string
    }
  }
}

/**
 * 互动事件
 *
 * 用户与机器人的互动操作触发此事件，包括消息按钮点击、快捷菜单回调、
 * 消息反馈、清空会话、进出故事集、切换模型、用户 / 群授权等。
 *
 * 仅 `type=11`（消息按钮）和 `type=12`（快捷菜单）需要调用
 * `PUT /interactions/{interaction_id}` 回应，否则客户端会一直 loading 直到超时；
 * 其他类型无需回应。同一 `interaction_id` 只能回应一次，超时后失效。
 */
export interface InteractionEvent extends BaseEvent {
  t: EventEnum.INTERACTION_CREATE
  /** WebSocket Dispatch 外层事件 ID，形如 `INTERACTION_CREATE:uuid`。 */
  id: string
  d: {
    /**
     * 互动类型。
     *
     * - `11`：消息按钮回调（INLINE_KEYBOARD），用户点击消息中的内联键盘按钮
     * - `12`：单聊快捷菜单回调（CALLBACK_COMMAND），用户点击单聊场景下的自定义菜单
     * - `13`：消息反馈（MESSAGE_FEEDBACK），用户对智能体消息进行点赞 / 点踩
     * - `14`：清空会话（CLEAR_SESSION），用户清空智能体会话历史
     * - `15`：进出故事集（IN_OUT_STORY），用户进入或退出故事集
     * - `16`：切换模型（SWITCH_MODEL），用户切换智能体模型
     * - `18`：用户授权（USER_AUTHORIZE）
     * - `19`：群授权（GROUP_AUTHORIZE）
     * - `20`：群授权状态变更（GROUP_AUTHORIZE_STATUS）
     */
    type: number
    /** 事件 ID，用于被动消息发送和互动回调：PUT /interactions/{id}。 */
    id: string
    /** 机器人 AppID。 */
    application_id?: string
    /** 事件发生场景：`c2c`=单聊，`group`=群聊，`guild`=频道。 */
    scene?: 'c2c' | 'group' | 'guild' | string
    /** 聊天场景：0=频道，1=群聊，2=单聊。 */
    chat_type?: 0 | 1 | 2
    /** 触发时间，RFC3339 格式。 */
    timestamp?: string
    /** 频道 OpenID（仅频道场景有值）。 */
    guild_id?: string
    /** 子频道 OpenID（仅频道场景有值）。 */
    channel_id?: string
    /** 用户 OpenID（仅单聊场景有值）。 */
    user_openid?: string
    /** 群 OpenID（仅群聊场景有值）。 */
    group_openid?: string
    /** 群成员 OpenID（仅群聊场景有值）。 */
    group_member_openid?: string
    /** 互动数据。 */
    data: {
      /** 互动数据类型，与外层 `type` 含义一致。 */
      type: number
      /** 解析后的互动数据。 */
      resolved: {
        /** 按钮的 data 字段值（发送消息按钮时设置）；消息反馈场景下为回调数据。 */
        button_data?: string
        /** 按钮的 id 字段值（发送消息按钮时设置）。 */
        button_id?: string
        /** 操作用户 ID（仅频道场景有值）。 */
        user_id?: string
        /** 功能 ID（仅快捷菜单有值，管理端设置）。 */
        feature_id?: string
        /** 操作的消息 ID（频道场景为消息 OpenID；消息反馈场景为机器人消息 ID）。 */
        message_id?: string
        /** 反馈选项（仅 type=13 消息反馈）：`LIKE`=点赞，`UNLIKE`=点踩。 */
        feedback_opt?: string
        /** 反馈选项是否选中（仅 type=13 消息反馈）。 */
        checked?: number
        /**
         * 操作类型。
         *
         * type=15 故事集：`ENTER_STORY`=进入，`QUIT_STORY`=退出；
         * type=16 切换模型：对应操作动作。
         */
        action?: string
        /** 消息场景信息（仅 type=13 消息反馈）。 */
        message_scene?: {
          /** 扩展信息键值对列表，如 `disable_net_search=1` 表示关闭联网搜索。 */
          ext?: string[]
        }
        /** 授权数据（仅 type=18/19 用户 / 群授权事件）。 */
        authorize_data?: {
          /** 授权操作场景：`setting`=资料页设置，`dialog`=弹窗授权。 */
          opt_scene?: string
          /** 授权范围：`c2c_push`=C2C 主动消息推送，`group_push`=群主动消息推送。 */
          scope?: string
        }
        /**
         * 配置更新：群消息模式，`mention`=@机器人时激活，`always`=总是激活。
         *
         * 官方文档未列出该字段。
         */
        require_mention?: string
        /**
         * 配置更新：群消息策略。
         *
         * 官方文档未列出该字段。
         */
        group_policy?: string
        /**
         * 配置更新：@文本的名称提及 BOT 名，多个使用英文逗号分隔。
         *
         * 官方文档未列出该字段。
         */
        mention_patterns?: string
      }
    }
    /** 版本号，默认 1。 */
    version: number
  }
}

/**
 * 消息审核通过（官方 `MessageAudited`）
 *
 * 频道消息审核通过时触发。
 */
export interface MessageAuditPassEvent extends BaseEvent {
  t: EventEnum.MESSAGE_AUDIT_PASS
  id: string
  d: {
    /** 消息审核 id */
    audit_id: string
    /** 消息 id，只有审核通过事件才会有值 */
    message_id?: string
    /** 频道 id */
    guild_id: string
    /** 子频道 id */
    channel_id: string
    /** 消息审核时间，ISO8601 格式 */
    audit_time: string
    /** 消息创建时间，ISO8601 格式 */
    create_time: string
    /** 子频道消息 seq，用于消息间排序，同一子频道内按先后递增 */
    seq_in_channel?: string
  }
}

/**
 * 消息审核不通过（官方 `MessageAudited`）
 *
 * 频道消息审核不通过时触发，此时 `message_id` 无值。
 */
export interface MessageAuditRejectEvent extends BaseEvent {
  t: EventEnum.MESSAGE_AUDIT_REJECT
  id: string
  d: {
    /** 消息审核 id */
    audit_id: string
    /** 消息 id，只有审核通过事件才会有值 */
    message_id?: string
    /** 频道 id */
    guild_id: string
    /** 子频道 id */
    channel_id: string
    /** 消息审核时间，ISO8601 格式 */
    audit_time: string
    /** 消息创建时间，ISO8601 格式 */
    create_time: string
    /** 子频道消息 seq，用于消息间排序，同一子频道内按先后递增 */
    seq_in_channel?: string
  }
}

/**
 * 全部子事件联合
 */
export type Event =
  | ReadyEvent
  | ResumedEvent
  | C2CMsgEvent
  | GroupMsgEvent
  | GuildMsgEvent
  | DirectMsgEvent
  | GroupAddRobotEvent
  | GroupDelRobotEvent
  | GroupMemberAddEvent
  | GroupMemberRemoveEvent
  | GroupMsgRejectEvent
  | GroupMsgReceiveEvent
  | FriendAddEvent
  | FriendDelEvent
  | C2CMsgRejectEvent
  | C2CMsgReceiveEvent
  | InteractionEvent
  | MessageAuditPassEvent
  | MessageAuditRejectEvent
  | GroupJoinRequestEvent
