# [#](#频道消息事件) 频道消息事件

## [#](#at-message-create-intents-public-guild-messages) AT\_MESSAGE\_CREATE（intents PUBLIC\_GUILD\_MESSAGES）

### [#](#发送时机) 发送时机

* 用户发送消息，@当前机器人或回复机器人消息时
* 为保障消息投递的速度，消息顺序我们虽然会尽量有序，但是并不保证是严格有序的，如开发者对消息顺序有严格有序的需求，可以自行缓冲消息事件之后，基于 Message.seq 进行排序

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

## [#](#message-create-intents-public-guild-messages-私域) MESSAGE\_CREATE（intents PUBLIC\_GUILD\_MESSAGES，私域）

### [#](#发送时机-2) 发送时机

* 用户在文字子频道内发送的所有聊天消息（私域）
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

## [#](#direct-message-create-intents-direct-message) DIRECT\_MESSAGE\_CREATE（intents DIRECT\_MESSAGE）

### [#](#发送时机-3) 发送时机

* 用户通过私信发消息给机器人时
* 由于私信场景无法设置沙箱频道，目前私信事件不支持沙箱环境，开发者可以通过用户 id 白名单的方式来调试私信

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

## [#](#消息审核事件) 消息审核事件

### [#](#message-audit-pass-intents-message-audit) MESSAGE\_AUDIT\_PASS（intents MESSAGE\_AUDIT）

#### [#](#发送时机-4) 发送时机

* 消息审核通过

#### [#](#内容-4) 内容

[MessageAudited](/wiki/develop/api-v2/server-inter/message/template/model.html#messageaudited)

### [#](#message-audit-reject-intents-message-audit) MESSAGE\_AUDIT\_REJECT（intents MESSAGE\_AUDIT）

#### [#](#发送时机-5) 发送时机

* 消息审核不通过

#### [#](#内容-5) 内容

[MessageAudited](/wiki/develop/api-v2/server-inter/message/template/model.html#messageaudited)

#### [#](#示例-4) 示例

```json
{
  "audit_id": "5f60b782-d134-4628-93b8-9baa4b182f48",
  "audit_time": "2022-01-04T18:05:42+08:00",
  "channel_id": "1699792",
  "create_time": "2022-01-04T18:05:42+08:00",
  "guild_id": "46646271634786417",
  "message_id": "10d0df671a1231343431313532313831383136323933383420801e280030a0cbc4013848404148f6b7d08e0650b1acf8fa05"
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

← [表情表态](/wiki/develop/api-v2/server-inter/message/trans/emoji.html) [消息类型](/wiki/develop/api-v2/server-inter/message/type/overview.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区