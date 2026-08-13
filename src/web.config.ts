import { Config, MessageCacheLevel } from './types'
import { config } from './utils'
import karin, { defineConfig, components } from 'node-karin'

const unwrapValue = (value: unknown): unknown => {
  if (value && typeof value === 'object' && 'value' in value) {
    return (value as { value: unknown }).value
  }
  return value
}

const toBool = (value: unknown, fallback: boolean): boolean => {
  const raw = unwrapValue(value)
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw !== 0
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase()
    if (['false', '0', 'off', 'no', ''].includes(normalized)) return false
    if (['true', '1', 'on', 'yes'].includes(normalized)) return true
  }
  if (raw === null || raw === undefined) return fallback
  return fallback
}

const toStringValue = (value: unknown, fallback = ''): string => {
  const raw = unwrapValue(value)
  if (typeof raw === 'string') return raw
  if (raw === null || raw === undefined) return fallback
  return String(raw)
}

const toStringList = (value: unknown): string[] => {
  const raw = unwrapValue(value)
  if (!Array.isArray(raw)) return []
  return raw.map(item => toStringValue(item)).filter(Boolean)
}

type WebQQBotInput = {
  appId: unknown
  secret: unknown
  qqEnable: unknown
  guildEnable: unknown
  guildMode: unknown
  regex: unknown
  'markdown:enable': unknown
  'messageCache:enable': unknown
  'messageCache:self': unknown
  'messageCache:level': unknown
  'messageCache:ttlHours': unknown
  'messageCache:maxRows': unknown
  'event:type': unknown
}

type WebConfigInput = {
  qqbot: WebQQBotInput[]
}

