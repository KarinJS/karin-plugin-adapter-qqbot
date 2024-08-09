# qaq

开发中...

如需使用:
  在`config\plugin\@karinjs\adapter-qqbot`创建`config.yaml`
  输入以下内容，请自行配置账号。当前`Markdown`仅支持`旧图文模板`和`原生`

  ```yaml
  # 全局默认配置 以下所有配置均可在账号配置中单独配置
default:
  # 获取调用凭证的api
  accessTokenApi: https://bots.qq.com/app/getAppAccessToken
  # 沙盒api
  sandBoxApi: https://sandbox.api.sgroup.qq.com
  # 正式环境api
  qqBotApi: https://api.sgroup.qq.com
  # 机器人发送模式 0-直接发送 1-原生Markdown 3-旧图文模板Markdown 4-纯文模板Markdown 5-自定义处理
  sendMode: 0
  # 是否开启沙盒环境
  sandBox: false
  # 是否启用频道机器人 未适配
  guild: false
  # 频道机器人模式 0-公域机器人 1-私域机器人
  guildMode: 0

  # 机器人Markdown模板ID 只有在sendMode为3或4时有效
  templateId: ""

  # 机器人旧图文模板Markdown配置
  oldTemplate:
    # 开头文字
    textStartKey: text_start
    # 图片描述
    imgDescKey: img_dec
    # 图片地址
    imgUrlKey: img_url
    # 结尾文字
    textEndKey: text_end

  # 机器人纯文模板Markdown配置
  textTemplate:
    - text_0
    - text_1
    - text_2
    - text_3
    - text_4
    - text_5
    - text_6
    - text_7
    - text_8
    - text_9

  # 文本中的url转二维码白名单 配置后将不转换这些url为二维码
  exclude: []
  # 接受到消息后对文本进行表达式处理
  regex: [
      {
        # 表达式
        reg: "^#",
        # 替换为
        rep: "",
      },
    ]

# 账号配置列表
accounts:
  default:
    # 机器人ID 必须为字符串
    appId: "123456789"
    # 机器人密钥
    secret: "123456789"
    # 机器人发送模式 0-直接发送 1-原生Markdown 3-旧图文模板Markdown 4-纯文模板Markdown 5-自定义处理
    sendMode: 0
    # 文本中的url转二维码白名单 配置后将不转换这些url为二维码 优先级高于全局配置
    exclude: []
    # 接受到消息后对文本进行表达式处理 优先级高于全局配置
    regex: []

  ```
