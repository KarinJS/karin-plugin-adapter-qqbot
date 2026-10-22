# [#](#撤回子频道消息) 撤回子频道消息

### [#](#接口) 接口

```http
DELETE /channels/{channel_id}/messages/{message_id}?hidetip=false
```

1

### [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|hidetip|bool|选填，是否隐藏提示小灰条，true 为隐藏，false 为显示。默认为false|

### [#](#功能描述) 功能描述

用于撤回子频道 `channel_id` 下的消息 `message_id`

* 管理员可以撤回普通成员的消息。
* 频道主可以撤回所有人的消息。

注意

* 公域机器人暂不支持申请，仅私域机器人可用，选择私域机器人后默认开通。
* 注意: 开通后需要先将机器人从频道移除，然后重新添加，方可生效。

### [#](#content-type) Content-Type

```http
application/json
```

1

### [#](#返回) 返回

成功返回 HTTP 状态码 `200`。

### [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例) 示例

请求数据包

```http
DELETE /channels/123456/messages/112233
```

1

← [内嵌格式](/wiki/develop/api-v2/server-inter/channel/message/format.html) [频道私信](/wiki/develop/api-v2/server-inter/channel/message/dms.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区