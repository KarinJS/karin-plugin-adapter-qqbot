import { Http } from './http'
import type { Scene, MediaType, UploadMediaResponse } from './types'

const FILE_TYPE: Record<MediaType, number> = {
  image: 1,
  video: 2,
  record: 3,
  file: 4,
}

/**
 * 富媒体上传
 */
export class MediaApi extends Http {
  /**
   * @param scene user(单聊) / group(群聊)
   * @param peer openid 或 group_openid
   * @param type 文件类型
   * @param source 必须是 http url 或 base64 字符串
   * @param srvSendMsg 上传后是否由服务端直接发送
   */
  upload (
    scene: Scene,
    peer: string,
    type: MediaType,
    source: string,
    srvSendMsg = false
  ): Promise<UploadMediaResponse> {
    const body: Record<string, unknown> = {
      file_type: FILE_TYPE[type],
      srv_send_msg: srvSendMsg,
    }
    if (source.startsWith('http')) {
      body.url = source
    } else {
      body.file_data = source.replace(/^data:[\w/+-]+;base64,|^base64:\/\//, '')
    }
    return this.post(`/v2/${scene}s/${peer}/files`, body)
  }
}
