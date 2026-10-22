# [#](#表情表态) 表情表态

说明

目前表情表态仅支持在频道内使用

## [#](#机器人发表表情表态) 机器人发表表情表态

### [#](#接口) 接口

```http
PUT /channels/{channel_id}/messages/{message_id}/reactions/{type}/{id}
```

1

### [#](#功能描述) 功能描述

对消息 `message_id` 进行表情表态

### [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|channel\_id|string|子频道ID|
|message\_id|string|消息ID|
|type|int|表情类型，参考 [EmojiType](/wiki/develop/api-v2/openapi/emoji/model.html#EmojiType)|
|id|string|表情ID，参考 [Emoji 列表](/wiki/develop/api-v2/openapi/emoji/model.html#Emoji 列表)|

### [#](#返回) 返回

成功返回 HTTP 状态码 `204`。

### [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例) 示例

请求数据包

```http
PUT /channels/1013531/messages/08c095b7ba8ed4abd7e00110cbd83f3841489aa2bd9006/reactions/1/203
```

1

## [#](#删除机器人发表的表情表态) 删除机器人发表的表情表态

### [#](#接口-2) 接口

```http
DELETE /channels/{channel_id}/messages/{message_id}/reactions/{type}/{id}
```

1

### [#](#功能描述-2) 功能描述

删除自己对消息 `message_id` 的表情表态

### [#](#参数-2) 参数

|字段名|类型|描述|
|---|---|---|
|channel\_id|string|子频道ID|
|message\_id|string|消息ID|
|type|int|表情类型，参考 [EmojiType](/wiki/develop/api-v2/openapi/emoji/model.html#EmojiType)|
|id|string|表情ID，参考 [Emoji 列表](/wiki/develop/api-v2/openapi/emoji/model.html#Emoji 列表)|

### [#](#返回-2) 返回

成功返回 HTTP 状态码 `204`。

### [#](#错误码-2) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例-2) 示例

请求数据包

```http
DELETE /channels/1013531/messages/08c095b7ba8ed4abd7e00110cbd83f3841489aa2bd9006/reactions/1/203
```

1

## [#](#获取消息表情表态的用户列表) 获取消息表情表态的用户列表

### [#](#接口-3) 接口

```http
GET /channels/{channel_id}/messages/{message_id}/reactions/{type}/{id}?cookie={cookie}&limit={limit}
```

1

### [#](#功能描述-3) 功能描述

拉取对消息 `message_id` 指定表情表态的用户列表

### [#](#path-参数) Path 参数

|字段名|类型|描述|
|---|---|---|
|channel\_id|string|子频道ID|
|message\_id|string|消息ID|
|type|int|表情类型，参考 EmojiType|
|id|string|表情ID，参考 Emoji 列表|

### [#](#query-参数) Query 参数

|字段名|类型|描述|
|---|---|---|
|cookie|string|上次请求返回的cookie，第一次请求无需填写|
|limit|int|每次拉取数量，默认20，最多50，只在第一次请求时设置|

### [#](#返回-3) 返回

|字段名|类型|描述|
|---|---|---|
|users|array|用户对象，参考 User，会返回 id, username, avatar|
|cookie|string|分页参数，用于拉取下一页|
|is\_end|bool|是否已拉取完成到最后一页，true代表完成|

### [#](#错误码-3) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例-3) 示例

请求数据包

```http
GET /channels/1013531/messages/08c095b7ba8ed4abd7e00110cbd83f3841489aa2bd9006/reactions/1/203?cookie=&limit=20
```

1

返回数据包

```json
{
    "users": [
        {
            "id": "1158788878435714165",
            "username": "频道机器人",
            "avatar": "http://thirdqq.qlogo.cn/g?b=oidb&k=T2qBkyqicopYXA5mn0lBkqA&s=0&t=1635736336"
        }
    ],
    "cookie":"1_2",
    "is_end": false
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

## [#](#事件) 事件

### [#](#用户发表) 用户发表

* **基本概况**

用户对消息进行表情表态时，触发事件通知。

#### [#](#message-reaction-add-intents-guild-message-reactions) MESSAGE\_REACTION\_ADD (intents GUILD\_MESSAGE\_REACTIONS)

##### [#](#发送时机) 发送时机

* 用户对消息进行表情表态时

#### [#](#message-reaction-remove-intents-guild-message-reactions) MESSAGE\_REACTION\_REMOVE (intents GUILD\_MESSAGE\_REACTIONS)

##### [#](#发送时机-2) 发送时机

* 用户对消息进行取消表情表态时

##### [#](#内容) 内容

内容为 [MessageReaction](/wiki/develop/api-v2/openapi/reaction/model.html#MessageReaction) 对象

##### [#](#示例-4) 示例

```json
{
  "user_id": "1111222233333",
  "emoji": {
    "id": "277",
    "type": 1
  },
  "channel_id": "12345",
  "guild_id": "11110011112222",
  "target": {
    "id": "2",
    "type": 0
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
10  
11  
12  
13

← [频道私信](/wiki/develop/api-v2/server-inter/channel/message/dms.html) [频道消息事件](/wiki/develop/api-v2/server-inter/channel/message/event.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区