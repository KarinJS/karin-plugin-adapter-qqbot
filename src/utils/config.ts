import fs from 'node:fs'
import { dirPath } from '@/utils'
import {
  watch,
  basePath,
  requireFileSync,
  common,
  logger,
  unregisterBot,
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
const pluginName = pkg().name
/** 用户配置 */
const dirConfig = `${basePath}/${pluginName}/config`

/**
 * @description 配置文件
*/
export const config = (): Config => {
  const cfgPath = `${dirConfig}/config.json`
  if (!fs.existsSync(cfgPath)) {
    fs.mkdirSync(dirConfig, { recursive: true })
    fs.writeFileSync(cfgPath, JSON.stringify([], null, 2))
  }
  if (cache) return cache
  const user = requireFileSync<Config>(cfgPath)
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
  fs.mkdirSync(dirConfig, { recursive: true })
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
      markdown: {
        ...def.markdown,
        ...item.markdown,
      },
      event: {
        ...def.event,
        ...item.event,
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
    name: '',
    appId: '',
    secret: '',
    prodApi: 'https://api.sgroup.qq.com',
    sandboxApi: 'https://sandbox.api.sgroup.qq.com',
    tokenApi: 'https://bots.qq.com/app/getAppAccessToken',
    sandbox: false,
    qqEnable: true,
    guildEnable: true,
    guildMode: 0,
    regex: [
      {
        reg: '^/',
        rep: '#',
      },
    ],
    markdown: {
      mode: 0,
    },
    event: {
      type: 2,
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

    // 处理删除的 bot：先注销 karin 中的 bot，再停止连接
    if (result.removed.length > 0) {
      result.removed.forEach(v => {
        unregisterBot('selfId', v.appId)
        if (v.event.type === 2) {
          stopWebSocketConnection(v.appId)
        }
      })
    }

    // 处理新增的 bot：初始化并通过 karin 注册
    if (result.added.length > 0) {
      const appids = result.added.map(v => v.appId)
      cache.forEach(v => {
        if (!appids.includes(v.appId)) return
        if (v.event.type === 0) return
        createBot(v)
      })
    }

    // 处理修改的 bot：比较 common 中的配置是否发生变化
    if (result.common.length > 0) {
      result.common.forEach(newCfg => {
        const oldCfg = old.find(c => c.appId === newCfg.appId)
        if (!oldCfg) return
        // 简单比较 JSON 序列化后的字符串
        if (JSON.stringify(oldCfg) === JSON.stringify(newCfg)) return

        logger.info(`[QQ Official Bot][配置监听] 配置发生变化: ${newCfg.appId}，正在重载...`)

        // 配置发生变化，先注销再重新初始化
        unregisterBot('selfId', oldCfg.appId)
        if (oldCfg.event.type === 2) {
          stopWebSocketConnection(oldCfg.appId)
        }
        if (newCfg.event.type !== 0) {
          createBot(newCfg)
        }
      })
    }
  })
}, 2000)
