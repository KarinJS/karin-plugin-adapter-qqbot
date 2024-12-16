/** markdown */
type Markdown = {
  /** markdown模式 */
  mode: 0 | 1 | 3 | 4 | 5
}

/** 关闭markdown */
export interface CloseMarkdown extends Markdown {
  /** 关闭markdown */
  mode: 0
}

/** 原生markdown */
export interface NativeMarkdown extends Markdown {
  /** 原生markdown */
  mode: 1
}

/** 图文模板markdown */
export interface GraphicTemplateMarkdown extends Markdown {
  /** 3-旧图文模板 */
  mode: 3
  /** 模板ID */
  id: string
  /** 模板参数 */
  key: {
    /** 开头文本 */
    start: string
    /** 图片描述 */
    desc: string
    /** 图片url */
    url: string
    /** 结尾文本 */
    end: string
  }
}

/** 纯文模板 */
export interface TextTemplate extends Markdown {
  /** 文本模板 */
  mode: 4
  /** 模板ID */
  id: string
  /** 模板参数 */
  key: {
    /** 文本 */
    text: string
  }
}

/** 自定义markdown */
export interface CustomMarkdown extends Markdown {
  /** 自定义处理 */
  mode: 5
  [key: string]: any
}

/** `config.yaml` 文件的类型定义 */
export type Config = Record<string, {
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
  markdown?: CloseMarkdown | NativeMarkdown | GraphicTemplateMarkdown | TextTemplate | CustomMarkdown
  /** 接受到消息后对文本进行表达式处理 */
  regex: {
    /** 表达式 */
    reg: string | RegExp
    /** 替换 */
    rep: string
  }[]
  /** 事件接收配置 */
  event: {
    /** 接收方式 0-关闭 1-webhook 2-http 3-ws */
    type: 0 | 1 | 2 | 3
    /** ws服务器地址 */
    wsUrl: string
    /** ws服务器鉴权token */
    wsToken: string
    /** http鉴权token */
    httpToken: string
  }
}>
