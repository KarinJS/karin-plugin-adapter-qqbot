# [#](#机器人加入群聊) 机器人加入群聊

机器人被添加到群聊时触发。

## [#](#事件) 事件

|字段|值|
|---|---|
|事件名|GROUP\_ADD\_ROBOT|
|Intent|GROUP\_AND\_C2C\_EVENT (1<<25)|

### [#](#事件体) 事件体

|名称|类型|描述|
|---|---|---|
|timestamp|integer|加入时间戳（Unix 秒）|
|group\_openid|string|群 OpenID|
|op\_member\_openid|string|操作添加机器人进群的群成员 OpenID|

### [#](#事件示例) 事件示例

**机器人加入群聊**

```text
{
  "group_openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "op_member_openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "timestamp": 1784570534
}
```

1  
2  
3  
4  
5

← [获取机器人群内状态](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_bot_state.get.html) [机器人退出群聊](/wiki/develop/api-v2/autogen/event/group_del_robot.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区