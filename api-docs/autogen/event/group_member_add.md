# [#](#群成员加入) 群成员加入

有新成员加入群聊时触发。

## [#](#事件) 事件

|字段|值|
|---|---|
|事件名|GROUP\_MEMBER\_ADD|
|Intent|GROUP\_AND\_C2C\_EVENT (1<<25)|

### [#](#事件体) 事件体

|名称|类型|描述|
|---|---|---|
|timestamp|integer|事件时间戳（Unix 秒）|
|group\_openid|string|群 OpenID|
|member\_openid|string|新加入成员的 OpenID|
|user\_openid|string|新成员的用户 OpenID（跨应用统一标识，可能为空）|

### [#](#事件示例) 事件示例

**示例1**

```text
{
  "timestamp": 1784276757,
  "group_openid": "B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5",
  "member_openid": "C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6",
  "user_openid": "C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6"
}
```

1  
2  
3  
4  
5  
6

← [群聊消息接收关闭](/wiki/develop/api-v2/autogen/event/group_msg_reject.html) [群成员退出](/wiki/develop/api-v2/autogen/event/group_member_remove.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区