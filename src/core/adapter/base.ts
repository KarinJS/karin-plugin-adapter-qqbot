import { AdapterBase, logger, buttonHandle, segment, fileToUrl } from 'node-karin'
import { QQBotApi } from '@/core/api'
import { sendQQ } from './pipeline-qq'
import { sendGuild } from './pipeline-guild'
import { getImageSize } from '@/utils/common'
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
 * 全场景统一走 msg_type=2 Markdown 通道（详见 pipeline-qq / pipeline-guild）。
 * 视频 / 语音 / 文件由 pipeline 内部以 msg_type=7 紧随主消息补发。
 */
export class AdapterQQBot extends AdapterBase implements AdapterType {
  /** 与官方 API 交互 */
  public super: QQBotApi
  /** 当前 bot 配置 */
  public cfg: QQBotConfig
  /** openId / member_openid -> 昵称 缓存 */
  public nicknameCache = new Map<string, string>()

  constructor (cfg: QQBotConfig, api: QQBotApi) {
    super()
    this.cfg = cfg
    this.super = api
    this.adapter.name = 'QQ Official Bot'
    this.adapter.protocol = 'qqbot'
    this.adapter.platform = 'qq'
    this.adapter.standard = 'other'
  }

  logger (level: LogMethodNames, ...args: any[]) {
    logger.bot(level, this.selfId, ...args)
  }

  /**
   * 主消息回复入口（karin 调用）
   */
  async srcReply (e: Message, elements: ElementTypes[]): Promise<SendMsgResults> {
    const extra = this.cfg.keyboard.enable
      ? await buttonHandle(e.msg, { e })
      : []
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
    if (contact.scene === 'direct' || contact.scene === 'guild') {
      return sendGuild(this, contact as Contact<'guild' | 'direct'>, elements)
    }
    if (contact.scene === 'group' || contact.scene === 'friend') {
      return sendQQ(this, contact as Contact<'friend' | 'group'>, elements)
    }
    throw new Error(`不支持的消息场景: ${contact.scene}`)
  }

