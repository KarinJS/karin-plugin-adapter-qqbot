import { AdapterBase, logger, buttonHandle, segment, senderGroup } from 'node-karin'
import { QQBotApi } from '@/core/api'
import { sendQQ } from './pipeline-qq'
import { sendGuild } from './pipeline-guild'
import { cacheSelfMessage, prepareSelfMessageCache, shouldCacheSelfMessage } from './self-message-cache'
import { getJoinRequest, removeJoinRequest } from './join-request-cache'
import { getAdapterConfig, setAdapterConfig } from './config-store'
import { getMessageStore, type MessageStore } from '@/core/storage/message'
import { HTTP_URL_RE, MAX_GROUP_MUTE_SECONDS } from '@/core/constants'
import { normalizeMediaElements } from './media-source'
import { buildPendingMarkdownImageLine } from './text-to-md'
import type {
  LogMethodNames, Contact, ElementTypes, Message, SendMsgResults,
  NodeElement, ForwardOptions, MessageResponse, UserInfo, GroupInfo,
  GroupMemberInfo, QQGroupHonorInfo, DownloadFileOptions, DownloadFileResponse,
  CreateGroupFolderResponse, GetGroupFileSystemInfoResponse, GetGroupFileListResponse,
  GetGroupHighlightsResponse, GetAtAllCountResponse, GetGroupMuteListResponse,
  GetRkeyResponse, GetAiCharactersResponse,
  AdapterType,
} from 'node-karin'
import type { QQBotConfig } from '@/types/config'

/**
 * QQ Official Bot 适配器
 *
 * 发送通道由平台能力决定，没有对应的用户配置项：QQ 单聊 / 群聊的自定义 Markdown
 * 已对所有机器人开放，固定走 msg_type=2；频道场景仍需内邀开通，先乐观尝试
 * Markdown，被拒后自动降级为普通消息（详见 pipeline-qq / pipeline-guild 与
 * guild-markdown）。视频 / 语音 / 文件由 pipeline 内部以 msg_type=7 紧随主消息补发。
 */
export class AdapterQQBot extends AdapterBase implements AdapterType {
  /** 与官方 API 交互 */
  public super: QQBotApi
  /** openId / member_openid -> 昵称 缓存 */
  public nicknameCache = new Map<string, string>()

  constructor (cfg: QQBotConfig, api: QQBotApi) {
    super()
    setAdapterConfig(this, cfg)
    this.super = api
    this.adapter.name = 'QQ Official Bot'
    this.adapter.protocol = 'qqbot'
    this.adapter.platform = 'qq'
    this.adapter.standard = 'other'
  }

  /** 当前 bot 配置。真实配置存放在 WeakMap，避免被系统接口序列化整个适配器时带出。 */
  public get cfg (): QQBotConfig {
    return getAdapterConfig(this)
  }

  /** 接收消息的一天热缓存 + SQLite 缓存，用于实现 Karin 标准 `getMsg`。 */
  public get messageStore (): MessageStore {
    return getMessageStore()
  }

  logger (level: LogMethodNames, ...args: any[]) {
    logger.bot(level, this.selfId, ...args)
  }

  /**
   * 主消息回复入口（karin 调用）
   */
  async srcReply (e: Message, elements: ElementTypes[]): Promise<SendMsgResults> {
    const extra = await buttonHandle(e.msg, { e })
    return this.sendMsg(e.contact, [...elements, ...extra])
  }

  /**
   * 发送消息
   */
  async sendMsg (
    contact: Contact,
    elements: Array<ElementTypes>,
    _retryCount?: number
  ): Promise<SendMsgResults> {
    const normalizedElements = normalizeMediaElements(elements)
    /** 发送成功后始终记录消息 ID 映射；正文是否入库由 cacheSelfMessage 内部按开关决定。 */
    if (contact.scene === 'direct' || contact.scene === 'guild') {
      const prepared = shouldCacheSelfMessage(this)
        ? await prepareSelfMessageCache(this, contact, normalizedElements)
        : undefined
      const result = await sendGuild(this, contact as Contact<'guild' | 'direct'>, prepared?.sendElements ?? normalizedElements)
      cacheSelfMessage(this, contact, prepared?.cacheElements ?? [], result)
      return result
    }
    if (contact.scene === 'group' || contact.scene === 'friend') {
      const prepared = shouldCacheSelfMessage(this)
        ? await prepareSelfMessageCache(this, contact, normalizedElements)
        : undefined
      const result = await sendQQ(this, contact as Contact<'friend' | 'group'>, prepared?.sendElements ?? normalizedElements)
      cacheSelfMessage(this, contact, prepared?.cacheElements ?? [], result)
      return result
    }
    throw new Error(`不支持的消息场景: ${contact.scene}`)
  }

