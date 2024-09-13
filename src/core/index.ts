import FormData from 'form-data'
import { QQBotApi } from './adapter'
import {
  FileType,
  PathType,
  SendMessageOptions,
  C2CMessageCreateEvent,
  GroupAtMessageCreateEvent,
  EventType as QQBotEventType,
  GuildMessageCreateEvent,
  SendChannelMessageOptions,
  IdType,
} from '@/types'

import {
  common,
  GlobalCfgType,
  AccountCfgType,
  common as Common,
  config as Config,
} from '@/utils'

import {
  Role,
  Scene,
  logger,
  Contact,
  karin,
  segment,
  EventType,
  LoggerLevel,
  ReplyReturn,
  KarinMessage,
  KarinAdapter,
  KarinElement,
  MessageSubType,
} from 'node-karin'
import { parseMessage } from '@/markdown/utils'

/**
 * - QQBot适配器
 */
export class AdapterQQBot implements KarinAdapter {
  super: QQBotApi
  socket!: WebSocket
  /** 账号配置类型定义 */
  #config: AccountCfgType
  account: KarinAdapter['account']
  adapter: KarinAdapter['adapter']
  version: KarinAdapter['version']
  markdown: GlobalCfgType
  constructor (config: AccountCfgType) {
    this.#config = config

    const { appId, secret, ...restConfig } = this.#config

    this.markdown = restConfig
    this.account = { uid: appId, uin: appId, name: '' }
    this.adapter = { id: 'QQ', name: 'QQBot', type: 'internal', sub_type: 'internal', start_time: Date.now(), connect: '', index: 0 }
    this.version = { name: 'QQBot', app_name: 'QQBot', version: Config.package.version }

    this.super = new QQBotApi(this.#config)

    switch (this.markdown.sendMode) {
      /** 原生 */
      case 1: {
        this._sendNsg = async (elements, type, openid, message_id) => {
          message_id && elements.push(segment.passive_reply(message_id))
          const contact = karin.contact(parseMessage.parseSceneToKarin(type), openid)
          return await parseMessage.SendMessage(this, contact, elements)
        }
        return
      }
      /** 旧图文模板 */
      case 3: {
        // this._sendNsg = async (elements, type, openid, message_id) => await markdownTemplate({ bot: this, data: elements, type, openid, message_id })
        return
      }
      /** 纯文 现已不能申请 */
      case 4: {
        // 后续处理
        return
      }
      default: {
        logger.warn('后续处理')
      }
    }
  }

  async init () {
    await this.super.getAccessToken()
    await this.super.getWssUrl()
    this.super.createWss()

    /** QQ群聊at */
    this.super.on(QQBotEventType.GROUP_AT_MESSAGE_CREATE, (data: GroupAtMessageCreateEvent) => {
      const user_id = data.d.author.id
      const group_id = data.d.group_id
      const time = new Date(data.d.timestamp).getTime()

      const message = {
        event: EventType.Message as EventType.Message,
        sub_event: MessageSubType.GroupMessage as MessageSubType.GroupMessage,
        raw_event: data,
        event_id: data.id,
        self_id: this.account.uid,
        user_id,
        time,
        message_id: data.d.id,
        message_seq: data.s,
        sender: {
          uid: user_id,
          uin: user_id,
          nick: '',
          role: Role.Unknown as Role.Unknown,
        },
        elements: this.AdapterConvertKarin(data),
        contact: {
          scene: Scene.Group as Scene.Group,
          peer: group_id,
          sub_peer: '',
        },
        group_id,
        raw_message: '',
      }

      const e = new KarinMessage(message)
      e.bot = this
      e.replyCallback = async elements => await this._sendNsg(elements, PathType.Groups, e.contact.peer, e.message_id)

      karin.emit('adapter.message', e)
    })

    /** QQ私聊消息 */
    this.super.on(QQBotEventType.C2C_MESSAGE_CREATE, (data: C2CMessageCreateEvent) => {
      const user_id = data.d.author.user_openid
      const time = new Date(data.d.timestamp).getTime()

      const message = {
        event: EventType.Message as EventType.Message,
        sub_event: MessageSubType.PrivateMessage as MessageSubType.PrivateMessage,
        raw_event: data,
        event_id: data.id,
        self_id: this.account.uid,
        user_id,
        time,
        message_id: data.d.id,
        message_seq: data.s,
        sender: {
          uid: user_id,
          uin: user_id,
          nick: '',
          role: Role.Unknown as Role.Unknown,
        },
        elements: this.AdapterConvertKarin(data),
        contact: {
          scene: Scene.Private as Scene.Private,
          peer: user_id,
          sub_peer: '',
        },
        group_id: '',
        raw_message: '',
      }

      const e = new KarinMessage(message)
      e.bot = this
      e.replyCallback = async elements => await this._sendNsg(elements, PathType.Friends, e.contact.peer, e.message_id)

      karin.emit('adapter.message', e)
    })

    /** QQ频道消息 */
    this.super.on(QQBotEventType.AT_MESSAGE_CREATE, (data: GuildMessageCreateEvent) => {
      const user_id = 'qg_' + data.d.author.id
      const time = new Date(data.d.timestamp).getTime()

      const message = {
        event: EventType.Message as EventType.Message,
        sub_event: MessageSubType.GuildMessage as MessageSubType.GuildMessage,
        raw_event: data,
        event_id: data.id,
        self_id: this.account.uid,
        user_id,
        time,
        message_id: data.d.id,
        message_seq: data.s,
        sender: {
          uid: user_id,
          uin: user_id,
          nick: '',
          role: Role.Unknown as Role.Unknown,
        },
        elements: this.AdapterConvertKarin(data),
        contact: {
          scene: Scene.Guild as Scene.Guild,
          peer: 'qg_' + data.d.guild_id,
          sub_peer: data.d.channel_id,
        },
        group_id: '',
        raw_message: '',
      }

      const e = new KarinMessage(message)
      e.bot = this
      e.replyCallback = async elements => await this._sendNsg(elements, PathType.Channels, data.d.channel_id, e.message_id)

      karin.emit('adapter.message', e)
    })

    /** 等待建立连接 注册Bot */
    this.super.on('start', () => {
      this.account.name = this.super.nick
      this.logger('info', `建立连接成功: ${this.account.name}`)
      /** 注册bot */
      const index = karin.addBot({ type: this.adapter.type, bot: this })
      if (index) this.adapter.index = index
    })
  }

  async _sendNsg (elements: Array<KarinElement>, type: PathType, openid: string, message_id?: string) {
    if (type === PathType.Channels) return await this.KarinConvertAdapterChannel(elements, type, openid, message_id)
    return await this.KarinConvertAdapter(elements, type, openid, message_id)
  }

  get self_id () {
    return this.account.uid
  }

  logger (level: LoggerLevel, ...args: any[]) {
    this.super.logger(level, ...args)
  }

  async GetVersion () {
    const data = this.version
    delete (data as { name?: string }).name
    return data
  }

  /**
   * QQBot转karin
   * @return karin格式消息
   * */
  AdapterConvertKarin (event: C2CMessageCreateEvent | GroupAtMessageCreateEvent | GuildMessageCreateEvent): Array<KarinElement> {
    const elements: Array<KarinElement> = []

    const data = event.d
    /** 检查是否存在图片 */
    for (const v of data.attachments || []) {
      elements.push(segment.image(v.url, {
        name: v.filename,
        // size: v.size,
        height: v.height,
        width: v.width,
        file_type: 'original',
      }))
    }

    const regex = /<faceType=\d+,faceId="\d+",ext="[^"]+">|<@!\d+>|[^<]+/g
    const result = data.content.match(regex) || [data.content]
    result.forEach(v => {
      if (v.startsWith('<faceType=')) {
        const Match = v.match(/faceId="(\d+)"/) as RegExpMatchArray
        elements.push(segment.face(Number(Match[1])))
      } if (v.startsWith('<@!')) {
        const id = v.replace(/^<@!|>$/g, '')
        // todo: 通过循环User拿名称
        elements.push(segment.at(id))
      } else {
        const { regex } = Config.getBotConfig(this.account.uid) || { regex: [] }
        for (const r of regex) {
          const reg = r.reg
          v = v.trim().replace(reg, r.rep)
        }
        elements.push(segment.text(v))
      }
    })

    return elements
  }

