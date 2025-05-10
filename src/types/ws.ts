/**
 * 中转服务推送基类
 */
export interface Transfer {
  /** 事件唯一标识符 响应使用 */
  echo: string
  /**
   * 事件类型
   * - sign 鉴权
   * - event 事件
   */
  type: 'event' | 'sign'
  /** 事件数据 */
  data: unknown
}

/**
 * 中转 鉴权事件推送
 */
export interface TransferSign extends Transfer {
  type: 'sign'
  data: {
    /** 机器人appid */
    appid: string,
    /** 事件时间戳 tx下发 */
    eventTs: string,
    /** 明文token tx下发 */
    plainToken: string
  }
}

/**
 * 中转 鉴权事件响应
 */
export interface TransferSignResponse extends Transfer {
  type: 'sign'
  data: {
    /** 状态 */
    status: 'success' | 'error'
    /** 签名或错误信息 */
    message: string
  }
}

/**
 * 中转 bot事件推送
 */
export interface TransferEvent extends Transfer {
  type: 'event'
  data: {
    /** 请求头 */
    headers: {
      host: 'tx.com',
      'x-real-ip': string,
      'x-real-port': string,
      'x-forwarded-for': string,
      'remote-host': string,
      connection: string,
      'content-length': string,
      'x-tps-trace-id': string,
      'content-type': 'application/json',
      'user-agent': 'QQBot-Callback',
      'x-signature-timestamp': string,
      'x-bot-appid': string,
      'x-signature-method': string,
      'x-signature-ed25519': string
    } & Record<string, string>,
    /**
     * 事件数据
     * - 这里接受到的是string 需要反序列化
     * - 因为需要进行一次签名验证 所以没有进行反序列化。
     * - 实际类型是{@link import('./event.ts').Event}
     */
    event: string
  }
}

/**
 * 全部事件类型
 */
export type AllEvent = TransferSign | TransferEvent