  /**
   * 撤回消息
   *
   * 群聊中机器人被群主设为管理员后，也可撤回成员消息；平台仍限制消息发送后两分钟内。
   */
  async recallMsg (contact: Contact, messageId: string): Promise<void> {
    try {
      if (contact.scene === 'friend') {
        await this.super.messages.recall('user', contact.peer, messageId)
      } else if (contact.scene === 'group') {
        await this.super.messages.recall('group', contact.peer, messageId)
      } else if (contact.scene === 'direct') {
        await this.super.messages.recall('dms', contact.peer, messageId)
      } else if (contact.scene === 'guild') {
        await this.super.messages.recall('channels', contact.peer, messageId)
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
   * 将 NodeElement 拆解为文本 + 图片等元素，拼接成 markdown 发送。
   * 节点之间仅用换行隔开，不添加任何前缀提示文本。
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
          case 'image': {
            if (el.file.startsWith('http')) {
              try {
                const { width, height } = await getImageSize(el.file)
                lines.push(`![${el.name || '图片'} #${width}px #${height}px](${el.file})`)
              } catch {
                lines.push(`![${el.name || '图片'} #300px #300px](${el.file})`)
              }
            } else {
              try {
                const { url, width, height } = await fileToUrl('image', el.file, el.name || 'image.jpg')
                lines.push(`![${el.name || '图片'} #${width}px #${height}px](${url})`)
              } catch {
                lines.push(`![${el.name || '图片'} #300px #300px]()`)
              }
            }
            break
          }
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
    const result = await this.sendMsg(contact, [segment.markdown(content)])

    if (mediaElements.length) {
      await this.sendMsg(contact, mediaElements)
    }

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
   * 获取消息
   */
  async getMsg (_contact: Contact | string, _messageId?: string): Promise<MessageResponse> {
    // TODO: QQ 官方 Bot API 暂不支持获取消息内容
    this.logger('warn', '[getMsg] QQ Official Bot API 暂不支持获取消息内容')
    const contact = typeof _contact === 'string'
      ? { scene: 'group' as const, peer: _contact, subPeer: '', name: '' }
      : _contact
    return {
      time: 0,
      messageId: _messageId || '',
      messageSeq: 0,
      contact,
      sender: { userId: '', nick: '', name: '', role: 'member' },
      elements: [],
    }
  }

  /**
   * 获取历史消息（通过消息 ID）
   */
  async getHistoryMsg (_contact: Contact, _startMsgId: string, _count: number): Promise<Array<MessageResponse>>
  /**
   * 获取历史消息（通过消息序列号）
   */
  async getHistoryMsg (_contact: Contact, _startMsgSeq: number, _count: number): Promise<Array<MessageResponse>>
  /** @internal */
  async getHistoryMsg (_contact: Contact, _start: string | number, _count: number): Promise<Array<MessageResponse>> {
    // TODO: QQ 官方 Bot API 暂不支持获取历史消息
    this.logger('warn', '[getHistoryMsg] QQ Official Bot API 暂不支持获取历史消息')
    return []
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
   */
  async setGroupMute (_groupId: string, _targetId: string, _duration: number): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持禁言群成员
    this.logger('warn', '[setGroupMute] QQ Official Bot API 暂不支持禁言群成员')
  }

  /**
   * 群全员禁言
   */
  async setGroupAllMute (_groupId: string, _isBan: boolean): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持群全员禁言
    this.logger('warn', '[setGroupAllMute] QQ Official Bot API 暂不支持群全员禁言')
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
   */
  async getGroupInfo (_groupId: string, _noCache?: boolean): Promise<GroupInfo> {
    // TODO: QQ 官方 Bot API 暂不支持获取群信息
    this.logger('warn', '[getGroupInfo] QQ Official Bot API 暂不支持获取群信息')
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
   * 获取群列表
   */
  async getGroupList (_refresh?: boolean): Promise<Array<GroupInfo>> {
    // TODO: QQ 官方 Bot API 暂不支持获取群列表
    this.logger('warn', '[getGroupList] QQ Official Bot API 暂不支持获取群列表')
    return []
  }

  /**
   * 获取群成员信息
   */
  async getGroupMemberInfo (_groupId: string, _targetId: string, _refresh?: boolean): Promise<GroupMemberInfo> {
    // TODO: QQ 官方 Bot API 暂不支持获取群成员信息
    this.logger('warn', '[getGroupMemberInfo] QQ Official Bot API 暂不支持获取群成员信息')
    return {
      userId: _targetId,
      role: 'member',
    } as GroupMemberInfo
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
   * 设置申请加入群请求结果
   */
  async setGroupApplyResult (_requestId: string, _isApprove: boolean, _denyReason?: string): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持设置群申请结果
    this.logger('warn', '[setGroupApplyResult] QQ Official Bot API 暂不支持设置群申请结果')
  }

  /**
   * 设置邀请加入群请求结果
   */
  async setInvitedJoinGroupResult (_requestId: string, _isApprove: boolean): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持设置邀请入群结果
    this.logger('warn', '[setInvitedJoinGroupResult] QQ Official Bot API 暂不支持设置邀请入群结果')
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
   */
  async uploadFile (_contact: Contact, _file: string, _name: string, _folder?: string): Promise<void> {
    // TODO: QQ 官方 Bot API 暂不支持上传文件
    this.logger('warn', '[uploadFile] QQ Official Bot API 暂不支持上传文件')
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
   */
  async uploadGroupFile (_groupId: string, _file: string, _name?: string): Promise<boolean> {
    // TODO: QQ 官方 Bot API 暂不支持上传群文件
    this.logger('warn', '[uploadGroupFile] QQ Official Bot API 暂不支持上传群文件')
    return false
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
   */
  async getGroupMuteList (_groupId: string): Promise<Array<GetGroupMuteListResponse>> {
    // TODO: QQ 官方 Bot API 暂不支持获取群被禁言用户列表
    this.logger('warn', '[getGroupMuteList] QQ Official Bot API 暂不支持获取群被禁言用户列表')
    return []
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