  /**
   * 撤回消息
   *
   * 群聊中机器人被群主设为管理员后，也可撤回成员消息；平台仍限制消息发送后两分钟内。
   * REFIDX 与 API 消息 ID 的映射、单聊"是否自己发送"的判定都直接查询
   * SQLite 消息缓存（ID 映射行不受缓存开关影响，始终落库）。
   */
  async recallMsg (contact: Contact, messageId: string): Promise<void> {
    let apiMessageId = messageId
    if (apiMessageId.startsWith('REFIDX_')) {
      const resolved = await this.messageStore
        .resolveApiMessageId(String(this.cfg.appId), contact, apiMessageId)
        .catch(() => null)
      if (resolved) apiMessageId = resolved
    }
    try {
      if (contact.scene === 'friend') {
        const own = await this.messageStore
          .isSelfMessage(String(this.cfg.appId), contact, apiMessageId)
          .catch(() => false)
        if (!own) {
          this.logger('warn', `[recallMsg] QQ 单聊只能撤回机器人自己发送的消息，已跳过撤回: ${messageId}`)
          return
        }
        await this.super.messages.recall('user', contact.peer, apiMessageId)
      } else if (contact.scene === 'group') {
        await this.super.messages.recall('group', contact.peer, apiMessageId)
      } else if (contact.scene === 'direct') {
        await this.super.messages.recall('dms', contact.peer, apiMessageId)
      } else if (contact.scene === 'guild') {
        await this.super.messages.recall('channels', contact.peer, apiMessageId)
      }
    } catch (err) {
      logger.error('撤回消息失败:', err)
    }
  }

  /**
   * 构造空发送结果，pipeline 内填充 rawData
   */
  initSendMsgResults (): SendMsgResults {
    return {
      messageId: '',
      message_id: '',
      time: 0,
      messageTime: 0,
      rawData: [],
    }
  }

  /**
   * 将 rawData[0].id / timestamp 同步到顶层字段
   */
  handleResponse (data: SendMsgResults): SendMsgResults {
    const first = data.rawData[0]
    if (!first) return data
    const { id, timestamp } = first as any
    data.messageId = id
    data.message_id = id
    data.time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
    data.messageTime = data.time
    return data
  }

  // ==================== 以下方法为 AdapterBase 缺失补全 ====================

  /**
   * 发送长消息
   */
  async sendLongMsg (_contact: Contact, _resId: string): Promise<SendMsgResults> {
    // TODO: QQ 官方 Bot API 暂不支持长消息发送
    this.logger('warn', '[sendLongMsg] QQ Official Bot API 暂不支持长消息发送')
    return this.initSendMsgResults()
  }

  /**
   * 发送合并转发消息
   *
   * QQ 官方没有合并转发能力，这里把各节点摊平成一段 Markdown 正文，节点之间用
   * 强制换行隔开，不添加任何前缀提示文本。
   *
   * 图片以 markdown 图片语法写入，**保留原始来源**（本地路径 / base64 / URL）：
   * 究竟走内置图床、第三方 fileToUrl，还是降级成 msg_type=7 富媒体，由发送
   * pipeline 统一决定。这里不自己上传，也不自己判断通道——否则频道场景在没有
   * Markdown 权限时会绕过降级逻辑，直接被平台拒掉。
   *
   * 视频 / 语音 / 文件进不了 markdown，作为普通消息段跟随主消息一起交给 pipeline，
   * 由它在同一次发送里以 msg_type=7 补发。
   */
  async sendForwardMsg (
    contact: Contact,
    elements: Array<NodeElement>,
    _options?: ForwardOptions
  ): Promise<{ messageId: string; forwardId: string }> {
    const parts: string[] = []
    const mediaElements: ElementTypes[] = []

    for (const node of elements) {
      if (node.subType === 'messageID') {
        continue
      }

      const lines: string[] = []
      for (const el of node.message) {
        if (typeof el === 'string') {
          lines.push(el)
          continue
        }

        switch (el.type) {
          case 'text':
            lines.push(el.text)
            break
          case 'image':
            lines.push(buildPendingMarkdownImageLine(
              el.file,
              el.name || '图片',
              el.width && el.height ? { width: el.width, height: el.height } : undefined
            ))
            break
          case 'at': {
            if (contact.scene === 'friend' || contact.scene === 'direct') break
            if (el.targetId === 'all') {
              lines.push('<qqbot-at-everyone />')
            } else {
              lines.push(`<qqbot-at-user id="${el.targetId}" />`)
            }
            break
          }
          case 'markdown':
            lines.push(el.markdown)
            break
          case 'video':
          case 'record':
          case 'file':
            mediaElements.push(el as ElementTypes)
            break
          case 'face':
          case 'reply':
          case 'basketball':
          case 'dice':
          case 'rps':
            break
          default:
            break
        }
      }

      const block = lines.join('\n')
      if (block) parts.push(block)
    }

    const content = parts.join('\r\r\n\n')
    /**
     * 正文可能整段为空（例如只转发了一个视频节点）。此时不能塞一条空 markdown：
     * 平台会以 50041「markdown 有空值」拒绝，pipeline 也会因为没有可发内容而
     * 回落成一条"不支持发送的消息类型"。
     */
    const sendElements = content ? [segment.markdown(content), ...mediaElements] : mediaElements

    if (!sendElements.length) {
      this.logger('warn', '[sendForwardMsg] 转发节点里没有可发送的内容，已跳过')
      return { messageId: '', forwardId: '' }
    }

    const result = await this.sendMsg(contact, sendElements)

    return {
      messageId: result.messageId,
      forwardId: '',
    }
  }

