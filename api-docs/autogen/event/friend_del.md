# [#](#用户删除好友) 用户删除好友

用户删除机器人好友时触发。

## [#](#事件) 事件

|字段|值|
|---|---|
|事件名|FRIEND\_DEL|
|Intent|GROUP\_AND\_C2C\_EVENT (1<<25)|

### [#](#事件体) 事件体

|名称|类型|描述|
|---|---|---|
|timestamp|integer|删除时间戳（Unix 秒）|
|openid|string|用户 OpenID|
|author|[FriendAuthor](#schema-friendauthor)|用户信息|

**FriendAuthor**

|名称|类型|描述|
|---|---|---|
|union\_openid|string|用户统一 OpenID（跨应用标识）|

### [#](#事件示例) 事件示例

**用户删除好友**

```text
{
  "openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "timestamp": 1784570524
}
```

1  
2  
3  
4

← [用户添加好友](/wiki/develop/api-v2/autogen/event/friend_add.html) [单聊消息接收开启](/wiki/develop/api-v2/autogen/event/c2c_msg_receive.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区