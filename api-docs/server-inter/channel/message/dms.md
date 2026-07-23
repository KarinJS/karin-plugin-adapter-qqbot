# [#](#频道私信) 频道私信

机器人可与同一频道内的成员建立私信会话，通过私信接口收发消息。

## [#](#创建私信会话) 创建私信会话

### [#](#接口) 接口

```http
POST /users/@me/dms
```

1

### [#](#功能描述) 功能描述

用于机器人和在同一个频道内的成员创建私信会话。

* 机器人和用户存在共同频道才能创建私信会话。
* 创建成功后，返回创建成功的频道 `id` ，子频道 `id` 和创建时间。

### [#](#content-type) Content-Type

```http
application/json
```

1

### [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|recipient\_id|string|接收者 id|
|source\_guild\_id|string|源频道 id|

### [#](#返回) 返回

返回[DMS](#dms)对象。

### [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例) 示例

请求数据包

```json
{
  "recipient_id": "123456",
  "source_guild_id": "112233"
}
```

1  
2  
3  
4

响应数据包

```json
{
  "guild_id": "xxxxxx",
  "channel_id": "xxxxxx",
  "create_time": "1642545606"
}
```

1  
2  
3  
4  
5

## [#](#发送私信) 发送私信

### [#](#接口-2) 接口

```http
POST /dms/{guild_id}/messages
```

1

### [#](#功能描述-2) 功能描述

用于发送私信消息，前提是已经创建了私信会话。

* 私信的 `guild_id` 在[创建私信会话](#%E5%88%9B%E5%BB%BA%E7%A7%81%E4%BF%A1%E4%BC%9A%E8%AF%9D)时以及[私信消息事件](/wiki/develop/api-v2/server-inter/channel/message/event.html#direct_message_create)中获取。
* 私信场景下，每个机器人每天可以对一个用户发 `2` 条主动消息。
* 私信场景下，每个机器人每天累计可以发 `200` 条主动消息。
* 私信场景下，被动消息没有条数限制。

### [#](#content-type-2) Content-Type

```http
application/json
```

1

### [#](#参数-2) 参数

和[发送子频道消息](/wiki/develop/api-v2/server-inter/channel/message/send.html)参数一致。

### [#](#返回-2) 返回

和[发送子频道消息](/wiki/develop/api-v2/server-inter/channel/message/send.html)返回一致。

### [#](#错误码-2) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例-2) 示例

参见[发送子频道消息](/wiki/develop/api-v2/server-inter/channel/message/send.html#json-格式示例)示例。

## [#](#撤回私信) 撤回私信

### [#](#接口-3) 接口

```http
DELETE /dms/{guild_id}/messages/{message_id}?hidetip=false
```

1

### [#](#参数-3) 参数

|字段名|类型|描述|
|---|---|---|
|hidetip|bool|选填，是否隐藏提示小灰条，true 为隐藏，false 为显示。默认为false|

### [#](#功能描述-3) 功能描述

用于撤回私信频道 `guild_id` 中 `message_id` 指定的私信消息。只能用于撤回机器人自己发送的私信。

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
DELETE /dms/123456/messages/112233
```

1

## [#](#dms-对象) DMS 对象

### [#](#dms) DMS

|字段名|类型|描述|
|---|---|---|
|guild\_id|string|私信会话关联的频道 id|
|channel\_id|string|私信会话关联的子频道 id|
|create\_time|string|创建私信会话时间戳|

← [撤回子频道消息](/wiki/develop/api-v2/server-inter/channel/message/recall.html) [表情表态](/wiki/develop/api-v2/server-inter/message/trans/emoji.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区