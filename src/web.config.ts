import { Config } from './types'
import { config } from './utils'
import { defineConfig, components } from 'node-karin'
import { buildFallbackWsUrlFromApi, normalizeProxyConfig } from '@/utils/proxy-url'

const defaultProxy = () => config.getDefaultConfig()[0].proxy

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

const proxyKeys = (sandbox: boolean) => sandbox
  ? { api: 'sandboxApi', ws: 'sandboxWs' } as const
  : { api: 'prodApi', ws: 'prodWs' } as const

const getBotProxyInput = (item: Config[number]) => {
  const keys = proxyKeys(!!item.sandbox)
  const proxy = item.proxy || defaultProxy()
  return {
    'proxy:api': proxy[keys.api] || defaultProxy()[keys.api],
    'proxy:ws': proxy[keys.ws] || defaultProxy()[keys.ws],
  }
}

const proxyFromInput = (item: WebQQBotInput, previous?: Config[number]) => {
  const def = defaultProxy()
  const sandbox = toBool(item.sandbox, previous?.sandbox ?? false)
  const previousSandbox = previous?.sandbox ?? sandbox
  const keys = proxyKeys(sandbox)
  const previousVisibleKeys = proxyKeys(previousSandbox)
  const previousProxy = previous?.proxy
  const base = { ...def, ...previousProxy }
  const envChanged = !!previous && previousSandbox !== sandbox

  const rawApi = toStringValue(item['proxy:api']).trim()
  const rawWs = toStringValue(item['proxy:ws']).trim()
  const previousVisibleApi = previousProxy?.[previousVisibleKeys.api] || def[previousVisibleKeys.api]
  const previousVisibleWs = previousProxy?.[previousVisibleKeys.ws] || def[previousVisibleKeys.ws]

  const api = envChanged && rawApi === previousVisibleApi
    ? base[keys.api] || def[keys.api]
    : rawApi || base[keys.api] || def[keys.api]

  const previousApi = previousProxy?.[keys.api] || def[keys.api]
  const previousWs = previousProxy?.[keys.ws] || def[keys.ws]
  const wsInput = envChanged && rawWs === previousVisibleWs
    ? base[keys.ws] || def[keys.ws]
    : rawWs

  let ws = wsInput || previousWs || def[keys.ws]
  const previousAutoWs = buildFallbackWsUrlFromApi(previousApi)
  if (!wsInput || (wsInput === previousWs && previousWs === previousAutoWs && api !== previousApi)) {
    ws = buildFallbackWsUrlFromApi(api)
  }

  return normalizeProxyConfig({
    ...base,
    [keys.api]: api,
    tokenApi: base.tokenApi || def.tokenApi,
    [keys.ws]: ws,
  })
}

type WebQQBotInput = {
  name: unknown
  appId: unknown
  secret: unknown
  'proxy:api': unknown
  'proxy:ws': unknown
  sandbox: unknown
  qqEnable: unknown
  guildEnable: unknown
  guildMode: unknown
  regex: unknown
  'keyboard:enable': unknown
  'markdown:enable': unknown
  'messageCache:enable': unknown
  'messageCache:self': unknown
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
        title: item.name || item.appId,
        subtitle: item.appId,
        name: item.name,
        appId: item.appId,
        secret: item.secret,
        'event:type': String(item.event?.type ?? 2),
        sandbox: item.sandbox,
        qqEnable: item.qqEnable,
        guildEnable: item.guildEnable,
        guildMode: item.guildMode === 1,
        regex: item.regex.map((r: any) => `${r.reg} ${r.rep}`),
        'keyboard:enable': item.keyboard?.enable !== false,
        'markdown:enable': item.markdown?.enable !== false,
        'messageCache:enable': item.messageCache?.enable === true,
        'messageCache:self': item.messageCache?.self === true,
        ...getBotProxyInput(item),
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
              components.input.create('name', {
                label: '机器人显示名称',
                description: '只用于 Karin 配置页和日志里识别这个机器人，不影响 QQ 平台资料。扫码登录写入配置时通常会自动填充。',
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
              components.switch.create('sandbox', {
                label: '使用沙盒环境',
                description: '开启后这个机器人会使用沙盒环境的 OpenAPI 和 WebSocket 地址；关闭时使用正式环境地址。正式上线机器人请关闭。',
                defaultSelected: false,
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
              components.switch.create('keyboard:enable', {
                label: '把链接自动转成按钮',
                description: '开启后，发送文本里出现的 http(s) 链接会尽量转成 QQ keyboard 按钮，用户可以直接点按钮打开链接。该能力依赖 Markdown 通道。',
                defaultSelected: true,
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
              components.divider.horizontal('bot-proxy-section', {
                description: '连接代理（高级设置：通常只在使用 Webhook 转 WebSocket 服务时填写，除非你知道你在做什么，否则不建议更改）',
                descPosition: 5,
              }),
              components.input.create('proxy:ws', {
                label: 'WebSocket 接入地址',
                description: '事件接收方式为 WebSocket 时连接的地址。常见用途是填写第三方 Webhook 转 WebSocket 服务地址，因为 QQ 后台开启 Webhook 后通常无法再直连官方 WebSocket。不填会使用当前环境的官方默认网关。',
              }),
              components.input.create('proxy:api', {
                label: 'OpenAPI 反代地址',
                description: '用于发送消息、上传媒体、查询网关和获取机器人资料的 QQ OpenAPI 根地址。多数 Webhook 转 WebSocket 场景不用改这里；只有 OpenAPI 请求也需要走反代时才填写。',
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
        const sandbox = toBool(item.sandbox, previous?.sandbox ?? false)
        const qqEnable = toBool(item.qqEnable, previous?.qqEnable ?? true)
        const guildEnable = toBool(item.guildEnable, previous?.guildEnable ?? true)
        const guildMode = toBool(item.guildMode, previous?.guildMode === 1) ? 1 : 0
        const eventType = Number(toStringValue(item['event:type'], String(previous?.event?.type ?? 0))) as 0 | 1 | 2
        const keyboardEnable = toBool(item['keyboard:enable'], previous?.keyboard?.enable ?? true)
        const markdownEnable = toBool(item['markdown:enable'], previous?.markdown?.enable ?? true)
        const messageCacheEnable = toBool(item['messageCache:enable'], previous?.messageCache?.enable ?? false)
        const messageCacheSelf = toBool(item['messageCache:self'], previous?.messageCache?.self ?? false)
        const regex = toStringList(item.regex).map(str => {
          const parts = str.split(' ')
          const reg = parts[0]?.replace(/^<|>$/g, '') || ''
          const rep = parts[1]?.replace(/^<|>$/g, '') || ''
          return { reg, rep }
        })

        const proxy = proxyFromInput(item, previous)

        return {
          name: toStringValue(item.name),
          appId: toStringValue(item.appId),
          secret: toStringValue(item.secret),
          proxy,
          sandbox,
          qqEnable,
          guildEnable,
          guildMode,
          regex,
          keyboard: { enable: keyboardEnable },
          markdown: { enable: markdownEnable },
          messageCache: {
            enable: messageCacheEnable,
            self: messageCacheSelf,
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
