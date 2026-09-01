import type { MediaType } from '@/core/api/types'

/** QQ 上传接口的 file_type 取值。 */
export const FILE_TYPE: Record<MediaType, number> = {
  image: 1,
  video: 2,
  record: 3,
  file: 4,
}

/** 各类资源的 QQ 上传上限。 */
export const MAX_UPLOAD_SIZE: Record<MediaType, number> = {
  image: 30 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  record: 20 * 1024 * 1024,
  file: 100 * 1024 * 1024,
}

/** 上传错误中展示的资源类型名称。 */
export const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  image: '图片',
  video: '视频',
  record: '语音',
  file: '文件',
}

/** fileToUrl / 分片上传没有业务文件名时使用的默认值。 */
export const DEFAULT_FILENAME: Record<MediaType, string> = {
  image: 'image.jpg',
  video: 'video.mp4',
  record: 'record.mp3',
  file: 'file.bin',
}

/**
 * 无法从文件名推断类型时，各富媒体类型使用的兜底 MIME。
 *
 * `file` 不在表内：QQ 对 `file_type=4` 不返回 `raw_url`，拿不到直链。
 */
export const DEFAULT_MIME: Partial<Record<MediaType, string>> = {
  image: 'image/jpeg',
  video: 'video/mp4',
  record: 'audio/mpeg',
}

/** fallback 上传超过该大小时走 QQ 分片上传。 */
export const LARGE_UPLOAD_THRESHOLD = 5 * 1024 * 1024

/** COS 用于覆盖下载响应类型的 query 参数名。 */
export const RESPONSE_TYPE_PARAM = 'response-content-type'

/** QQ upload_prepare 需要的前 10,002,432 字节 MD5。 */
export const MD5_10M_SIZE = 10_002_432

/** 富媒体上传比普通接口慢，尤其本地视频会走 file_data。 */
export const MEDIA_UPLOAD_TIMEOUT = 120_000

/** URL 回源下载兜底超时。 */
export const MEDIA_DOWNLOAD_TIMEOUT = 120_000

/** 每个分片 PUT 到 QQ 临时地址的超时时间。 */
export const PART_UPLOAD_TIMEOUT = 300_000

/** 每个分片 PUT 失败后的重试次数。 */
export const PART_UPLOAD_RETRIES = 2

/** upload_part_finish 普通失败重试次数。 */
export const PART_FINISH_RETRIES = 2

/** upload_part_finish 普通失败重试基础间隔。 */
export const PART_FINISH_BASE_DELAY = 1000

/** upload_part_finish 命中这些业务码时，需要按服务端给出的窗口持续重试。 */
export const PART_FINISH_RETRYABLE_CODES = new Set([40093001])

/** 服务端未返回 retry_timeout 时，持续重试的默认时间。 */
export const PART_FINISH_DEFAULT_RETRY_TIMEOUT = 2 * 60 * 1000

/** 持续重试窗口上限，避免服务端返回异常值导致任务长时间占用。 */
export const PART_FINISH_MAX_RETRY_TIMEOUT = 10 * 60 * 1000

/** 持续重试时的固定间隔。 */
export const PART_FINISH_RETRY_INTERVAL = 1000

/** 分片完成接口失败重试次数。 */
export const COMPLETE_UPLOAD_RETRIES = 2

/** 分片完成接口失败重试基础间隔。 */
export const COMPLETE_UPLOAD_BASE_DELAY = 2000

/** upload_prepare 返回该业务码时表示大文件上传额度受限。 */
export const UPLOAD_PREPARE_DAILY_LIMIT_CODE = 40093002

/** QQ 没返回建议并发数时的默认并发。 */
export const DEFAULT_PART_CONCURRENCY = 1

/** 本地限制的最大分片并发，避免服务端返回过大值。 */
export const MAX_PART_CONCURRENCY = 10
