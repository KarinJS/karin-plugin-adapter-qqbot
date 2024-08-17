import fs from 'fs'
import Yaml from 'yaml'
import chokidar from 'node-karin/chokidar'
import { dirPath, basename } from '@/utils'
import { logger, YamlEditor } from 'node-karin'

/** 机器人发送模式
 * - 0: 直接发送
 * - 1: 原生 Markdown
 * - 3: 旧图文模板 Markdown
 * - 4: 纯文模板 Markdown
 * - 5: 自定义处理
 */
export type SendMode = 0 | 1 | 3 | 4 | 5

/**
 * 全局配置类型定义
 */
export interface GlobalCfgType {
  /** 获取调用凭证的 API 地址 */
  accessTokenApi: string

  /** 沙盒环境 API 地址 */
  sandBoxApi: string

  /** 正式环境 API 地址 */
  qqBotApi: string

  /** 是否开启沙盒环境 */
  sandBox: boolean

  /** 机器人发送模式
   * - 0: 直接发送
   * - 1: 原生 Markdown
   * - 3: 旧图文模板 Markdown
   * - 4: 纯文模板 Markdown
   * - 5: 自定义处理
   */
  sendMode: SendMode

  /** 是否开启频道消息 */
  guild: boolean

  /** 频道机器人模式 0-公域机器人 1-私域机器人 */
  guildMode: 0 | 1

  /** 机器人 Markdown 模板 ID，仅在 sendMode 为 3 或 4 时有效 */
  templateId: string

  /** 机器人旧图文模板 Markdown 配置 */
  oldTemplate: {
    /** 开头文字的键 */
    textStartKey: string

    /** 图片描述的键 */
    imgDescKey: string

    /** 图片地址的键 */
    imgUrlKey: string

    /** 结尾文字的键 */
    textEndKey: string
  }

  /** 机器人纯文模板 Markdown 配置，10个文本键 */
  textTemplate: string[]

  /** 文本中的 URL 转二维码白名单，配置后将不转换这些 URL 为二维码 */
  exclude: string[]

  /** 接受到消息后对文本进行表达式处理，优先级高于全局配置 */
  regex: Array<{
    /** 匹配的正则表达式 */
    reg: RegExp

    /** 替换为的内容 */
    rep: string
  }>
}

/**
 * 账号配置类型定义
 */
export interface AccountCfgType extends GlobalCfgType {
  /** 机器人 AppID */
  appId: string
  /** 机器人 AppSecret */
  secret: string
}

/**
 * 配置类型定义
 */
export interface ConfigType {
  /**
   * 全局默认配置
   */
  default: GlobalCfgType

  /** 账号配置列表 */
  accounts: Record<string, AccountCfgType>
}

class Cfg {
  /** 配置文件跟路径 */
  dir: string
  /** 默认配置文件根路径 */
  defdir: string
  /** 缓存 不经常用的不建议缓存 */
  change: Map<string, any>
  /** 监听文件 */
  watcher: Map<string, any>
  constructor () {
    this.dir = `./config/plugin/${basename}`
    this.defdir = `${dirPath}/config`
    this.change = new Map()
    this.watcher = new Map()
    this.initCfg()
  }

  /** 初始化配置 */
  async initCfg () {
    /** 读取默认配置的所有yaml */
    const files = fs.readdirSync(this.defdir).filter(file => file.endsWith('.yaml'))
    for (const file of files) {
      const dirPath = `${this.dir}/${file}`
      const defPath = `${this.defdir}/${file}`
      if (!fs.existsSync(dirPath)) fs.copyFileSync(defPath, dirPath)
    }

    // this.updateYaml(`${this.dir}/config.yaml`, [
    //   { key: 'a', val: 'value', comment: '实例配置1', type: true },
    //   { key: 'b.c', val: 'Value', comment: '实例配置2', type: true },
    // ])
  }

