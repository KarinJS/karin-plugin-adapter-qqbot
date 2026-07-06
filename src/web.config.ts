import { Config } from './types'
import { config } from './utils'
import { defineConfig, components } from 'node-karin'
import { normalizeProxyConfig } from '@/utils/proxy-url'

const defaultProxy = () => config.getDefaultConfig()[0].proxy

const pickProxy = (cfg: Config) => cfg[0]?.proxy || defaultProxy()

const proxyFromInput = (input: WebConfigInput) => normalizeProxyConfig({
  prodApi: input['proxy:prodApi'] || defaultProxy().prodApi,
  sandboxApi: input['proxy:sandboxApi'] || defaultProxy().sandboxApi,
  tokenApi: input['proxy:tokenApi'] || defaultProxy().tokenApi,
  prodWs: input['proxy:prodWs'] || defaultProxy().prodWs,
  sandboxWs: input['proxy:sandboxWs'] || defaultProxy().sandboxWs,
})

type WebQQBotInput = {
  name: string
  appId: string
  secret: string
  sandbox: boolean
  qqEnable: boolean
  guildEnable: boolean
  guildMode: boolean
  regex: string[]
  'keyboard:enable': boolean
  'markdown:enable': boolean
  'messageCache:enable': boolean
  'messageCache:self': boolean
  'event:type': string
}

type WebConfigInput = {
  'proxy:prodApi': string
  'proxy:sandboxApi': string
  'proxy:tokenApi': string
  'proxy:prodWs': string
  'proxy:sandboxWs': string
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
    const proxy = pickProxy(cfg)
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
      })
    })

    return [
      components.divider.horizontal('proxy-section', {
        description: '连接代理（适配器全局）',
        descPosition: 5,
      }),
      components.input.create('proxy:prodApi', {
        label: '正式环境 OpenAPI 地址',
        description: '机器人使用正式环境时调用的 QQ OpenAPI 根地址。默认是官方地址；如果你有反向代理，就填写代理后的 http:// 或 https:// 地址；后端拼接官方路径时会兼容末尾 /。',
        value: proxy.prodApi,
        defaultValue: defaultProxy().prodApi,
        isRequired: true,
      }),
      components.input.create('proxy:sandboxApi', {
        label: '沙盒环境 OpenAPI 地址',
        description: '开启“沙盒环境”后使用的 QQ OpenAPI 根地址。一般保持默认；只有需要代理沙盒接口时才修改；后端拼接官方路径时会兼容末尾 /。',
        value: proxy.sandboxApi,
        defaultValue: defaultProxy().sandboxApi,
        isRequired: true,
      }),
      components.input.create('proxy:tokenApi', {
        label: 'AccessToken 获取接口',
        description: '用于把 AppID 和 Secret 换成 app access token。默认是 QQ 官方接口；如果正式环境 API 走代理，这里通常也要填对应的完整接口地址。',
        value: proxy.tokenApi,
        defaultValue: defaultProxy().tokenApi,
        isRequired: true,
      }),
      components.input.create('proxy:prodWs', {
        label: '正式环境 WebSocket 地址',
        description: '事件接收方式选择 WebSocket，且机器人未开启沙盒时使用。支持 ws:// 和 wss://；这是完整网关地址，路径和查询参数会按你填写的内容连接。',
        value: proxy.prodWs,
        defaultValue: defaultProxy().prodWs,
        isRequired: true,
      }),
      components.input.create('proxy:sandboxWs', {
        label: '沙盒环境 WebSocket 地址',
        description: '事件接收方式选择 WebSocket，且机器人开启沙盒时使用。支持 ws:// 和 wss://；这是完整网关地址，路径和查询参数会按你填写的内容连接。',
        value: proxy.sandboxWs,
        defaultValue: defaultProxy().sandboxWs,
        isRequired: true,
      }),
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
                description: '决定这个机器人怎么接收 QQ 官方推送的消息和通知。不确定时选择 WebSocket，配置最少，也最适合本地部署。',
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
                    description: '由 QQ 官方把事件推送到你的服务地址，通常需要公网地址、回调路由和平台侧配置。',
                  }),
                  components.radio.create('2', {
                    label: 'WebSocket 主动连接',
                    value: '2',
                    description: '适配器主动连接 QQ 官方网关接收事件，默认推荐；会使用上方代理板块中的 WebSocket 地址。',
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
                description: '开启后这个机器人会调用沙盒 OpenAPI 和沙盒 WebSocket 地址，适合测试；正式上线机器人请关闭。',
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

    let proxy: Config[number]['proxy']
    try {
      proxy = proxyFromInput(input)
    } catch (err: any) {
      return { success: false, message: `保存失败：代理地址格式错误：${err?.message || 'unknown'}` }
    }

    const data: Config = input.qqbot.map(item => {
      const guildMode = item.guildMode === true ? 1 : 0
      const eventType = Number(item['event:type'] ?? 0) as 0 | 1 | 2
      const regex = (item.regex || []).map(str => {
        const parts = str.split(' ')
        const reg = parts[0]?.replace(/^<|>$/g, '') || ''
        const rep = parts[1]?.replace(/^<|>$/g, '') || ''
        return { reg, rep }
      })

      return {
        name: item.name || '',
        appId: item.appId || '',
        secret: item.secret || '',
        proxy,
        sandbox: !!item.sandbox,
        qqEnable: !!item.qqEnable,
        guildEnable: !!item.guildEnable,
        guildMode,
        regex,
        keyboard: { enable: item['keyboard:enable'] !== false },
        markdown: { enable: item['markdown:enable'] !== false },
        messageCache: {
          enable: !!item['messageCache:enable'],
          self: !!item['messageCache:self'],
        },
        event: { type: eventType },
      }
    })

    config.writeConfig(data)
    return { success: true, message: '保存成功' }
  },
})