export default defineConfig({
  info: {
    id: config.pkg().name,
    name: 'QQBot 适配器',
    version: config.pkg().version,
    description: '为 karin 提供 QQ 官方 Bot 连接能力（2.0）',
    author: [
      {
        name: 'shijin',
        avatar: 'https://github.com/sj817.png',
      },
    ],
  },
  components: () => {
    const data: any[] = []
    const cfg = config.config()
    cfg.forEach(item => {
      data.push({
        title: (() => {
          try {
            const bot = karin.getBot(item.appId)
            if (bot) return bot.account.name
          } catch { }
          return item.appId
        })(),
        subtitle: item.appId,
        appId: item.appId,
        secret: item.secret,
        'event:type': String(item.event?.type ?? 2),
        qqEnable: item.qqEnable,
        guildEnable: item.guildEnable,
        guildMode: item.guildMode === 1,
        regex: item.regex.map((r: any) => `${r.reg} ${r.rep}`),
        'markdown:enable': item.markdown?.enable !== false,
        'messageCache:enable': item.messageCache?.enable === true,
        'messageCache:self': item.messageCache?.self === true,
        'messageCache:level': item.messageCache?.level || 'standard',
        'messageCache:ttlHours': String(item.messageCache?.ttlHours ?? 24),
        'messageCache:maxRows': String(item.messageCache?.maxRows ?? 200000),
      })
    })

    return [
      components.divider.horizontal('bot-section', {
        description: '机器人账号',
        descPosition: 5,
      }),
      components.accordionPro.create(
        'qqbot',
        data,
        {
          label: 'QQ 官方机器人列表',
          description: '每一项对应一个 QQ 官方机器人账号。新增机器人时先填 AppID 和 Secret，再按需调整接收方式、场景能力和发送能力。',
          children: {
            key: 'qqbotConfig',
            children: [
              components.radio.group('event:type', {
                label: '事件接收方式',
                description: 'QQ 官方机器人只有 Webhook 推送和 WebSocket 主动连接两种接收方式。不确定时选择 WebSocket；如果 QQ 后台已启用 Webhook，可在下方高级设置填写第三方 Webhook 转 WebSocket 服务地址。',
                defaultValue: '2',
                radio: [
                  components.radio.create('0', {
                    label: '关闭接收',
                    value: '0',
                    description: '停用这个机器人，不连接 WebSocket，也不接收 Webhook 事件。',
                  }),
                  components.radio.create('1', {
                    label: 'Webhook 推送',
                    value: '1',
                    description: '由 QQ 官方把事件推送到 Karin 的 /qqbot/webhook 路由。通常需要公网地址，并在 QQ 后台配置回调地址。',
                  }),
                  components.radio.create('2', {
                    label: 'WebSocket 主动连接',
                    value: '2',
                    description: '适配器主动连接 WebSocket 地址接收事件。默认连接 QQ 官方网关；如果 QQ 后台已开 Webhook，可改为第三方 Webhook 转 WebSocket 服务地址。',
                  }),
                ],
              }),
              components.divider.horizontal('bot-basic-section', {
                description: '基础信息',
                descPosition: 5,
              }),
              components.input.create('appId', {
                label: '机器人 AppID',
                description: 'QQ 开放平台机器人应用的 AppID，是识别机器人账号的唯一编号。填错会导致鉴权和收发消息失败。',
                isRequired: true,
              }),
              components.input.create('secret', {
                label: '机器人 Secret',
                description: 'QQ 开放平台机器人应用的 Secret，用于获取 access token。请不要泄露；扫码授权会刷新 Secret，旧 Secret 会立即失效。',
                isRequired: true,
              }),
              components.divider.horizontal('bot-scene-section', {
                description: '场景能力',
                descPosition: 5,
              }),
              components.switch.create('qqEnable', {
                label: '启用 QQ 私聊 / 群聊',
                description: '开启后会处理 QQ 单聊和群聊里的消息事件；如果这个机器人只用于频道，可以关闭。',
                defaultSelected: true,
              }),
              components.switch.create('guildEnable', {
                label: '启用频道消息',
                description: '开启后会处理 QQ 频道消息事件；如果这个机器人只用于私聊或群聊，可以关闭。',
                defaultSelected: true,
              }),
              components.switch.create('guildMode', {
                label: '频道私域机器人模式',
                description: '关闭时按公域机器人处理，通常只接收 @ 机器人相关消息；开启时按私域机器人处理，可接收更多频道消息，需确认机器人权限匹配。',
                defaultSelected: false,
              }),
              components.divider.horizontal('bot-message-section', {
                description: '消息发送',
                descPosition: 5,
              }),
              components.input.group('regex', {
                data: [],
                label: '消息正则替换',
                description: '收到文本消息后，先按这里的规则替换内容，再交给 Karin 插件处理。每行格式是“正则表达式 替换内容”，中间用空格分隔；例如“^/ #”会把“/菜单”改成“#菜单”。不懂正则可以保留默认或清空。',
                template: components.input.create('regex', {
                  label: '一条替换规则',
                  placeholder: '^/ #',
                }),
              }),
              components.switch.create('markdown:enable', {
                label: '启用 Markdown 发送通道',
                description: '开启后普通文本和图片优先合并为 QQ Markdown 消息，Markdown 里的图片会以内嵌图片形式发送；关闭后普通图片会按官方富媒体单独上传发送。插件显式传入的 segment.markdown 不受此开关影响。',
                defaultSelected: true,
              }),
              components.divider.horizontal('bot-cache-section', {
                description: '消息缓存',
                descPosition: 5,
              }),
              components.switch.create('messageCache:enable', {
                label: '缓存收到的消息到数据库',
                description: '开启后会把最近一天收到的消息写入本地数据库，供 bot.getMsg 等查询使用；收到的图片、语音、视频等富媒体也会保存到本地。消息量大时会明显占用磁盘空间。',
                defaultSelected: false,
              }),
              components.switch.create('messageCache:self', {
                label: '同时缓存机器人自己发出的消息',
                description: '只有开启“缓存收到的消息到数据库”后才生效。开启后，机器人发送成功的消息也会写入缓存，方便之后通过消息 ID 查询。',
                defaultSelected: false,
              }),
              components.radio.group('messageCache:level', {
                label: '缓存存储分级',
                description: '控制每条消息落库的内容多少，直接影响数据库体积。撤回和引用解析在任何分级下都可用。',
                defaultValue: 'standard',
                radio: [
                  components.radio.create('minimal', {
                    label: '最小',
                    value: 'minimal',
                    description: '只记录消息 ID 映射与引用关系，不保存正文和媒体，体积最小。',
                  }),
                  components.radio.create('standard', {
                    label: '标准（推荐）',
                    value: 'standard',
                    description: '保存文本、表情和媒体本地文件，不保存 markdown 原文。',
                  }),
                  components.radio.create('full', {
                    label: '完整',
                    value: 'full',
                    description: '所有支持的消息段原样保存，包含 markdown 原文，体积最大。',
                  }),
                ],
              }),
              components.input.create('messageCache:ttlHours', {
                label: '缓存保留小时数',
                description: '超过该时长的消息会被清理任务删除。范围 1~720 小时，默认 24。多个机器人同时开启缓存时按最大值生效。',
              }),
              components.input.create('messageCache:maxRows', {
                label: '缓存最大消息条数',
                description: '数据库消息行数硬上限，超出后从最旧的消息开始删除，保证磁盘占用可预期。范围 1000~5000000，默认 200000。',
              }),
            ],
          },
        }
      ),
    ]
  },
  save: (input: WebConfigInput) => {
    if (!Array.isArray(input.qqbot)) {
      return { success: false, message: '保存失败：配置格式错误' }
    }

    const prevConfig = config.readConfigFile()
    let data: Config
    try {
      data = input.qqbot.map(item => {
        const previous = prevConfig.find(cfg => cfg.appId === toStringValue(item.appId))
        const qqEnable = toBool(item.qqEnable, previous?.qqEnable ?? true)
        const guildEnable = toBool(item.guildEnable, previous?.guildEnable ?? true)
        const guildMode = toBool(item.guildMode, previous?.guildMode === 1) ? 1 : 0
        const eventType = Number(toStringValue(item['event:type'], String(previous?.event?.type ?? 0))) as 0 | 1 | 2
        const markdownEnable = toBool(item['markdown:enable'], previous?.markdown?.enable ?? true)
        const messageCacheEnable = toBool(item['messageCache:enable'], previous?.messageCache?.enable ?? false)
        const messageCacheSelf = toBool(item['messageCache:self'], previous?.messageCache?.self ?? false)
        /** 枚举与数值范围由 writeConfig 内的 formatConfig 统一校验回落。 */
        const messageCacheLevel = toStringValue(
          item['messageCache:level'],
          previous?.messageCache?.level ?? 'standard'
        ) as MessageCacheLevel
        /** 输入被清空时回落上次值/默认值，避免 Number('') = 0 被夹到范围下限。 */
        const ttlHoursRaw = toStringValue(item['messageCache:ttlHours']).trim()
        const messageCacheTtlHours = ttlHoursRaw
          ? Number(ttlHoursRaw)
          : previous?.messageCache?.ttlHours ?? 24
        const maxRowsRaw = toStringValue(item['messageCache:maxRows']).trim()
        const messageCacheMaxRows = maxRowsRaw
          ? Number(maxRowsRaw)
          : previous?.messageCache?.maxRows ?? 200000
        const regex = toStringList(item.regex).map(str => {
          const parts = str.split(' ')
          const reg = parts[0]?.replace(/^<|>$/g, '') || ''
          const rep = parts[1]?.replace(/^<|>$/g, '') || ''
          return { reg, rep }
        })

        return {
          appId: toStringValue(item.appId),
          secret: toStringValue(item.secret),
          qqEnable,
          guildEnable,
          guildMode,
          regex,
          markdown: { enable: markdownEnable },
          messageCache: {
            enable: messageCacheEnable,
            self: messageCacheSelf,
            level: messageCacheLevel,
            ttlHours: messageCacheTtlHours,
            maxRows: messageCacheMaxRows,
          },
          event: { type: eventType },
        }
      })
    } catch (err: any) {
      return { success: false, message: `保存失败：代理地址格式错误：${err?.message || 'unknown'}` }
    }

    try {
      config.writeConfig(data)
      return { success: true, message: '保存成功' }
    } catch (err: any) {
      return { success: false, message: `保存失败：${err?.message || 'unknown'}` }
    }
  },
})
