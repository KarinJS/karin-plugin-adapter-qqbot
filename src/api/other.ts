import { GroupApi } from './group'
import { common } from 'node-karin'
import { FileEnum, IdType, MessageType, PathType, SendMessageOptions, SendMessageOptionsJson, SeqType, UploadMediaResponse } from '@/types'

export type Params = Array<{ key: string, values: string[] }>

export type getBotInfoType = {
  /** Bot id */
  id: string,
  /** Bot昵称 */
  username: string,
  /** Bot头像 */
  avatar: string,
  /** Bot分享链接 */
  share_url: string,
  /** 欢迎信息 */
  welcome_msg: string,
}

/**
 * 其他API
 */
export class QQBotApi extends GroupApi {
  /**
   * 发送消息
   * @param targetId 用户、群openid
   * @param type 目标所在场景
   * @param options 发送消息参数
   */
  async sendMessage (targetId: string, type: PathType, options: any) {
    const url = `${type === PathType.Friends || type === PathType.Groups ? '/v2' : ''}/${type}/${targetId}/messages`
    const data = await this.post(url, options instanceof FormData ? { body: options } : { json: options })
    return data
  }

  /**
   * 上传富媒体文件
   * @param targetId 用户、群openid
   * @param type 目标所在场景
   * @param file 文件内容 http、base64、file://
   * @param fileType 文件类型
   */
  async uploadMedia (targetId: string, type: PathType, file: string, fileType: FileEnum): Promise<UploadMediaResponse> {
    let options

    /** 非http转base64 */
    if (!file.startsWith('http')) {
      file = await common.base64(file)
      options = {
        file_data: file,
        file_type: fileType,
        srv_send_msg: false,
      }
    } else {
      options = {
        url: file,
        file_type: fileType,
        srv_send_msg: false,
      }
    }

    const url = `/v2/${type}/${targetId}/files`
    return await this.post(url, { json: options })
  }

  /**
   * 传入一个msg_id或者event_id 返回其对应的key和value
   * @param id 消息id或者事件id
   */
  buildId (id: string) {
    if (id.startsWith(':')) {
      return { key: IdType.EventID, value: id }
    } else {
      return { key: IdType.MsgID, value: id }
    }
  }

  /**
   * 构建发送文本消息请求参数
   */
  buildText (content: string, id?: string, seq?: number): SendMessageOptions {
    const options: SendMessageOptions = {
      content,
      msg_type: MessageType.Text,
    }

    /** id存在 */
    if (id) {
      const { key, value } = this.buildId(id)
      options[key] = value
      options[SeqType.MsgSeq] = seq
    }

    return options
  }

  /**
   * 构建发送富媒体请求参数
   * 富媒体消息只能单独发送 并且必须进行上传
   * @param fileInfo 富媒体接口返回的file_info
   * @param id 消息id或者事件id
   */
  buildMedia (fileInfo: string, id?: string, seq?: number): SendMessageOptions {
    const options: SendMessageOptions = {
      content: '',
      msg_type: MessageType.Media,
      media: {
        file_info: fileInfo,
      },
    }

    /** id存在 */
    if (id) {
      const { key, value } = this.buildId(id)
      options[key] = value
      options[SeqType.MsgSeq] = seq
    }

    return options
  }

  /**
   * 构建发送Markdown模板请求参数
   * @param customTemplateId 模板id
   * @param params 模板参数
   * @param id 消息id或者事件id
   * @param seq 消息序号
   */
  buildTplMarkdown (
    customTemplateId: string,
    params: Params,
    keyboard: SendMessageOptions['keyboard'],
    id?: string,
    seq?: number
  ): SendMessageOptions {
    const options: SendMessageOptions = {
      msg_type: MessageType.Markdown,
      content: '',
      keyboard,
      markdown: {
        custom_template_id: customTemplateId,
        params,
      },
    }

    /** id存在 */
    if (id) {
      const { key, value } = this.buildId(id)
      options[key] = value
      options[SeqType.MsgSeq] = seq
    }

    return options
  }

  /**
   * 构建发送原生Markdown请求参数
   * @param content markdown文本
   * @param id 消息id或者事件id
   * @param seq 消息序号
   */
  buildRawMarkdown (
    content: string,
    keyboard: SendMessageOptions['keyboard'],
    reply: SendMessageOptions['message_reference'],
    id?: string,
    seq?: number
  ): SendMessageOptionsJson {
    const options: SendMessageOptionsJson = {
      msg_type: MessageType.Markdown,
      content: '',
      markdown: { content },
      keyboard,
      image: '',
      message_reference: undefined,
    }

    if (reply) options.message_reference = reply

    /** id存在 */
    if (id) {
      const { key, value } = this.buildId(id)
      options[key] = value
      options[SeqType.MsgSeq] = seq
    }

    return options
  }

  /**
   * 获取当前Bot信息
   */
  async getBotInfo () {
    const url = '/users/@me'
    const data = await this.post.get(url) as getBotInfoType
    return data
  }
}
