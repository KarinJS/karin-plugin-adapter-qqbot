# [#](#发送消息) 发送消息

### [#](#接口) 接口

`POST /channels/{channel_id}/messages`

### [#](#功能描述) 功能描述

用于向 `channel_id` 指定的子频道发送消息。

* 要求操作人在该子频道具有`发送消息`的权限。
* 主动消息在频道主或管理设置了情况下，按设置的数量进行限频。在未设置的情况遵循如下限制:
  * 主动推送消息，默认每天往每个子频道可推送的消息数是 `20` 条，超过会被限制。
  * 主动推送消息在每个频道中，每天可以往 `2` 个子频道推送消息。超过后会被限制。
* 不论主动消息还是被动消息，在一个子频道中，每 `1s` 只能发送 `5` 条消息。
* 被动回复消息有效期为 `5` 分钟。超时会报错。
* **发送消息接口要求机器人接口需要连接到 websocket 上保持在线状态**
* 有关主动消息审核，可以通过 [Intents](/wiki/develop/api-v2/dev-prepare/interface-framework/event-emit.html#事件订阅Intents) 中审核事件 MESSAGE\_AUDIT 返回 [MessageAudited](/wiki/develop/api-v2/server-inter/message/template/model.html#messageaudited) 对象获取结果。

### [#](#content-type) Content-Type

* 请求支持 `application/json` 和 `multipart/form-data` 两种。对于类型为 `multipart/form-data` 的请求，当字段类型为对象或数组时需要将字段序列化为 JSON 字符串后进行调用，可参考下文的[示例](#form-data-%E6%A0%BC%E5%BC%8F%E7%A4%BA%E4%BE%8B)。
* 回包统一使用 `application/json`

### [#](#通用参数) 通用参数

|字段名|类型|描述|
|---|---|---|
|content|string|选填，消息内容，文本内容，支持[内嵌格式](/wiki/develop/api-v2/server-inter/message/message_format.html)|
|embed|[MessageEmbed](/wiki/develop/api-v2/server-inter/message/template/model.html#messageembed)|选填，embed 消息，一种特殊的 ark，详情参考[Embed消息](/wiki/develop/api-v2/server-inter/message/type/embed.html)|
|ark|[MessageArk](/wiki/develop/api-v2/server-inter/message/template/model.html#messageark) ark消息对象|选填，ark 消息|
|message\_reference|[MessageReference](/wiki/develop/api-v2/server-inter/message/template/model.html#messagereference) 引用消息对象|选填，引用消息|
|image|string|选填，图片url地址，平台会转存该图片，用于下发图片消息|
|msg\_id|string|选填，要回复的消息id([Message](/wiki/develop/api-v2/server-inter/message/template/model.html#message).id), 在 [AT\_CREATE\_MESSAGE](/wiki/develop/api-v2/server-inter/message/message.html) 事件中获取。|
|event\_id|string|选填，要回复的事件id, 在各事件对象中获取。|
|markdown|[MessageMarkdown](/wiki/develop/api-v2/server-inter/message/template/model.html#messagemarkdown) markdown 消息对象|选填，markdown 消息|

### [#](#multipart-form-data-专有参数) `multipart/form-data` 专有参数

|字段名|类型|描述|
|---|---|---|
|file\_image|file|图片文件。form-data 支持直接通过文件上传的方式发送图片。|

**content, embed, ark, image/file\_image, markdown 至少需要有一个字段，否则无法下发消息。**

#### [#](#主动消息与被动消息) 主动消息与被动消息

* 主动消息：发送消息时，未填充 `msg_id/event_id` 字段的消息。
* 被动消息：发送消息时，填充了 `msg_id/event_id` 字段的消息。`msg_id` 和 `event_id` 两个字段任意填一个即为被动消息。接口使用此 `msg_id/event_id` 拉取用户的消息或事件，同时判断用户消息或事件的发送时间，如果超过被动消息回复时效，将会不允许发送该消息。
* 目前支持被动回复的事件类型有: GUILD\_MEMBER\_ADD GUILD\_MEMBER\_UPDATE GUILD\_MEMBER\_REMOVE MESSAGE\_REACTION\_ADD MESSAGE\_REACTION\_REMOVE FORUM\_THREAD\_CREATE FORUM\_THREAD\_UPDATE FORUM\_THREAD\_DELETE FORUM\_POST\_CREATE FORUM\_POST\_DELETE FORUM\_REPLY\_CREATE FORUM\_REPLY\_DELETE

### [#](#返回) 返回

返回[Message](/wiki/develop/api-v2/server-inter/message/template/model.html#message) 对象。

### [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

其中推送、回复消息的 `code` 错误码 `304023`、`304024` 会在 响应数据包 `data` 中返回 [MessageAudit](/wiki/develop/api-v2/openapi/error/data/model.html) 审核消息的信息，结构如下:

```json
{
  "code": 304023,
  "message": "push message is waiting for audit now",
  "data": {
    "message_audit": {
      "audit_id": "ab9bd72f-19e8-4394-b09e-66caca0d64e4"
    }
  }
}
```

1  
2  
3  
4  
5  
6  
7  
8  
9

### [#](#json-格式示例) JSON 格式示例

请求数据包

```json
{
  "content": "<@!1234>hello world",
  "msg_id": "xxxxxx"
}
```

1  
2  
3  
4

响应数据包

```json
{
  "id": "xxxxxx",
  "channel_id": "xxxxxx",
  "guild_id": "xxxxxx",
  "content": "<@!1234>hello world",
  "timestamp": "2021-05-13T14:45:45+08:00",
  "tts": false,
  "mention_everyone": false,
  "author": {
    "id": "xxxxxx",
    "username": "abc",
    "avatar": "",
    "bot": true
  },
  "embeds": [{}],
  "pinned": false,
  "type": 0,
  "flags": 0
}
```

1  
2  
3  
4  
5  
6  
7  
8  
9  
10  
11  
12  
13  
14  
15  
16  
17  
18  
19

### [#](#form-data-格式示例) form-data 格式示例

请求数据包

|字段名|值|
|---|---|
|content|<@!1234>hello world|
|ark|{"ark":{"template\_id":1,"kv":\[{"key":"#DESC#","value":"机器人订阅消息"}\]}}|

```json
{
  "id": "xxxxxx",
  "channel_id": "xxxxxx",
  "guild_id": "xxxxxx",
  "content": "<@!1234>hello world",
  "timestamp": "2021-05-13T14:45:45+08:00",
  "tts": false,
  "mention_everyone": false,
  "author": {
    "id": "xxxxxx",
    "username": "abc",
    "avatar": "",
    "bot": true
  },
  "embeds": [{}],
  "pinned": false,
  "type": 0,
  "flags": 0
}
```

1  
2  
3  
4  
5  
6  
7  
8  
9  
10  
11  
12  
13  
14  
15  
16  
17  
18  
19

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区