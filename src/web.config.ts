import { Config } from './types'
import { config } from './utils'
import { defineConfig, components } from 'node-karin'

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
        prodApi: item.prodApi,
        sandboxApi: item.sandboxApi,
        tokenApi: item.tokenApi,
        sandbox: item.sandbox,
        qqEnable: item.qqEnable,
        guildEnable: item.guildEnable,
        guildMode: item.guildMode === 1,
        regex: item.regex.map((r: any) => `${r.reg} ${r.rep}`),
        'keyboard:enable': item.keyboard?.enable !== false,
        'event:type': String(item.event?.type ?? 2),
      })
    })

    return [
      components.accordionPro.create(
        'qqbot',
        data,
        {
          label: 'QQBot',
          description: 'QQBot 配置',
          children: {
            key: 'qqbotConfig',
            children: [
              components.input.create('name', {
                label: '机器人名称',
                description: '机器人名称，扫码登录会自动获取',
              }),
              components.input.create('appId', {
                label: 'AppID',
                description: '机器人 AppID',
                isRequired: true,
              }),
              components.input.create('secret', {
                label: 'Secret',
                description: '机器人 Secret',
                isRequired: true,
              }),
              components.input.create('prodApi', {
                label: '正式环境 API',
                defaultValue: 'https://api.sgroup.qq.com',
                isRequired: true,
              }),
              components.input.create('sandboxApi', {
                label: '沙盒环境 API',
                defaultValue: 'https://sandbox.api.sgroup.qq.com',
                isRequired: true,
              }),
              components.input.create('tokenApi', {
                label: 'AccessToken 接口',
                defaultValue: 'https://bots.qq.com/app/getAppAccessToken',
                isRequired: true,
              }),
              components.switch.create('sandbox', {
                label: '沙盒环境',
                description: '启用后调用沙盒 API',
                defaultSelected: false,
              }),
              components.switch.create('qqEnable', {
                label: 'QQ 场景',
                description: '是否处理私聊和群聊消息',
                defaultSelected: true,
              }),
              components.switch.create('guildEnable', {
                label: '频道场景',
                description: '是否处理频道消息',
                defaultSelected: true,
              }),
              components.switch.create('guildMode', {
                label: '频道私域模式',
                description: '开启 = 私域机器人；关闭 = 公域机器人',
                defaultSelected: false,
              }),
              components.input.group('regex', {
                data: [],
                label: '消息正则替换',
                description: '每行格式：正则表达式 替换内容。如：^/ #',
                template: components.input.create('regex', {
                  label: '正则规则',
                  placeholder: '^/ #',
                }),
              }),
              components.switch.create('keyboard:enable', {
                label: 'URL 自动按钮',
                description: '将文本中的链接自动转为 keyboard 按钮',
                defaultSelected: true,
              }),
              components.radio.group('event:type', {
                label: '事件接收方式',
                description: '选择 QQ 官方推送事件的方式',
                defaultValue: '2',
                radio: [
                  components.radio.create('0', {
                    label: '关闭',
                    value: '0',
                    description: '不接收任何事件',
                  }),
                  components.radio.create('1', {
                    label: 'Webhook',
                    value: '1',
                    description: 'QQ 官方主动推送事件到本机',
                  }),
                  components.radio.create('2', {
                    label: 'WebSocket',
                    value: '2',
                    description: '主动连接 QQ 官方 WebSocket 网关接收事件（推荐）',
                  }),
                ],
              }),
            ],
          },
        }
      ),
    ]
  },
  save: (input: {
    qqbot: Array<{
      name: string
      appId: string
      secret: string
      prodApi: string
      sandboxApi: string
      tokenApi: string
      sandbox: boolean
      qqEnable: boolean
      guildEnable: boolean
      guildMode: boolean
      regex: string[]
      'keyboard:enable': boolean
      'event:type': string
    }>
  }) => {
    if (!Array.isArray(input.qqbot)) {
      return { success: false, message: '保存失败：配置格式错误' }
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
        prodApi: item.prodApi || 'https://api.sgroup.qq.com',
        sandboxApi: item.sandboxApi || 'https://sandbox.api.sgroup.qq.com',
        tokenApi: item.tokenApi || 'https://bots.qq.com/app/getAppAccessToken',
        sandbox: !!item.sandbox,
        qqEnable: !!item.qqEnable,
        guildEnable: !!item.guildEnable,
        guildMode,
        regex,
        keyboard: { enable: item['keyboard:enable'] !== false },
        event: { type: eventType },
      }
    })

    config.writeConfig(data)
    return { success: true, message: '保存成功' }
  },
})