  /**
   * karin转qqbot群、私聊
   * @param data karin格式消息
   * */
  async KarinConvertAdapter (data: Array<KarinElement>, type: PathType, openid: string, message_id?: string): Promise<ReplyReturn> {
    let seq = common.random(1, 999999)

    /** 待发送列表 */
    const send_list: SendMessageOptions[] = []

    /** 处理单个KarinElement */
    const processElement = async (i: KarinElement, index: number) => {
      const results = []

      switch (i.type) {
        case 'text': {
          const qr = await Common.getQQBotText(i.text)
          results.push({ index, options: this.super.buildText(qr.text, message_id, ++seq) })
          if (qr.data) {
            const { file_info } = await this.super.uploadMedia(openid, type, qr.data.base64, FileType.Image)
            results.push({ index, options: this.super.buildMedia(file_info, message_id, ++seq) })
          }
          break
        }
        case 'reply':
          // 新增一个字段来进行传参进行被动回复事件更合适
          break
        case 'record': {
          const file = await common.voiceToSilk(i.file)
          const { file_info } = await this.super.uploadMedia(openid, type, file, FileType.Record)
          results.push({ index, options: this.super.buildMedia(file_info, message_id, ++seq) })
          break
        }
        case 'image':
        case 'video':
        case 'file': {
          const fileTypeMap = {
            image: FileType.Image,
            video: FileType.Video,
            file: FileType.File,
          }
          const { file_info } = await this.super.uploadMedia(openid, type, i.file, fileTypeMap[i.type])
          results.push({ index, options: this.super.buildMedia(file_info, message_id, ++seq) })
          break
        }
        default:
          break
      }

      return results
    }

    /** 采用并发上传 */
    const allResults = await Promise.all(data.map(processElement))

    /** 整理发送列表 */
    allResults.flat().sort((a, b) => a.index - b.index).forEach(result => {
      send_list.push(result.options)
    })

    const result: ReplyReturn = {
      message_id: '',
      message_time: 0,
      raw_data: [],
    }

    /** 并发发送 */
    await Promise.all(send_list.map(async (v, index) => {
      if (index !== 0) await new Promise(resolve => setTimeout(resolve, index * 100))
      const res = await this.super.sendMessage(openid, type, v)
      result.raw_data.push(res)
    }))

    if (result.raw_data.length > 0) {
      result.message_id = result.raw_data[0].id
      result.message_time = result.raw_data[0].time
    }

    return result
  }

