/** markdown */
interface Markdown {
  /** markdown模式 */
  mode: 0 | 1 | 3 | 4 | 5
  /** 模板ID */
  id: string
  /** 模板键配置 */
  kv: string[]
}

/**
 * 单个qqbot配置
 */
export interface QQBotConfig {
  /** 机器人ID */
  appId: string
  /** 机器人密钥 */
  secret: string
  /** 正式环境Api */
  prodApi: string
  /** 测试环境Api */
  sandboxApi: string
  /** 调用凭证的Api */
  tokenApi: string
  /** 开启沙盒环境 */
  sandbox: boolean
  /** 开启QQ场景能力 */
  qqEnable: boolean
  /** 开启频道场景能力 */
  guildEnable: boolean
  /** 频道场景模式 0-公域 1-私域 */
  guildMode: 0 | 1
  /** 文本中的url转二维码白名单 配置后将不转换这些url为二维码 */
  exclude: string[]
  /** Markdown */
  markdown: Markdown
  /** 接受到消息后对文本进行表达式处理 */
  regex: {
    /** 表达式 */
    reg: string | RegExp
    /** 替换 */
    rep: string
  }[]
  /** 事件接收配置 */
  event: {
    /** 接收方式 0-关闭 1-webhook 2-ws */
    type: 0 | 1 | 2
    /** ws服务器地址 */
    wsUrl: string
    /** ws服务器鉴权token */
    wsToken: string
  }
}

/** `config.json` 文件的类型定义 */
export type Config = QQBotConfig[]
