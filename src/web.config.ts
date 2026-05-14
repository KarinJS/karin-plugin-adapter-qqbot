import { Config } from './types'
import { pkg, config, writeConfig } from './utils'
import { defineConfig, components } from 'node-karin'

export default defineConfig({
  info: {
    id: pkg().name,
    name: 'QQBot适配器',
    version: pkg().version,
    description: '为karin提供QQ官方Bot连接能力',
    author: [
      {
        name: 'shijin',
        avatar: 'https://github.com/sj817.png'
      }
    ]
  },
  components: () => {
    const data: any[] = []

    const cfg = config.config()
    cfg.forEach((item) => {
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
        'markdown:mode': String(item.markdown?.mode ?? 0),
        'event:type': String(item.event?.type ?? 2),
      })
    })

    return [
      components.accordionPro.create(
        'qqbot',
        data,
        {
          label: 'QQBot',
          description: 'QQBot配置',
          children: {
            key: 'qqbotConfig',
            children: [
              components.input.create('name', {
                label: '机器人名称',
                description: '请输入机器人名称，扫码登录会自动获取',
              }),
              components.input.create('appId', {
                label: 'AppID',
                description: '请输入你的AppID',
                isRequired: true,
              }),
              components.input.create('secret', {
                label: 'Secret',
                description: '请输入你的Secret',
                isRequired: true,
              }),
              components.input.create('prodApi', {
                label: '正式环境 API',
                description: 'QQ Bot 正式环境接口地址',
                defaultValue: 'https://api.sgroup.qq.com',
                isRequired: true,
              }),
              components.input.create('sandboxApi', {
                label: '沙盒环境 API',
                description: 'QQ Bot 沙盒环境接口地址',
                defaultValue: 'https://sandbox.api.sgroup.qq.com',
                isRequired: true,
              }),
              components.input.create('tokenApi', {
                label: 'AccessToken 接口',
                description: '获取 QQ Bot 调用凭证的接口地址',
                defaultValue: 'https://bots.qq.com/app/getAppAccessToken',
                isRequired: true,
              }),
              components.switch.create('sandbox', {
                label: '沙盒环境',
                description: '启用后调用沙盒 API，用于开发和测试',
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
                label: '频道模式',
                description: '开启 = 私域机器人（仅接收 @机器人的消息），关闭 = 公域机器人',
                defaultSelected: false,
              }),
              components.input.group('regex', {
                data: [],
                label: '消息正则替换',
                description: '每行格式：正则表达式 替换内容。如：^/ #  表示将消息开头的 / 替换为 #',
                template: components.input.create('regex', {
                  label: '正则规则',
                  placeholder: '^/ #',
                }),
              }),
              components.radio.group('markdown:mode', {
                label: 'Markdown 发送模式',
                description: '机器人发送消息时的 Markdown 处理方式',
                defaultValue: '0',
                radio: [
                  components.radio.create('0', {
                    label: '直接发送',
                    value: '0',
                    description: '直接发送原始消息（支持 markdown 元素）',
                  }),
                  components.radio.create('1', {
                    label: '强制转 Markdown',
                    value: '1',
                    description: '将纯文本强制转换为 Markdown 格式发送',
                  }),
                ],
              }),
              components.radio.group('event:type', {
                label: '事件接收方式',
                description: '选择 QQ 官方推送事件的方式',
                defaultValue: '2',
                radio: [
                  components.radio.create('0', {
                    label: '关闭',
                    value: '0',
                    description: '不接收任何事件，机器人处于离线状态',
                  }),
                  components.radio.create('1', {
                    label: 'Webhook',
                    value: '1',
                    description: 'QQ 官方主动推送事件到本机（需要公网可访问，并在 QQ 开放平台配置 Webhook 地址）',
                  }),
                  components.radio.create('2', {
                    label: 'WebSocket',
                    value: '2',
                    description: '主动连接 QQ 官方 WebSocket 网关接收事件（无需公网 IP，推荐）',
                  }),
                ],
              }),
            ]
          }
        }
      )
    ]
  },
  /** 前端点击保存之后调用的方法 */
  save: (config: {
    qqbot: Array<{
      name: string,
      appId: string,
      secret: string,
      prodApi: string,
      sandboxApi: string,
      tokenApi: string,
      sandbox: boolean,
      qqEnable: boolean,
      guildEnable: boolean,
      guildMode: boolean,
      regex: string[],
      'markdown:mode': string,
      'event:type': string,
    }>
  }) => {
    if (!Array.isArray(config.qqbot)) {
      return { success: false, message: '保存失败：配置格式错误' }
    }

    const data: Config = []
    config.qqbot.forEach((item) => {
      // guildMode: switch 组件传 boolean，需要转换为 0 | 1
      const guildMode = item.guildMode === true ? 1 : 0

      // radio-group 的值是字符串，需要转为 number
      const markdownMode = Number(item['markdown:mode'] ?? 0) as 0 | 1
      const eventType = Number(item['event:type'] ?? 0) as 0 | 1 | 2

      // regex: input-group 的每个条目是字符串，格式为 "<reg> <rep>" 或 "reg rep"
      const regex = (item.regex || []).map((str: string) => {
        const parts = str.split(' ')
        const reg = parts[0]?.replace(/^<|>$/g, '') || ''
        const rep = parts[1]?.replace(/^<|>$/g, '') || ''
        return { reg, rep }
      })

      data.push({
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
        markdown: { mode: markdownMode },
        event: {
          type: eventType,
          wsUrl: '',
          wsToken: '',
        },
      })
    })

    writeConfig(data)

    return {
      success: true,
      message: '保存成功'
    }
  }
})