  /**
   * karin转qqbot文字子频道、频道私聊
   */
  async KarinConvertAdapterChannel (data: Array<KarinElement>, type: PathType, openid: string, message_id?: string): Promise<ReplyReturn> {
    const image = []
    const content: string[] = []
    /** 待发送列表 */
    const sendList: { index: number, options: SendChannelMessageOptions }[] = []

    /** 先循环一次 进行分类 */
    for (const v of data) {
      switch (v.type) {
        case 'text':
          content.push(v.text)
          break
        case 'image':
          image.push(v.file)
          break
        default:
          content.push(`[未知消息类型:${JSON.stringify(v)}]`)
      }
    }

    /** 看第一个图片是不是http */
    if (image.length > 0 && image[0].startsWith('http')) {
      const options: SendChannelMessageOptions = {
        content: content.join(''),
        /** http地址直接丢给平台转存 */
        image: image.shift(),
      }
      if (message_id) options[IdType.MsgID] = message_id
      sendList.push({ index: -1, options })
    } else if (image.length) {
      /** 如果不是 就转FormData */
      const img = image.shift()
      const file = await common.buffer(img as string)
      const formData = new FormData()
      formData.append('content', content.join(''))
      formData.append('file_image', file)
      if (message_id) formData.append(IdType.MsgID, message_id)
      sendList.push({ index: -1, options: formData as any })
    } else {
      /** 没有图片 */
      const options: SendChannelMessageOptions = { content: content.join('') }
      if (message_id) options[IdType.MsgID] = message_id
      sendList.push({ index: -1, options })
    }

    const result: ReplyReturn = {
      message_id: '',
      message_time: 0,
      raw_data: [],
    }

    /** 并发发送 */
    await Promise.all(sendList.map(async (v, index) => {
      if (index !== 0) await new Promise(resolve => setTimeout(resolve, index * 100))
      const res = await this.super.sendChannelText(openid, v.options)
      result.raw_data.push(res)
    }))

    if (result.raw_data.length > 0) {
      result.message_id = result.raw_data[0].id
      result.message_time = result.raw_data[0].time
    }

    return result
  }

  async SendMessage (contact: Contact, elements: Array<KarinElement>) {
    const text = []
    for (const v of elements) {
      switch (v.type) {
        case 'at':
          text.push(`@${v.uid}`)
          break
        case 'face':
          text.push(`[表情:${v.id}]`)
          break
        case 'text':
          text.push(v.text)
          break
        case 'image':
          // text.push(await this.#MsgToFile(v.type, v.file))
          break
        default:
          text.push(`[未知消息类型:${JSON.stringify(v)}]`)
      }
    }
    this.logger('info', `${logger.green('Send private input: ')}${text.join('')}`)
    return { message_id: 'input' }
  }

  getAvatarUrl (user_id: string, size = 0): string {
    if (user_id === this.account.uid) return this.super.avatar
    return `https://q.qlogo.cn/qqapp/${this.account.uid}/${user_id}/${size}`
  }

