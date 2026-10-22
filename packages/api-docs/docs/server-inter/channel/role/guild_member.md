# [#](#频道成员事件) 频道成员事件

## [#](#内容) 内容

在 [MemberWithGuildID](/wiki/develop/api-v2/server-inter/channel/role/member/model.html#MemberWithGuildID) 基础上，增加 `op_user_id` 代表操作人。

注：此事件由于开发较早，尚有一些字段未标准化处理，如 `joined_at`, `roles` 请开发者适配的时候注意。晚些时候我们也会将这些字段标准化处理。

## [#](#guild-member-add) GUILD\_MEMBER\_ADD

### [#](#发送时机) 发送时机

* 新用户加入频道

### [#](#示例) 示例

```json
{
    "guild_id": "200000000",
    "joined_at": "2021-10-21T11:20:18+08:00",
    "nick": "",
    "op_user_id": "100000000",
    "roles": [
      "1"
    ],
    "user": {
      "avatar": "http://thirdqq.qlogo.cn/g?b=oidb&k=IU4JJatZtNXCVrf44eshNg&s=0&t=1638261405",
      "bot": true,
      "id": "8834102668809967837",
      "username": "b站机器人"
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
14  
15

## [#](#guild-member-update) GUILD\_MEMBER\_UPDATE

### [#](#发送时机-2) 发送时机

* 用户的频道属性发生变化，如频道昵称，或者身份组

### [#](#示例-2) 示例

```json
{
  "guild_id": "200000000",
  "joined_at": "2021-10-21T11:20:18+08:00",
  "nick": "",
  "op_user_id": "8834102668809967837",
  "roles": ["2"],
  "user": {
   "avatar": "http://thirdqq.qlogo.cn/g?b=oidb&k=IU4JJatZtNXCVrf44eshNg&s=0&t=1638261405",
   "bot": true,
   "id": "8834102668809967837",
   "username": "b站机器人"
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

## [#](#guild-member-remove) GUILD\_MEMBER\_REMOVE

### [#](#发送时机-3) 发送时机

* 用户离开频道

### [#](#示例-3) 示例

```json
{
    "guild_id": "200000000",
    "joined_at": "2021-10-21T11:20:18+08:00",
    "nick": "",
    "op_user_id": "100000000",
    "roles": [
      "1"
    ],
    "user": {
      "avatar": "http://thirdqq.qlogo.cn/g?b=oidb&k=IU4JJatZtNXCVrf44eshNg&s=0&t=1638261405",
      "bot": true,
      "id": "8834102668809967837",
      "username": "b站机器人"
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
14  
15

← [删除频道成员](/wiki/develop/api-v2/server-inter/channel/role/member/delete_member.html) [音视频/直播子频道成员进出事件](/wiki/develop/api-v2/server-inter/channel/role/audio_or_live_channel_member.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区