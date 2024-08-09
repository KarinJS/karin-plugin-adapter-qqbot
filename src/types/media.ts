/**
 * 需要注意 目前只有私聊可以收到file类型的消息
 */
export type Content_type = 'image/gif' | 'image/jpeg' | 'image/png' | 'file'

/**
 * 富媒体文件类型
 */
export const enum FileType {
  /**
   * 图片
   */
  Image = 1,
  /**
   * 视频
   */
  Video = 2,
  /**
   * 语音
   */
  Record = 3,
  /**
   * 文件
   */
  File = 4
}

/**
 * 富媒体基类
 */
export interface Attachment {
  /**
   * 类型
   */
  content_type: Content_type
  /** 未知作用 */
  content?: string
  /**
   * 文件名
   */
  filename: string
  /**
   * 图片高度
   */
  height?: number
  /**
   * 图片宽度
   */
  width?: number
  /**
   * 文件大小
   */
  size: number
  /**
   * 文件url
   */
  url: string
}

/**
 * 富媒体消息结构
 */
export interface MediaType {
  /** 文件信息 */
  file_info: string
}

/**
 * 上传富媒体文件请求参数
 */
export interface UploadMediaOptions {
  /**
   * 媒体的文件类型
   * - 1. 图片 png/jpg
   * - 2. 视频 mp4
   * - 3. 语音 silk
   * - 4. 文件
   */
  file_type: FileType

  /**
   * 媒体资源的URL
   */
  url?: string

  /** 不带前缀的base64 */
  file_data?: string

  /**
   * 是否直接发送消息到目标端
   * 如果设置为 true，将会消耗主动消息频次
   */
  srv_send_msg: boolean
}

/**
 * 上传富媒体文件返回数据
 */
export interface UploadMediaResponse {
  /** 文件 ID */
  file_uuid: string
  /** 文件信息，用于发消息接口的 media 字段使用 */
  file_info: string
  /** 有效期，表示剩余多少秒到期，到期后 file_info 失效，当等于 0 时，表示可长期使用 */
  ttl: number
  /** 发送消息的唯一ID，当srv_send_msg设置为true时返回 */
  id?: string
}