  /**
   * 获取头像 url
   */
  async getAvatarUrl (_userId: string, _size: 0 | 40 | 100 | 140 = 0): Promise<string> {
    return `https://thirdqq.qlogo.cn/qqapp/${this.cfg.appId}/${_userId}/${_size}`
  }

  /**
   * 获取群头像 url
   */
  async getGroupAvatarUrl (_groupId: string, _size: 0 | 40 | 100 | 140 = 0, _history?: number): Promise<string> {
    // TODO: QQ 官方 Bot API 未提供群头像获取接口，暂使用 QQ 群头像 CDN 链接
    return `https://p.qlogo.cn/gh/${_groupId}/${_groupId}/${_size || 100}`
  }

  /**
   * 按消息 ID 获取已接收的消息。
   *
   * QQ 官方 Bot API 没有历史消息查询接口，因此仅从本地缓存读取。
   * 消息在接收时已转换为 Karin elements，最长保留一天；引用消息的 `REFIDX`
   * 索引同样可作为 `messageId` 查询。
   *
   * @param input OneBot v11 标准单参 messageId，或用于限定查询范围的 Contact。
   * @param messageId 当 input 是 Contact 时传入的目标消息 ID。
   * @returns 命中的消息；未命中时返回空消息结构。
   */
  async getMsg (input: Contact | string, messageId?: string): Promise<MessageResponse> {
    /** OneBot v11 标准单参形式：bot.getMsg(messageId)。 */
    const targetId = typeof input === 'string' ? input : messageId || ''
    const contact = typeof input === 'string' ? undefined : input
    if (!this.cfg.messageCache.enable) {
      this.logger('debug', `[getMsg] 消息缓存已关闭: ${targetId || '(empty)'}`)
      return {
        time: 0,
        messageId: targetId,
        messageSeq: 0,
        contact: contact || { scene: 'group', peer: '', subPeer: '', name: '' },
        sender: { userId: '', nick: '', name: '', role: 'member' },
        elements: [],
      }
    }

    const cached = await this.messageStore.get(String(this.cfg.appId), targetId, contact)
    if (cached) return cached

    this.logger('debug', `[getMsg] 本地一天消息缓存未命中: ${targetId || '(empty)'}`)
    return {
      time: 0,
      messageId: targetId,
      messageSeq: 0,
      contact: contact || { scene: 'group', peer: '', subPeer: '', name: '' },
      sender: { userId: '', nick: '', name: '', role: 'member' },
      elements: [],
    }
  }

  /**
   * 获取本地缓存历史消息（仅支持 message_id）
   */
  async getHistoryMsg (contact: Contact, startMsgId: string, count: number): Promise<Array<MessageResponse>>
  /**
   * 获取本地缓存历史消息（message_seq 暂不支持）
   */
  async getHistoryMsg (contact: Contact, startMsgSeq: number, count: number): Promise<Array<MessageResponse>>
  /** @internal */
  async getHistoryMsg (contact: Contact, start: string | number, count = 1): Promise<Array<MessageResponse>> {
    if (typeof start === 'number') {
      this.logger('warn', '[getHistoryMsg] QQ Official Bot 仅支持通过 message_id 获取历史消息，不支持 message_seq')
      return []
    }

    if (!this.cfg.messageCache.enable) {
      this.logger('warn', '[getHistoryMsg] 历史消息缓存为空，请打开“启用数据库缓存消息”开关后再记录历史消息')
      return []
    }

    const history = await this.messageStore.getHistory(String(this.cfg.appId), contact, start, count)
    if (!history.length) {
      this.logger('debug', `[getHistoryMsg] 本地一天历史消息缓存未命中: ${start || '(empty)'}`)
    }
    return history
  }

