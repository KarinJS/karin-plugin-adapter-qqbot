import fs from 'node:fs'
import { dirPath } from '@/utils'
import {
  watch,
  basePath,
  requireFileSync,
  common,
} from 'node-karin'
import type { Config, QQBotConfig } from '@/types/config'
import { stopWebSocketConnection } from '@/connection/webSocket'
import { createBot } from '@/core'

let cache: Config | undefined
const cacheMap: Record<string, QQBotConfig> = {}

/**
 * @description package.json
 */
export const pkg = () => requireFileSync(`${dirPath}/package.json`)

/** 用户配置的插件名称 */
const pluginName = pkg().name.replace(/\//g, '-')
/** 用户配置 */
const dirConfig = `${basePath}/${pluginName}/config`
if (!fs.existsSync(dirConfig)) {
  fs.mkdirSync(dirConfig, { recursive: true })
  fs.writeFileSync(`${dirConfig}/config.json`, JSON.stringify([], null, 2))
}

/**
 * @description 配置文件
 */
export const config = (): Config => {
  if (cache) return cache
  const user = requireFileSync<Config>(`${dirConfig}/config.json`)
  const result = formatConfig(user)
  cache = result
  result.forEach(v => {
    cacheMap[v.appId] = v
  })
  return result
}

/**
 * 获取Bot配置
 * @param appid 机器人appid
 * @returns 机器人配置
 */
export const getConfig = (appid: string) => {
  return cacheMap[appid]
}

/**
 * 写入配置
 * @param config 配置
 */
export const writeConfig = (config: Config) => {
  fs.writeFileSync(`${dirConfig}/config.json`, JSON.stringify(config, null, 2))
}

/**
 * 格式化config
 */
export const formatConfig = (user: Config): Config => {
  const def = getDefaultConfig()[0]
  const result: Config = []

  user.forEach(item => {
    result.push({
      ...def,
      ...item,
      event: {
        ...def.event,
        ...item.event,
      },
      markdown: {
        ...def.markdown,
        ...item.markdown,
      },
    })
  })

  return result
}

/**
 * 默认配置
 */
export const getDefaultConfig = (): Config => [
  {
    appId: '',
    secret: '',
    prodApi: 'https://api.sgroup.qq.com',
    sandboxApi: 'https://sandbox.api.sgroup.qq.com',
    tokenApi: '',
    sandbox: false,
    qqEnable: true,
    guildEnable: true,
    guildMode: 0,
    exclude: [],
    regex: [
      {
        reg: '^/',
        rep: '#',
      },
    ],
    markdown: {
      mode: 0,
      id: '',
      kv: [
        'text_start',
        'img_dec',
        'img_url',
        'text_end',
      ],
    },
    event: {
      type: 0,
      wsUrl: '',
      wsToken: '',
    },
  },
]

/**
 * @description 监听配置文件
 */
setTimeout(() => {
  watch<Config>(`${dirConfig}/config.json`, (old, now) => {
    cache = formatConfig(now)
    cache.forEach(v => {
      cacheMap[v.appId] = v
    })

    const result = common.diffArray(old, now)
    if (result.removed.length > 0) {
      result.removed.forEach(v => {
        if (v.event.type !== 2) return
        stopWebSocketConnection(v.appId)
      })
    }

    if (result.added.length > 0) {
      /** 需要使用格式化之后的数据 */
      const appids = result.added.map(v => v.appId)
      cache.forEach(v => {
        if (!appids.includes(v.appId)) return
        if (v.event.type === 0) return
        createBot(v)
      })
    }
  })
}, 2000)
