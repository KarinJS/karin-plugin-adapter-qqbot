/**
 * 自定义连接代理配置
 */
export interface QQBotProxyConfig {
  /** 正式环境 API */
  prodApi: string
  /** 测试环境 API */
  sandboxApi: string
  /** 调用凭证 API */
  tokenApi: string
  /** 正式环境 WebSocket 网关 */
  prodWs: string
  /** 测试环境 WebSocket 网关 */
  sandboxWs: string
}

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
  /** 自定义连接代理 */
  proxy: QQBotProxyConfig
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
  }
  /** 事件接收配置 */
  event: {
    /** 接收方式 0 关闭 / 1 webhook / 2 ws */
    type: 0 | 1 | 2
  }
}

/**
 * 兼容旧版 config.json 的原始配置。
 *
 * 旧版本把 prodApi / sandboxApi / tokenApi 放在顶层；formatConfig 会迁移到 proxy。
 */
export type RawQQBotConfig = Partial<QQBotConfig> & {
  /** @deprecated 使用 proxy.prodApi */
  prodApi?: string
  /** @deprecated 使用 proxy.sandboxApi */
  sandboxApi?: string
  /** @deprecated 使用 proxy.tokenApi */
  tokenApi?: string
  /** @deprecated 使用 proxy.prodWs / proxy.sandboxWs */
  wsUrl?: string
  proxy?: Partial<QQBotProxyConfig> & {
    /** @deprecated 使用 prodWs / sandboxWs */
    wsUrl?: string
  }
}

/** config.json */
export type Config = QQBotConfig[]

/** 原始 config.json */
export type RawConfig = RawQQBotConfig[]
