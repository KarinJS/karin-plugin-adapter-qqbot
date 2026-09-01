/** HTTP(S) 资源已经是可直接传给 QQ 平台的公网地址。 */
export const HTTP_URL_RE = /^https?:\/\//i

/** Karin 常见 base64 图片/媒体前缀。 */
export const BASE64_PREFIX_RE = /^base64:\/\//i

/** 标准 data URL 的 base64 前缀。 */
export const DATA_URL_BASE64_RE = /^data:[^;,]+;base64,/i

/**
 * 纯数字且 5-11 位：一定是 QQ 号/群号。
 * openid 是 32 位十六进制（或带连字符的 UUID 形态），不可能匹配此规则。
 */
export const QQ_NUMBER_RE = /^\d{5,11}$/
