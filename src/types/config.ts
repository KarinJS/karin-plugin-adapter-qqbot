/**
 * 单个 QQBot 配置
 */
export interface QQBotConfig {
  /** 机器人名称 */
  name: string
  /** 机器人 ID */
  appId: string
  /** 机器人密钥 */
  secret: string
  /** 正式环境 API */
  prodApi: string
  /** 测试环境 API */
  sandboxApi: string
  /** 调用凭证 API */
  tokenApi: string
  /** 开启沙盒环境 */
  sandbox: boolean
  /** 开启 QQ 场景能力（单聊 / 群聊） */
  qqEnable: boolean
  /** 开启频道场景能力 */
  guildEnable: boolean
  /** 频道场景模式 0 公域 / 1 私域 */
  guildMode: 0 | 1
  /** 收到消息后对文本进行表达式处理 */
  regex: { reg: string | RegExp; rep: string }[]
  /** 按钮自动化 */
  keyboard: {
    /** 是否将文本中的 URL 自动转换为 keyboard 按钮 */
    enable: boolean
  }
  /** 消息缓存配置 */
  messageCache: {
    /** 是否启用数据库消息缓存，用于 bot.getMsg */
    enable: boolean
    /** 是否缓存机器人自己发送的消息 */
    self: boolean
  }
  /** 事件接收配置 */
  event: {
    /** 接收方式 0 关闭 / 1 webhook / 2 ws */
    type: 0 | 1 | 2
  }
}

/** config.json */
export type Config = QQBotConfig[]
