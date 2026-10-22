export type MessageCacheLevel = 'minimal' | 'standard' | 'full'

export interface BotConfig {
  appId: string
  secret: string
  qqEnable: boolean
  guildEnable: boolean
  guildMode: 0 | 1
  regex: { reg: string; rep: string }[]
  messageCache: {
    enable: boolean
    self: boolean
    level: MessageCacheLevel
    ttlHours: number
    maxRows: number
  }
  event: {
    type: 0 | 1 | 2
  }
}

export interface ConfigResponse {
  config: BotConfig[]
  defaults: BotConfig
  version: string
}

export interface BotStatus {
  appId: string
  online: boolean
  name: string
  avatar: string
  eventType: 0 | 1 | 2
}

export interface StatusResponse {
  bots: BotStatus[]
  uptime: number
  version: string
}

export type LoginStatus = 'pending' | 'completed' | 'expired' | 'cancelled' | 'failed'

export interface LoginSnapshot {
  taskId: string
  status: LoginStatus
  createdAt: number
  expiresAt: number
  appId?: string
  updated?: boolean
  message?: string
}

export interface LoginStartResponse extends LoginSnapshot {
  connectUrl: string
  qrCode: string
}
