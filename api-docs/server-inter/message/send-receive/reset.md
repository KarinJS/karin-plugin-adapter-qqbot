# [#](#撤回消息) 撤回消息

## [#](#单聊) 单聊

### [#](#接口) 接口

```http
DELETE /v2/users/{openid}/messages/{message_id}
```

1

### [#](#功能描述) 功能描述

用于撤回机器人发送给当前用户 `openid` 的消息 `message_id`，发送超出2分钟的消息不可撤回

### [#](#content-type) Content-Type

```http
application/json
```

1

### [#](#返回) 返回

成功返回 HTTP 状态码 `200`。

### [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/dev-prepare/error-trace/openapi.html)。

### [#](#示例) 示例

请求数据包

```http
DELETE /v2/users/123456/messages/112233
```

1

## [#](#群聊) 群聊

### [#](#接口-2) 接口

```http
DELETE /v2/groups/{group_openid}/messages/{message_id}
```

1

### [#](#功能描述-2) 功能描述

用于撤回机器人发送在当前群 `group_openid` 的消息 `message_id`，发送超出2分钟的消息不可撤回

### [#](#content-type-2) Content-Type

```http
application/json
```

1

### [#](#返回-2) 返回

成功返回 HTTP 状态码 `200`。

### [#](#错误码-2) 错误码

详见[错误码](/wiki/develop/api-v2/dev-prepare/error-trace/openapi.html)。

### [#](#示例-2) 示例

请求数据包

```http
DELETE /v2/groups/123456/messages/112233
```

1

## [#](#文字子频道) 文字子频道

### [#](#接口-3) 接口

```http
DELETE /channels/{channel_id}/messages/{message_id}?hidetip=false
```

1

### [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|hidetip|bool|选填，是否隐藏提示小灰条，true 为隐藏，false 为显示。默认为false|

### [#](#功能描述-3) 功能描述

用于撤回子频道 `channel_id` 下的消息 `message_id`

* 管理员可以撤回普通成员的消息。
* 频道主可以撤回所有人的消息。

注意

* 公域机器人暂不支持申请，仅私域机器人可用，选择私域机器人后默认开通。
* 注意: 开通后需要先将机器人从频道移除，然后重新添加，方可生效。

### [#](#content-type-3) Content-Type

```http
application/json
```

1

### [#](#返回-3) 返回

成功返回 HTTP 状态码 `200`。

### [#](#错误码-3) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例-3) 示例

请求数据包

```http
DELETE /channels/123456/messages/112233
```

1

## [#](#频道私信) 频道私信

### [#](#接口-4) 接口

```http
DELETE /dms/{guild_id}/messages/{message_id}?hidetip=false
```

1

### [#](#参数-2) 参数

|字段名|类型|描述|
|---|---|---|
|hidetip|bool|选填，是否隐藏提示小灰条，true 为隐藏，false 为显示。默认为false|

### [#](#功能描述-4) 功能描述

用于撤回私信频道 `guild_id` 中 `message_id` 指定的私信消息。只能用于撤回机器人自己发送的私信。

注意

* 公域机器人暂不支持申请，仅私域机器人可用，选择私域机器人后默认开通。
* 注意: 开通后需要先将机器人从频道移除，然后重新添加，方可生效。

### [#](#content-type-4) Content-Type

```http
application/json
```

1

### [#](#返回-4) 返回

成功返回 HTTP 状态码 `200`。

### [#](#错误码-4) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例-4) 示例

请求数据包

```http
DELETE /dms/123456/messages/112233
```

1

← [富媒体消息](/wiki/develop/api-v2/server-inter/message/send-receive/rich-media.html) [事件](/wiki/develop/api-v2/server-inter/message/send-receive/event.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区