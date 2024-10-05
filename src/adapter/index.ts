import {
  MessageEvent,
} from '@/types'

import {
  AccountCfgType,
  config as Config,
} from '@/utils'

import {
  karin,
  logger,
  Contact,
  segment,
  LoggerLevel,
  KarinAdapter,
  KarinElement,
} from 'node-karin'
import { QQBotClient } from '@/websocket/client'
import { getBotInfoType, QQBotApi } from '@/api/other'

/**
 * QQBot适配器
 */
export class AdapterQQBot implements KarinAdapter {
  super: QQBotApi
  socket!: WebSocket
  #client: QQBotClient
  #botInfo!: getBotInfoType & { user_id: string }
  account: KarinAdapter['account']
  adapter: KarinAdapter['adapter']
  version: KarinAdapter['version']
  config: AccountCfgType

  constructor (selfId: string, api: QQBotApi, client: QQBotClient) {
    this.account = { uid: selfId, uin: selfId, name: '' }
    this.adapter = { id: 'QQ', name: 'QQBot', type: 'internal', sub_type: 'internal', start_time: Date.now(), connect: '', index: 0 }
    this.version = { name: Config.package.name, app_name: Config.package.name, version: Config.package.version }

    this.super = api
    this.#client = client
    this.config = client.config
    this.#botInfo = {} as getBotInfoType & { user_id: string }

    this.#client.on('start', async data => {
      this.account.name = data.username
      this.#botInfo.user_id = data.id
      /** 注册bot */
      this.logger('info', `建立连接成功: ${this.account.name}`)
      const index = karin.addBot({ type: this.adapter.type, bot: this })
      if (index) this.adapter.index = index

      const info = await api.getBotInfo()
      this.#botInfo = Object.assign(this.#botInfo, info)
    })

    this.#client.on('close', () => karin.delBot(this.adapter.index))
  }

  get self_id () {
    return this.account.uid
  }

  logger (level: LoggerLevel, ...args: any[]) {
    logger.bot(level, this.account.uid || this.account.uin, ...args)
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
  AdapterConvertKarin (event: MessageEvent): Array<KarinElement> {
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

  async SendMessage (contact: Contact, elements: Array<KarinElement>) {
    return { message_id: 'input' }
  }

  getAvatarUrl (userId: string, size = 0): string {
    if (userId === this.account.uid) return this.#botInfo.avatar
    return `https://q.qlogo.cn/qqapp/${this.account.uid}/${userId}/${size}`
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