  getGroupAvatarUrl () {
    return 'https://p.qlogo.cn/gh/967068507/967068507/0'
  }

  async GetCurrentAccount () {
    return { account_uid: 'input', account_uin: 'input', account_name: 'input' }
  }

  async GetEssenceMessageList (): Promise<any> { throw new Error('Method not implemented.') }
  async DownloadForwardMessage (): Promise<any> { throw new Error('Method not implemented.') }
  async SetEssenceMessage (): Promise<any> { throw new Error('Method not implemented.') }
  async DeleteEssenceMessage (): Promise<any> { throw new Error('Method not implemented.') }
  async SetFriendApplyResult (): Promise<any> { throw new Error('Method not implemented.') }
  async SetGroupApplyResult (): Promise<any> { throw new Error('Method not implemented.') }
  async SetInvitedJoinGroupResult (): Promise<any> { throw new Error('Method not implemented.') }
  async ReactMessageWithEmoji (): Promise<any> { throw new Error('Method not implemented.') }
  async UploadPrivateFile (): Promise<any> { throw new Error('Method not implemented.') }
  async UploadGroupFile (): Promise<any> { throw new Error('Method not implemented.') }
  async UploadForwardMessage (): Promise<any> { throw new Error('Method not implemented.') }
  async sendForwardMessage (): Promise<any> { throw new Error('Method not implemented.') }
  async SendMessageByResId (): Promise<any> { throw new Error('Method not implemented.') }
  async RecallMessage (): Promise<any> { throw new Error('Method not implemented.') }
  async GetMessage (): Promise<any> { throw new Error('Method not implemented.') }
  async GetHistoryMessage (): Promise<any> { throw new Error('Method not implemented.') }
  async VoteUser (): Promise<any> { throw new Error('Method not implemented.') }
  async KickMember (): Promise<any> { throw new Error('Method not implemented.') }
  async BanMember (): Promise<any> { throw new Error('Method not implemented.') }
  async SetGroupWholeBan (): Promise<any> { throw new Error('Method not implemented.') }
  async SetGroupAdmin (): Promise<any> { throw new Error('Method not implemented.') }
  async ModifyMemberCard (): Promise<any> { throw new Error('Method not implemented.') }
  async ModifyGroupName (): Promise<any> { throw new Error('Method not implemented.') }
  async LeaveGroup (): Promise<any> { throw new Error('Method not implemented.') }
  async SetGroupUniqueTitle (): Promise<any> { throw new Error('Method not implemented.') }
  async GetStrangerProfileCard (): Promise<any> { throw new Error('Method not implemented.') }
  async GetFriendList (): Promise<any> { throw new Error('Method not implemented.') }
  async GetGroupInfo (): Promise<any> { throw new Error('Method not implemented.') }
  async GetGroupList (): Promise<any> { throw new Error('Method not implemented.') }
  async GetGroupMemberInfo (): Promise<any> { throw new Error('Method not implemented.') }
  async GetGroupMemberList (): Promise<any> { throw new Error('Method not implemented.') }
  async GetGroupHonor (): Promise<any> { throw new Error('Method not implemented.') }
  async DownloadFile (): Promise<any> { throw new Error('Method not implemented.') }
  async CreateFolder (): Promise<any> { throw new Error('Method not implemented.') }
  async RenameFolder (): Promise<any> { throw new Error('Method not implemented.') }
  async DeleteFolde (): Promise<any> { throw new Error('Method not implemented.') }
  async DeleteFolder (): Promise<any> { throw new Error('Method not implemented.') }
  async UploadFile (): Promise<any> { throw new Error('Method not implemented.') }
  async DeleteFile (): Promise<any> { throw new Error('Method not implemented.') }
  async GetFileSystemInfo (): Promise<any> { throw new Error('Method not implemented.') }
  async GetFileList (): Promise<any> { throw new Error('Method not implemented.') }
  async ModifyGroupRemark (): Promise<any> { throw new Error('Method not implemented.') }
  async GetRemainCountAtAll (): Promise<any> { throw new Error('Method not implemented.') }
  async GetProhibitedUserList (): Promise<any> { throw new Error('Method not implemented.') }
  async PokeMember (): Promise<any> { throw new Error('Method not implemented.') }
  async SetMessageReaded (): Promise<any> { throw new Error('Method not implemented.') }
}

const list = Object.keys(Config.Config.accounts).filter(v => v !== 'default')
for (const v of list) {
  const config = Config.getBotConfig(v)
  if (!config) continue
  new AdapterQQBot(config).init()
}
