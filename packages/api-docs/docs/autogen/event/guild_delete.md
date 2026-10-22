# [#](#频道解散) 频道解散

频道被解散或机器人被移除时触发。事件内容为变更前的数据。

## [#](#事件) 事件

|字段|值|
|---|---|
|事件名|GUILD\_DELETE|
|Intent|GUILDS (1<<0)|

### [#](#事件体) 事件体

|名称|类型|描述|
|---|---|---|
|id|string|频道 ID|
|name|string|频道名称|
|icon|string|频道头像 URL|
|owner\_id|string|频道创建者 ID|
|member\_count|integer|频道成员数|
|max\_members|integer|频道成员上限|
|description|string|频道简介|
|joined\_at|string|加入时间，ISO8601 格式|
|op\_user\_id|string|操作人 ID|

### [#](#事件示例) 事件示例

**示例1**

```text
{
  "id": "123456789012345678",
  "name": "测试频道",
  "owner_id": "123456789012345678",
  "icon": "https://thirdqq.qlogo.cn/0",
  "member_count": 10,
  "max_members": 1000,
  "description": "频道描述"
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

← [频道更新](/wiki/develop/api-v2/autogen/event/guild_update.html) [子频道创建](/wiki/develop/api-v2/autogen/event/channel_create.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区