  /**
 * 更新yaml文件
 * @param filePath - 文件路径
 * @param settings - 设置项
 */
  updateYaml (filePath: string, settings: {
    /** 键路径 */
    key: string,
    /** 要写入的 */
    val: any,
    /** 需要写入的注释 */
    comment: string,
    /** 是否添加到顶部 否则添加到同一行 */
    type: boolean
  }[]) {
    let yaml = new YamlEditor(filePath)

    /** 先添加内容 */
    settings.forEach(({ key, val }) => {
      try {
        if (!yaml.has(key)) yaml.set(key, val)
      } catch (error: any) {
        logger.error(`[common] 更新yaml文件时出错：${error.stack || error.message || error}`)
      }
    })
    /** 先保存 */
    yaml.save()

    /** 重新解析 再次写入注释 直接写入注释会报错 写入的不是node节点模式 */
    yaml = new YamlEditor(filePath)
    settings.forEach(({ key, comment, type }) => {
      try {
        yaml.comment(key, comment, type)
      } catch (error: any) {
        logger.error(`[common] 更新yaml文件时出错：${error.stack || error.message || error}`)
      }
    })
    yaml.save()
  }

  /**
   * 基本配置
   */
  get Config (): ConfigType {
    const key = 'change.config'
    const res = this.change.get(key)
    /** 取缓存 */
    if (res) return res

    /** 取配置 */
    const config = this.getYaml('config', 'config', true)
    const defSet = this.getYaml('defSet', 'config', false)
    const data = {
      ...defSet,
      ...config,
      default: { ...defSet?.default, ...config?.default },
    }
    /** 缓存 */
    this.change.set(key, data)
    return data
  }

  /**
   * 获取指定Bot配置
   * @param {string} appID - Bot的AppID
   */
  getBotConfig (appID: string): AccountCfgType | null {
    if (!appID) throw new Error('appID不能为空')
    const key = `change.config.${appID}`
    const res = this.change.get(key)
    /** 取缓存 */
    if (res) return res

    /** 所有配置 */
    const allCfg = this.Config
    /** 取不到 */
    if (!allCfg?.accounts?.[appID]) return null

    /** 单个账号配置 */
    const botCfg = allCfg.accounts[appID]
    /** 全局默认配置 */
    const defCfg = allCfg.default

    /** 对regex进行处理 */
    const regex = Array.isArray(botCfg.regex) ? botCfg.regex : defCfg.regex
    /** 对表达式进行new RegExp处理 */
    const regexData = regex.map(({ reg, rep }) => {
      return {
        reg: reg instanceof RegExp ? reg : new RegExp(reg),
        rep,
      }
    })

    const data = {
      ...defCfg,
      ...botCfg,
      sendMode: Number(botCfg.sendMode) as SendMode || defCfg.sendMode,
      regex: regexData,
    }

    /** 缓存 */
    this.change.set(key, data)
    return data
  }

  /**
   * package
   */
  get package (): any {
    const data = fs.readFileSync(dirPath + '/package.json', 'utf8')
    const pkg = JSON.parse(data)
    return pkg
  }

  /**
   * 获取配置yaml
   */
  getYaml (type: 'defSet' | 'config', name: string, isWatch = false) {
    /** 文件路径 */
    const file = type === 'defSet' ? `${this.defdir}/${name}.yaml` : `${this.dir}/${name}.yaml`
    /** 读取文件 */
    const data = Yaml.parse(fs.readFileSync(file, 'utf8'))
    /** 监听文件 */
    if (isWatch) this.watch(type, name, file)
    return data
  }

  /**
   * 监听配置文件
   * @param {'defSet'|'config'} type 类型
   * @param {string} name 文件名称 不带后缀
   * @param {string} file 文件路径
   */
  async watch (type: 'defSet' | 'config', name: string, file: string) {
    const key = `change.${name}`
    /** 已经监听过了 */
    const res = this.change.get(key)
    if (res) return true
    /** 监听文件 */
    const watcher = chokidar.watch(file)
    /** 监听文件变化 */
    watcher.on('change', () => {
      this.change.delete(key)
      logger.mark(`[修改配置文件][${type}][${name}]`)
    })

    /** 缓存 防止重复监听 */
    this.watcher.set(key, watcher)
  }
}

/**
 * 配置文件
 */
export const config = new Cfg()