  /**
   * 获取合并转发消息
   */
  async getForwardMsg (_resId: string): Promise<Array<MessageResponse>> {
    // TODO: QQ 官方 Bot API 暂不支持获取合并转发消息
    this.logger('warn', '[getForwardMsg] QQ Official Bot API 暂不支持获取合并转发消息')
    return []
  }

  /**
   * 获取精华消息
   */
  async getGroupHighlights (_groupId: string, _page: number, _pageSize: number): Promise<Array<GetGroupHighlightsResponse>> {
    // TODO: QQ 官方 Bot API 暂不支持获取精华消息
    this.logger('warn', '[getGroupHighlights] QQ Official Bot API 暂不支持获取精华消息')
    return []
  }

  /**
   * 构造资源 ID
   */
  async createResId (_contact: Contact, _elements: Array<NodeElement>): Promise<string> {
    // TODO: QQ 官方 Bot API 暂不支持构造资源 ID
    this.logger('warn', '[createResId] QQ Official Bot API 暂不支持构造资源 ID')
    return ''
  }

  /**
   * 设置、取消群精华消息
   */
  async setGroupHighlights (_groupId: string, _messageId: string, _create: boolean): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持设置精华消息
    this.logger('warn', '[setGroupHighlights] QQ Official Bot API 暂不支持设置精华消息')
  }

  /**
   * 发送好友赞
   */
  async sendLike (_targetId: string, _count: number): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持发送好友赞
    this.logger('warn', '[sendLike] QQ Official Bot API 暂不支持发送好友赞')
  }

  /**
   * 群踢人
   */
  async groupKickMember (_groupId: string, _targetId: string, _rejectAddRequest?: boolean, _kickReason?: string): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持群踢人
    this.logger('warn', '[groupKickMember] QQ Official Bot API 暂不支持群踢人')
  }

  /**
   * 禁言群成员
   *
   * 机器人需拥有群管理员身份；平台限制最大禁言时长为 30 天，
   * 超出部分会被截断到 30 天而不是直接失败。
   *
   * @param _groupId 群 openid
   * @param _targetId 群成员 openid
   * @param duration 禁言时长（秒），传 0 或负数表示解除禁言
   */
  async setGroupMute (_groupId: string, _targetId: string, duration: number): Promise<void> {
    let rfc3339 = ''
    if (duration > 0) {
      let seconds = duration
      if (seconds > MAX_GROUP_MUTE_SECONDS) {
        this.logger(
          'warn',
          `[setGroupMute] 禁言时长 ${seconds}s 超出平台上限 30 天，已截断为 ${MAX_GROUP_MUTE_SECONDS}s`
        )
        seconds = MAX_GROUP_MUTE_SECONDS
      }
      rfc3339 = new Date(Date.now() + seconds * 1000).toISOString()
    }
    await this.super.groups.setGroupMute(_groupId, _targetId, rfc3339 ? 'add' : 'del', rfc3339)
  }

  /**
   * 群全员禁言
   */
  async setGroupAllMute (_groupId: string, _isBan: boolean): Promise<void> {
    // TODO: 官方仅提供全员禁言的查询能力（restrict_chat_setting 的 global_rule），设置接口未开放
    this.logger(
      'warn',
      '[setGroupAllMute] QQ Official Bot API 暂不支持设置群全员禁言，仅可通过 bot.super.groups.getGroupMuteSetting() 查询 global_rule'
    )
  }

  /**
   * 设置群管理员
   */
  async setGroupAdmin (_groupId: string, _targetId: string, _isAdmin: boolean): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持设置群管理员
    this.logger('warn', '[setGroupAdmin] QQ Official Bot API 暂不支持设置群管理员')
  }

  /**
   * 设置群名片
   */
  async setGroupMemberCard (_groupId: string, _targetId: string, _card: string): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持设置群名片
    this.logger('warn', '[setGroupMemberCard] QQ Official Bot API 暂不支持设置群名片')
  }

  /**
   * 设置群名
   */
  async setGroupName (_groupId: string, _groupName: string): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持设置群名
    this.logger('warn', '[setGroupName] QQ Official Bot API 暂不支持设置群名')
  }

  /**
   * 退出群组
   */
  async setGroupQuit (_groupId: string, _isDismiss: boolean): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持退出群组
    this.logger('warn', '[setGroupQuit] QQ Official Bot API 暂不支持退出群组')
  }

  /**
   * 设置群专属头衔
   */
  async setGroupMemberTitle (_groupId: string, _targetId: string, _title: string): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持设置群专属头衔
    this.logger('warn', '[setGroupMemberTitle] QQ Official Bot API 暂不支持设置群专属头衔')
  }

  /**
   * 获取陌生人信息
   */
  async getStrangerInfo (_targetId: string): Promise<UserInfo> {
    // TODO: QQ 官方 Bot API 暂不支持获取陌生人信息
    this.logger('warn', '[getStrangerInfo] QQ Official Bot API 暂不支持获取陌生人信息')
    return {
      userId: _targetId,
      nick: '',
    }
  }

  /**
   * 获取好友列表
   */
  async getFriendList (_refresh?: boolean): Promise<Array<UserInfo>> {
    // TODO: QQ 官方 Bot API 暂不支持获取好友列表
    this.logger('warn', '[getFriendList] QQ Official Bot API 暂不支持获取好友列表')
    return []
  }

  /**
   * 获取群信息
   *
   * QQ 群走官方 `GET /v2/groups/{group_openid}/info`（白名单接口）；传入的是频道
   * ID 时退回 `GET /guilds/{guild_id}`，这样频道场景下的插件调用也能拿到名称和
   * 人数。两者都不可用（如白名单未开通返回 11253）时降级为空结构并告警。
   *
   * @param _groupId 群 openid 或频道 ID。
   */
  async getGroupInfo (_groupId: string, _noCache?: boolean): Promise<GroupInfo> {
    const empty: GroupInfo = {
      groupId: _groupId,
      groupName: '',
      owner: '',
      groupRemark: '',
      admins: [],
      maxMemberCount: 0,
      memberCount: 0,
      groupDesc: '',
      avatar: '',
    }

    try {
      const info = await this.super.groups.getGroupInfo(_groupId)
      return {
        ...empty,
        groupName: info.group_name || '',
        memberCount: info.group_member_num ?? 0,
        groupDesc: info.group_finger_memo || '',
        avatar: await this.getGroupAvatarUrl(_groupId),
      }
    } catch (err) {
      const guild = await this.super.guilds.getGuild(_groupId).catch(() => null)
      if (guild) {
        return {
          ...empty,
          groupName: guild.name || '',
          owner: guild.owner_id || '',
          memberCount: guild.member_count ?? 0,
          maxMemberCount: guild.max_members ?? 0,
          groupDesc: guild.description || '',
          avatar: guild.icon || '',
        }
      }
      this.logger('warn', `[getGroupInfo] 获取群信息失败: ${err instanceof Error ? err.message : err}`)
      return empty
    }
  }

  /**
   * 获取群列表
   *
   * 官方没有 QQ 群列表接口。频道列表可用 `bot.super.guilds.getGuildList()` 获取，
   * 但频道在 Karin 里属于 guild 场景，与 QQ 群不是同一类会话，因此不在此处混用。
   */
  async getGroupList (_refresh?: boolean): Promise<Array<GroupInfo>> {
    // TODO: QQ 官方 Bot API 暂不支持获取 QQ 群列表（频道列表见 bot.super.guilds.getGuildList）
    this.logger('warn', '[getGroupList] QQ Official Bot API 暂不支持获取群列表，频道列表请用 bot.super.guilds.getGuildList()')
    return []
  }

  /**
   * 获取群成员信息
   *
   * - 查询机器人自身（targetId 为 selfId）走官方 `GET /v2/groups/{group_openid}/bot_state`（白名单）。
   * - 查询其他成员走 `GET /v2/groups/{group_openid}/members/{member_openid}`，
   *   该接口未公开文档，来自腾讯官方 openclaw 插件 v2.0.0，返回结构以平台实际为准。
   * 接口不可用（如白名单未开通返回 11253）时降级为占位结构并告警。
   */
  async getGroupMemberInfo (_groupId: string, _targetId: string, _refresh?: boolean): Promise<GroupMemberInfo> {
    /** 按 karin 接口约定构造返回值，sender 由 getter 即时构建 */
    const build = (userId: string, role: GroupMemberInfo['role'], nick?: string, joinTime?: number): GroupMemberInfo => ({
      userId,
      role,
      nick,
      joinTime,
      get sender () {
        return senderGroup({ userId, nick: nick || '', name: nick || '', role })
      },
    })

    if (_targetId === this.selfId) {
      try {
        const state = await this.super.groups.getBotState(_groupId)
        return build(
          state.member_openid || _targetId,
          state.member_role || 'member',
          undefined,
          state.joined_at ? new Date(state.joined_at).getTime() : undefined
        )
      } catch (err) {
        this.logger('warn', `[getGroupMemberInfo] 获取机器人群内状态失败（该接口为白名单接口，未开通权限会返回 11253）: ${err instanceof Error ? err.message : err}`)
        return build(_targetId, 'member')
      }
    }

    try {
      const member = await this.super.groups.getGroupMember(_groupId, _targetId)
      if (member.nick) this.nicknameCache.set(_targetId, member.nick)
      return build(
        member.member_openid || _targetId,
        member.member_role || 'member',
        member.nick,
        member.joined_at ? new Date(member.joined_at).getTime() : undefined
      )
    } catch (err) {
      this.logger('warn', `[getGroupMemberInfo] 获取群成员详情失败（该接口未公开文档，可能不可用）: ${err instanceof Error ? err.message : err}`)
      return build(_targetId, 'member')
    }
  }

  /**
   * 获取群成员列表
   */
  async getGroupMemberList (_groupId: string, _refresh?: boolean): Promise<Array<GroupMemberInfo>> {
    // TODO: QQ 官方 Bot API 暂不支持获取群成员列表
    this.logger('warn', '[getGroupMemberList] QQ Official Bot API 暂不支持获取群成员列表')
    return []
  }

  /**
   * 获取群荣誉信息
   */
  async getGroupHonor (_groupId: string): Promise<Array<QQGroupHonorInfo>> {
    // TODO: QQ 官方 Bot API 暂不支持获取群荣誉信息
    this.logger('warn', '[getGroupHonor] QQ Official Bot API 暂不支持获取群荣誉信息')
    return []
  }

  /**
   * 设置好友请求结果
   */
  async setFriendApplyResult (_requestId: string, _isApprove: boolean, _remark?: string): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持设置好友请求结果
    this.logger('warn', '[setFriendApplyResult] QQ Official Bot API 暂不支持设置好友请求结果')
  }

  /**
   * 审批入群申请。
   *
   * 走官方 `POST /v2/groups/{group_openid}/approval_join_request/{member_openid}`，
   * 机器人需拥有群管理员身份。Karin 只透传 flag（`join_request_id`），群与申请人
   * openid 由 `join-request-cache` 在收到申请事件时记录，因此仅支持审批本次运行
   * 期间收到过的申请；历史申请请改用
   * `bot.super.groups.getJoinRequestList()` + `bot.super.groups.approvalJoinRequest()`。
   *
   * @param requestId 申请 ID（Karin 请求事件的 flag）。
   * @param isApprove 是否通过。
   * @param denyReason 拒绝理由，仅拒绝时生效。
   */
  async setGroupApplyResult (requestId: string, isApprove: boolean, denyReason?: string): Promise<void> {
    const cached = getJoinRequest(this, requestId)
    if (!cached) {
      this.logger(
        'warn',
        `[setGroupApplyResult] 未找到入群申请索引，无法还原群/申请人 openid: ${requestId || '(empty)'}`
      )
      return
    }

    try {
      await this.super.groups.approvalJoinRequest(cached.groupId, cached.memberId, {
        op: isApprove ? 'approve' : 'decline',
        join_request_id: requestId,
        ...(isApprove ? {} : { reject_reason: denyReason }),
      })
      removeJoinRequest(this, requestId)
    } catch (err) {
      this.logger('error', '[setGroupApplyResult] 审批入群申请失败:', err)
    }
  }

  /**
   * 设置邀请加入群请求结果。
   *
   * 机器人被邀请入群与用户主动申请入群在官方侧是同一条 `GROUP_JOIN_REQUEST`
   * 事件，审批走同一个接口，因此直接复用 {@link AdapterQQBot.setGroupApplyResult}。
   *
   * @param requestId 申请 ID（Karin 请求事件的 flag）。
   * @param isApprove 是否通过。
   */
  async setInvitedJoinGroupResult (requestId: string, isApprove: boolean): Promise<void> {
    await this.setGroupApplyResult(requestId, isApprove)
  }

  /**
   * 设置消息表情回应
   */
  async setMsgReaction (_contact: Contact, _messageId: string, _faceId: number | string, _isSet: boolean): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持设置消息表情回应
    this.logger('warn', '[setMsgReaction] QQ Official Bot API 暂不支持设置消息表情回应')
  }

  /**
   * 上传群文件、私聊文件
   *
   * QQ 官方 Bot API 没有群文件系统，上传走 `POST /v2/{users|groups}/{openid}/files`
   * （file_type=4 + srv_send_msg=true），由服务端直接发送文件消息。
   * 频道 / 频道私信场景官方无文件接口，暂不支持。
   */
  async uploadFile (_contact: Contact, _file: string, _name: string, _folder?: string): Promise<void> {
    if (_contact.scene !== 'friend' && _contact.scene !== 'group') {
      this.logger('warn', '[uploadFile] 频道场景 QQ Official Bot API 暂不支持上传文件')
      return
    }
    const scene = _contact.scene === 'friend' ? 'user' : 'group'
    if (HTTP_URL_RE.test(_file)) {
      await this.super.media.upload(scene, _contact.peer, 'file', _file, true, _name)
    } else {
      await this.super.media.uploadFallback(scene, _contact.peer, 'file', _file, true, _name)
    }
  }

  /**
   * 下载文件到协议端本地
   */
  async downloadFile (_options?: DownloadFileOptions): Promise<DownloadFileResponse> {
    // TODO: QQ 官方 Bot API 暂不支持下载文件到本地
    this.logger('warn', '[downloadFile] QQ Official Bot API 暂不支持下载文件到本地')
    return { filePath: '' }
  }

  /**
   * 创建群文件夹
   */
  async createGroupFolder (_groupId: string, _name: string): Promise<CreateGroupFolderResponse> {
    // TODO: QQ 官方 Bot API 暂不支持创建群文件夹
    this.logger('warn', '[createGroupFolder] QQ Official Bot API 暂不支持创建群文件夹')
    return { id: '', usedSpace: '0' }
  }

  /**
   * 重命名群文件夹
   */
  async renameGroupFolder (_groupId: string, _folderId: string, _name: string): Promise<boolean> {
    // TODO: QQ 官方 Bot API 暂不支持重命名群文件夹
    this.logger('warn', '[renameGroupFolder] QQ Official Bot API 暂不支持重命名群文件夹')
    return false
  }

  /**
   * 删除群文件夹
   */
  async delGroupFolder (_groupId: string, _folderId: string): Promise<boolean> {
    // TODO: QQ 官方 Bot API 暂不支持删除群文件夹
    this.logger('warn', '[delGroupFolder] QQ Official Bot API 暂不支持删除群文件夹')
    return false
  }

  /**
   * 上传群文件
   *
   * 实现同 {@link uploadFile}：官方无群文件系统，走 files 接口由服务端直发文件消息。
   */
  async uploadGroupFile (_groupId: string, _file: string, _name?: string): Promise<boolean> {
    try {
      if (HTTP_URL_RE.test(_file)) {
        await this.super.media.upload('group', _groupId, 'file', _file, true, _name)
      } else {
        await this.super.media.uploadFallback('group', _groupId, 'file', _file, true, _name)
      }
      return true
    } catch (err) {
      this.logger('warn', `[uploadGroupFile] 上传群文件失败: ${err instanceof Error ? err.message : err}`)
      return false
    }
  }

  /**
   * 获取文件 url
   */
  async getFileUrl (_contact: Contact, _fileId: string): Promise<string> {
    // TODO: QQ 官方 Bot API 暂不支持获取文件 url
    this.logger('warn', '[getFileUrl] QQ Official Bot API 暂不支持获取文件 url')
    return ''
  }

  /**
   * 删除群文件
   */
  async delGroupFile (_groupId: string, _fileId: string, _busId: number): Promise<boolean> {
    // TODO: QQ 官方 Bot API 暂不支持删除群文件
    this.logger('warn', '[delGroupFile] QQ Official Bot API 暂不支持删除群文件')
    return false
  }

  /**
   * 获取群文件系统信息
   */
  async getGroupFileSystemInfo (_groupId: string): Promise<GetGroupFileSystemInfoResponse> {
    // TODO: QQ 官方 Bot API 暂不支持获取群文件系统信息
    this.logger('warn', '[getGroupFileSystemInfo] QQ Official Bot API 暂不支持获取群文件系统信息')
    return { fileCount: 0, limitCount: 0, usedSpace: 0, totalSpace: 0 }
  }

  /**
   * 获取群文件夹下文件列表
   */
  async getGroupFileList (_groupId: string, _folderId?: string): Promise<GetGroupFileListResponse> {
    // TODO: QQ 官方 Bot API 暂不支持获取群文件列表
    this.logger('warn', '[getGroupFileList] QQ Official Bot API 暂不支持获取群文件列表')
    return { files: [], folders: [] }
  }

  /**
   * 设置群备注
   */
  async setGroupRemark (_groupId: string, _remark: string): Promise<boolean> {
    // TODO: QQ 官方 Bot API 暂不支持设置群备注
    this.logger('warn', '[setGroupRemark] QQ Official Bot API 暂不支持设置群备注')
    return false
  }

  /**
   * 获取陌生群信息
   */
  async getNotJoinedGroupInfo (_groupId: string): Promise<GroupInfo> {
    // TODO: QQ 官方 Bot API 暂不支持获取陌生群信息
    this.logger('warn', '[getNotJoinedGroupInfo] QQ Official Bot API 暂不支持获取陌生群信息')
    return {
      groupId: _groupId,
      groupName: '',
      owner: '',
      groupRemark: '',
      admins: [],
      maxMemberCount: 0,
      memberCount: 0,
      groupDesc: '',
      avatar: '',
    }
  }

  /**
   * 获取艾特全体成员剩余次数
   */
  async getAtAllCount (_groupId: string): Promise<GetAtAllCountResponse> {
    // TODO: QQ 官方 Bot API 暂不支持获取艾特全体成员剩余次数
    this.logger('warn', '[getAtAllCount] QQ Official Bot API 暂不支持获取艾特全体成员剩余次数')
    return { accessAtAll: false, groupRemainCount: 0, userRremainCount: 0 }
  }

  /**
   * 获取群被禁言用户列表
   *
   * 走官方 `GET /v2/groups/{group_openid}/restrict_chat_setting`，只返回仍在
   * 禁言中的成员（不含已过期）。机器人需拥有群管理员身份，无权限或查询失败时
   * 降级为空数组并告警。
   *
   * `muteTime` 为禁言到期时间的 Unix 秒，而非剩余时长；全员禁言规则不在该返回
   * 结构内，需要时请用 `bot.super.groups.getGroupMuteSetting()` 读取 `global_rule`。
   *
   * @param _groupId 群 openid
   */
  async getGroupMuteList (_groupId: string): Promise<Array<GetGroupMuteListResponse>> {
    try {
      const setting = await this.super.groups.getGroupMuteSetting(_groupId)
      return (setting.members ?? []).map(member => {
        if (member.username) this.nicknameCache.set(member.member_openid, member.username)
        const expireAt = member.mute_expire_at ? Date.parse(member.mute_expire_at) : NaN
        return {
          userId: member.member_openid,
          muteTime: Number.isNaN(expireAt) ? 0 : Math.floor(expireAt / 1000),
        }
      })
    } catch (err) {
      this.logger('warn', `[getGroupMuteList] 获取群禁言列表失败（需机器人具备群管理员身份）: ${err instanceof Error ? err.message : err}`)
      return []
    }
  }

  /**
   * 戳一戳用户
   */
  async pokeUser (_contact: Contact, _targetId: string, _count?: number): Promise<boolean> {
    // TODO: QQ 官方 Bot API 暂不支持戳一戳用户
    this.logger('warn', '[pokeUser] QQ Official Bot API 暂不支持戳一戳用户')
    return false
  }

  /**
   * 获取 Cookies
   */
  async getCookies (_domain: string): Promise<{ cookie: string }> {
    // TODO: QQ 官方 Bot API 暂不支持获取 Cookies
    this.logger('warn', '[getCookies] QQ Official Bot API 暂不支持获取 Cookies')
    return { cookie: '' }
  }

  /**
   * 获取 QQ 相关接口凭证
   */
  async getCredentials (_domain: string): Promise<{ cookies: string; csrf_token: number }> {
    // TODO: QQ 官方 Bot API 暂不支持获取 Credentials
    this.logger('warn', '[getCredentials] QQ Official Bot API 暂不支持获取 Credentials')
    return { cookies: '', csrf_token: 0 }
  }

  /**
   * 获取 CSRF Token
   */
  async getCSRFToken (): Promise<{ token: number }> {
    // TODO: QQ 官方 Bot API 暂不支持获取 CSRF Token
    this.logger('warn', '[getCSRFToken] QQ Official Bot API 暂不支持获取 CSRF Token')
    return { token: 0 }
  }

  /**
   * 设置头像
   */
  async setAvatar (_file: string): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持设置头像
    this.logger('warn', '[setAvatar] QQ Official Bot API 暂不支持设置头像')
  }

  /**
   * 获取 rkey
   */
  async getRkey (): Promise<Array<GetRkeyResponse>> {
    // TODO: QQ 官方 Bot API 暂不支持获取 rkey
    this.logger('warn', '[getRkey] QQ Official Bot API 暂不支持获取 rkey')
    return []
  }

  /**
   * 获取群 Ai 语音可用声色列表
   */
  async getAiCharacters (): Promise<Array<GetAiCharactersResponse>> {
    // TODO: QQ 官方 Bot API 暂不支持获取群 Ai 语音可用声色列表
    this.logger('warn', '[getAiCharacters] QQ Official Bot API 暂不支持获取群 Ai 语音可用声色列表')
    return []
  }

  /**
   * 设置群 Ai 语音声色
   */
  async sendAiCharacter (_groupId: string, _characterId: string, _text: string): Promise<{ messageId: string }> {
    // TODO: QQ 官方 Bot API 暂不支持设置群 Ai 语音声色
    this.logger('warn', '[sendAiCharacter] QQ Official Bot API 暂不支持设置群 Ai 语音声色')
    return { messageId: '' }
  }
}
