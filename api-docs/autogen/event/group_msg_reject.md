# [#](#群聊消息接收关闭) 群聊消息接收关闭

群管理员在机器人资料页操作关闭通知时触发。

## [#](#事件) 事件

|字段|值|
|---|---|
|事件名|GROUP\_MSG\_REJECT|
|Intent|GROUP\_AND\_C2C\_EVENT (1<<25)|

### [#](#事件体) 事件体

|名称|类型|描述|
|---|---|---|
|timestamp|integer|操作时间戳（Unix 秒）|
|group\_openid|string|群 OpenID|
|op\_member\_openid|string|操作群成员 OpenID|

### [#](#事件示例) 事件示例

**群消息接收关闭**

```text
{
  "timestamp": 1784276810,
  "group_openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "op_member_openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4"
}
```

1  
2  
3  
4  
5

← [群聊消息接收开启](/wiki/develop/api-v2/autogen/event/group_msg_receive.html) [群成员加入](/wiki/develop/api-v2/autogen/event/group_member_add.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区