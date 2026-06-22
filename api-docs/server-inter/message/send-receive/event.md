# [#](#事件) 事件

## [#](#单聊消息) 单聊消息

说明

用户在单聊发送消息给机器人

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|C2C\_MESSAGE\_CREATE|
|触发场景|用户在单聊发送消息给机器人|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|id|string|平台方消息ID，可以用于被动消息发送|
|author|object|发送者|
|content|string|文本消息内容|
|timestamp|string|消息生产时间（RFC3339）|
|attachments|object\[\]|富媒体文件附件，文件类型："图片，语音，视频，文件"|

author对象

|**属性**|**类型**|**说明**|
|---|---|---|
|user\_openid|string|用户 openid|

attachment对象

|**属性**|**类型**|**说明**|
|---|---|---|
|content\_type|string|文件类型，"image/jpeg","image/png","image/gif"，"file"，"video/mp4"，"voice"|
|filename|string|文件名称|
|height|int|图片高度|
|width|int|图片宽度|
|size|int|文件大小|
|url|string|文件链接|
|voice\_wav\_url|string|语音文件链接（wav格式）|
|asr\_refer\_text|string|语音 asr 参考结果|

* **事件示例**

```json
{
  "author": {
      "user_openid": "E4F4AEA33253A2797FB897C50B81D7ED"
  },
  "content": "123",
  "id": "ROBOT1.0_.b6nx.CVryAO0nR58RXuU6SC.m92gc19j02qKqdm8ek!",
  "timestamp": "2023-11-06T13:37:18+08:00"
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

* **其他说明**

为了确保消息可到达，极端情况下，相同的 msg\_id 的消息会有概率重复推送，当开发者在做“被动回复消息”响应业务的时候，如果开发者不对 msg\_id 的回复做存储排重后的回复逻辑，很可能会回复了两条相同的消息给用户，这里我们引入了一个 `msg_seq` 的字段，便于过滤重复消息响应，可参考消息发送接口 msg\_seq 的用法。

## [#](#群聊-机器人) 群聊@机器人

说明

用户在群内@机器人发送的消息

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|GROUP\_AT\_MESSAGE\_CREATE|
|触发场景|用户在群聊@机器人发送消息|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|id|string|平台方消息 ID，可以用于被动消息发送|
|author|object|发送者|
|content|string|消息内容|
|timestamp|string|消息生产时间（RFC3339）|
|group\_openid|string|群聊的 openid|
|attachments|object\[\]|富媒体文件附件，文件类型："图片，语音，视频，文件"|

author 对象

|**属性**|**类型**|**说明**|
|---|---|---|
|member\_openid|string|用户在本群的 member\_openid|
|member\_role|string|消息发送者在群内的身份，枚举值：owner、admin、member|
|bot|bool|是否是机器人|

* **事件示例**

```json
// Websocket
{
  "author": {
      "member_openid": "E4F4AEA33253A2797FB897C50B81D7ED"
  },
  "content": " 123",
  "group_openid": "C9F778FE6ADF9D1D1DBE395BF744A33A",
  "id": "ROBOT1.0_eBIyWnxpmSu6uLQ7u7fU0eGloKGYg4eEa737vRyKnMCgyZjKi7JLYkQ9B0VapbiY",
  "timestamp": "2023-11-06T13:37:18+08:00"
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

* **其他说明**

为了确保消息可到达，极端情况下，相同的 msg\_id 的消息会有概率重复推送，当开发者在做“被动回复消息”响应业务的时候，如果开发者不对 msg\_id 的回复做存储排重后的回复逻辑，很可能会回复了两条相同的消息给用户，这里我们引入了一个 `msg_seq` 的字段，便于过滤重复消息响应，可参考消息发送接口 msg\_seq 的用法。

## [#](#群聊全量消息) 群聊全量消息

说明

当群主设定允许该机器人接收群内全部消息时，机器人可接收到群内所有成员在群内的发言消息。

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|GROUP\_MESSAGE\_CREATE|
|触发场景|用户在群聊@机器人发送消息|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|id|string|平台方消息 ID，可以用于被动消息发送|
|author|object|发送者|
|content|string|消息内容|
|timestamp|string|消息生产时间（RFC3339）|
|group\_openid|string|群聊的 openid|
|attachments|object\[\]|富媒体文件附件，文件类型："图片，语音，视频，文件"|

author 对象

|**属性**|**类型**|**说明**|
|---|---|---|
|member\_openid|string|用户在本群的 member\_openid|
|member\_role|string|消息发送者在群内的身份，枚举值：owner、admin、member|
|bot|bool|是否是机器人|

* **事件示例**

```json
// Websocket
{
  "author": {
      "member_openid": "E4F4AEA33253A2797FB897C50B81D7ED"
  },
  "content": " 123",
  "group_openid": "C9F778FE6ADF9D1D1DBE395BF744A33A",
  "id": "ROBOT1.0_eBIyWnxpmSu6uLQ7u7fU0eGloKGYg4eEa737vRyKnMCgyZjKi7JLYkQ9B0VapbiY",
  "timestamp": "2023-11-06T13:37:18+08:00"
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

## [#](#频道私信消息) 频道私信消息

用户在频道私信给机器人发送的消息

* **基本概况**

||
|---|
|基本|
|事件类型|DIRECT\_MESSAGE\_CREATE|
|触发场景|用户在频道私信内发送消息给机器人|

### [#](#发送时机) 发送时机

* 用户通过私信发消息给机器人时
* 由于私信场景无法设置沙箱频道，目前私信事件不支持沙箱环境，开发者可以通过用户 id 白名单的方式来调试私信

### [#](#内容) 内容

内容为 [Message](/wiki/develop/api-v2/server-inter/message/template/model.html#message) 对象

### [#](#示例) 示例

```json
{
    "author": {
        "avatar": "http://thirdqq.qlogo.cn/0",
        "bot": false,
        "id": "1234",
        "username": "abc"
    },
    "channel_id": "100010",
    "content": "ndnnd",
    "guild_id": "18700000000001",
    "id": "0812345677890abcdef",
    "member": {
        "joined_at": "2021-04-12T16:34:42+08:00",
        "roles": [
            "1"
        ]
    },
    "timestamp": "2021-05-20T15:14:58+08:00"
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

## [#](#文字子频道-机器人) 文字子频道@机器人

用户在文字子频道内@机器人发送的消息

* **基本概况**

||
|---|
|基本|
|事件类型|AT\_MESSAGE\_CREATE|
|触发场景|用户在频道私信内发送消息给机器人|

### [#](#发送时机-2) 发送时机

* 用户发送消息，@当前机器人或回复机器人消息时
* 为保障消息投递的速度，消息顺序我们虽然会尽量有序，但是并不保证是严格有序的，如开发者对消息顺序有严格有序的需求，可以自行缓冲消息事件之后，基于 Message.seq 进行排序

### [#](#内容-2) 内容

内容为 [Message](/wiki/develop/api-v2/server-inter/message/template/model.html#message) 对象

### [#](#示例-2) 示例

```json
{
  "author": {
    "avatar": "http://thirdqq.qlogo.cn/0",
    "bot": false,
    "id": "1234",
    "username": "abc"
  },
  "channel_id": "100010",
  "content": "ndnnd",
  "guild_id": "18700000000001",
  "id": "0812345677890abcdef",
  "member": {
    "joined_at": "2021-04-12T16:34:42+08:00",
    "roles": ["1"]
  },
  "timestamp": "2021-05-20T15:14:58+08:00",
  "seq": 101
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

## [#](#文字子频道全量消息-私域) 文字子频道全量消息（私域）

用户在文字子频道内发送的所有聊天消息（私域）

* **基本概况**

||
|---|
|基本|
|事件类型|MESSAGE\_CREATE|
|触发场景|用户在频道私信内发送消息给机器人|

### [#](#发送时机-3) 发送时机

* 用户发送消息，@当前机器人或回复机器人消息时
* 为保障消息投递的速度，消息顺序我们虽然会尽量有序，但是并不保证是严格有序的，如开发者对消息顺序有严格有序的需求，可以自行缓冲消息事件之后，基于 Message.seq 进行排序

### [#](#内容-3) 内容

内容为 [Message](/wiki/develop/api-v2/server-inter/message/template/model.html#message) 对象

### [#](#示例-3) 示例

```json
{
  "author": {
    "avatar": "http://thirdqq.qlogo.cn/0",
    "bot": false,
    "id": "1234",
    "username": "abc"
  },
  "channel_id": "100010",
  "content": "ndnnd",
  "guild_id": "18700000000001",
  "id": "0812345677890abcdef",
  "member": {
    "joined_at": "2021-04-12T16:34:42+08:00",
    "roles": ["1"]
  },
  "timestamp": "2021-05-20T15:14:58+08:00",
  "seq": 101
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

← [撤回消息](/wiki/develop/api-v2/server-inter/message/send-receive/reset.html) [文本消息](/wiki/develop/api-v2/server-inter/message/type/text.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区