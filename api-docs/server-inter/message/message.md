# [#](#消息事件) 消息事件

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

# [#](#消息审核事件) 消息审核事件

## [#](#message-audit-pass-intents-message-audit) MESSAGE\_AUDIT\_PASS（intents MESSAGE\_AUDIT）

### [#](#发送时机-2) 发送时机

* 消息审核通过

### [#](#内容-2) 内容

[MessageAudited](/wiki/develop/api-v2/server-inter/message/template/model.html#messageaudited)

## [#](#message-audit-reject-intents-message-audit) MESSAGE\_AUDIT\_REJECT（intents MESSAGE\_AUDIT）

### [#](#发送时机-3) 发送时机

* 消息审核不通过

### [#](#内容-3) 内容

[MessageAudited](/wiki/develop/api-v2/server-inter/message/template/model.html#messageaudited)

### [#](#示例-2) 示例

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

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区