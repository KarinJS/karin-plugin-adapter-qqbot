/**
 * 消息缓存存储分级。
 *
 * - minimal: 只存 ID 映射与引用关系（reply 段），撤回 / 引用解析可用，正文不落库；
 * - standard: 额外保存文本、表情与媒体本地路径，markdown 原文不落库；
 * - full: 全部可缓存消息段原样保存。
 */
export type MessageCacheLevel = 'minimal' | 'standard' | 'full'

/**
 * 单个 QQBot 配置
 */
export interface QQBotConfig {
  /** 机器人 ID */
  appId: string
  /** 机器人密钥 */
  secret: string
  /** 开启 QQ 场景能力（单聊 / 群聊） */
  qqEnable: boolean
  /** 开启频道场景能力 */
  guildEnable: boolean
  /** 频道场景模式 0 公域 / 1 私域 */
  guildMode: 0 | 1
  /** 收到消息后对文本进行表达式处理 */
  regex: { reg: string | RegExp; rep: string }[]
  /** Markdown 通道 */
  markdown: {
    /** 是否启用 Markdown 通道发送消息 */
    enable: boolean
  }
  /** 消息缓存配置 */
  messageCache: {
    /** 是否启用数据库消息缓存，用于 bot.getMsg */
    enable: boolean
    /** 是否缓存机器人自己发送的消息 */
    self: boolean
    /** 存储分级，控制单条消息的落库体积 */
    level: MessageCacheLevel
    /** 缓存保留小时数；多个 bot 同时开启时取最大值 */
    ttlHours: number
    /** 消息缓存最大行数，超出后删除最旧；多个 bot 同时开启时取最大值 */
    maxRows: number
  }
  /** 事件接收配置 */
  event: {
    /** 接收方式 0 关闭 / 1 webhook / 2 ws */
    type: 0 | 1 | 2
  }
}

/** config.json */
export type Config = QQBotConfig[]
