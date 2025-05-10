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
        title: item.appId,
        subtitle: '',
        appId: item.appId,
        secret: item.secret,
        prodApi: item.prodApi,
        sandboxApi: item.sandboxApi,
        tokenApi: item.tokenApi,
        sandbox: item.sandbox,
        qqEnable: item.qqEnable,
        guildEnable: item.guildEnable,
        guildMode: item.guildMode,
        exclude: item.exclude,
        regex: item.regex.map((item: any) => `<${item.reg}> <${item.rep}>`),
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
                label: '正式环境Api',
                description: '请输入你的正式环境Api',
                defaultValue: 'https://api.sgroup.qq.com',
                isRequired: true,
              }),
              components.input.create('sandboxApi', {
                label: '沙盒环境Api',
                description: '请输入你的沙盒环境Api',
                defaultValue: 'https://sandbox.api.sgroup.qq.com',
                isRequired: true,
              }),
              components.input.create('tokenApi', {
                label: '调用凭证的Api',
                description: '请输入你的调用凭证的Api',
                defaultValue: 'https://bots.qq.com/app/getAppAccessToken',
                isRequired: true,
              }),
              components.switch.create('sandbox', {
                label: '沙盒环境',
                description: '是否启用沙盒环境',
                defaultSelected: false,
              }),
              components.switch.create('qqEnable', {
                label: 'QQ场景',
                description: '是否启用QQ场景',
                defaultSelected: true,
              }),
              components.switch.create('guildEnable', {
                label: '频道场景',
                description: '是否启用频道场景',
                defaultSelected: true,
              }),
              components.switch.create('guildMode', {
                label: '频道场景模式',
                description: '频道场景模式 打开为公域 关闭为私域',
                defaultSelected: true,
              }),
              components.input.group('exclude', {
                data: [],
                label: '文本中的url转二维码白名单',
                description: '文本中的url转二维码白名单 配置后将不转换这些url为二维码',
                template: components.input.create('exclude_url', {
                  label: '白名单',
                }),
              }),
              components.input.group('regex', {
                data: [],
                label: '接受到消息后对文本进行表达式处理',
                description: '格式比较复杂: <reg> <rep> 分别表示正则和替换内容，请正确填写',
                template: components.input.create('regex', {
                  label: '正则',
                }),
              }),
              components.radio.group('markdown:mode', {
                label: 'markdown发送模式',
                description: '机器人发送模式 0-直接发送 1-原生Markdown 3-旧图文模板Markdown 4-纯文模板Markdown 5-自定义处理',
                defaultValue: '0',
                radio: [
                  components.radio.create('0', {
                    label: '直接发送',
                    value: '0',
                  }),
                  components.radio.create('1', {
                    label: '原生Markdown',
                    value: '1',
                  }),
                  components.radio.create('3', {
                    label: '旧图文模板Markdown',
                    value: '3',
                  }),
                  components.radio.create('4', {
                    label: '纯文模板Markdown',
                    value: '4',
                  }),
                  // components.radio.create('5', {
                  //   label: '自定义处理',
                  //   value: '5',
                  // }),
                ],
              }),
              components.input.create('markdown:id', {
                label: 'markdown模板ID',
                description: '请输入你的markdown模板ID',
              }),
              components.input.group('markdown:kv', {
                data: [],
                label: 'markdown模板变量',
                description: '请输入你的markdown模板变量',
                template: components.input.create('markdown:kv:key', {
                  label: '变量',
                }),
              }),
              components.radio.group('event:type', {
                label: '事件接收方式',
                defaultValue: '0',
                radio: [
                  components.radio.create('0', {
                    label: '关闭',
                    value: '0',
                    description: '关闭事件接收 临时禁用',
                  }),
                  components.radio.create('1', {
                    label: 'webhook',
                    value: '1',
                    description: '使用webhook接收事件 需要自行配置Nginx',
                  }),
                  components.radio.create('2', {
                    label: 'ws',
                    value: '2',
                    description: '使用ws接收事件 需要自行配置ws',
                  }),
                ],
              }),
              components.input.create('event:wsUrl', {
                label: 'ws地址',
                description: '请输入你的ws地址',
              }),
              components.input.create('event:wsToken', {
                label: 'wsToken',
                description: '请输入你的wsToken',
              }),
            ]
          }
        }
      )
    ]
  },
  /** 前端点击保存之后调用的方法 */
  save: (config: {
    qqbot: [
      {
        appId: string,
        secret: string,
        prodApi: string,
        sandboxApi: string,
        tokenApi: string,
        sandbox: boolean,
        qqEnable: boolean,
        guildEnable: boolean,
        guildMode: 0 | 1,
        exclude: string[],
        regex: string[],
        'markdown:mode': 0 | 1 | 3 | 4 | 5,
        'markdown:id': string,
        'markdown:kv': string[],
        'event:type': 0 | 1 | 2,
        'event:wsUrl': string,
        'event:wsToken': string
      }
    ]
  }) => {
    const data: Config = []
    config.qqbot.forEach((item) => {
      data.push({
        ...item,
        regex: item.regex.map((item: any) => {
          const [reg, rep] = item.split(' ')
          return {
            reg: reg.replace(/^<|>$|$/g, ''),
            rep: rep.replace(/^<|>$|$/g, ''),
          }
        }),
        markdown: {
          mode: item['markdown:mode'] ?? 0,
          id: item['markdown:id'] ?? '',
          kv: item['markdown:kv'] ?? [],
        },
        event: {
          type: item['event:type'] ?? 0,
          wsUrl: item['event:wsUrl'] ?? '',
          wsToken: item['event:wsToken'] ?? '',
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
