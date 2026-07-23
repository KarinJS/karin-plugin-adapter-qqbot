# [#](#单聊消息接收关闭) 单聊消息接收关闭

用户在机器人资料卡手动关闭"主动消息"推送时触发。

用户在机器人资料卡手动关闭主动消息推送时触发。关闭后机器人无法向该用户发送主动消息。

## [#](#事件) 事件

|字段|值|
|---|---|
|事件名|C2C\_MSG\_REJECT|
|Intent|GROUP\_AND\_C2C\_EVENT (1<<25)|

### [#](#事件体) 事件体

|名称|类型|描述|
|---|---|---|
|timestamp|integer|操作时间戳（Unix 秒）|
|openid|string|用户 OpenID|

### [#](#事件示例) 事件示例

**C2C消息接收关闭**

```text
{
  "openid": "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4",
  "timestamp": 1784570599
}
```

1  
2  
3  
4

← [单聊消息接收开启](/wiki/develop/api-v2/autogen/event/c2c_msg_receive.html) [获取群基础信息](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_info.get.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区