# [#](#子频道删除) 子频道删除

子频道被删除时触发。

## [#](#事件) 事件

|字段|值|
|---|---|
|事件名|CHANNEL\_DELETE|
|Intent|GUILDS (1<<0)|

### [#](#事件体) 事件体

|名称|类型|描述|
|---|---|---|
|id|string|子频道 ID|
|guild\_id|string|所属频道 ID|
|name|string|子频道名称|
|type|integer|子频道类型。0=文字, 2=语音, 4=分组, 10005=直播, 10006=应用, 10007=论坛|
|sub\_type|integer|子频道子类型|
|owner\_id|string|创建者 ID|
|op\_user\_id|string|操作人 ID|

### [#](#事件示例) 事件示例

**示例1**

```text
{
  "id": "123456",
  "guild_id": "123456789012345678",
  "name": "被删除的子频道",
  "type": 0,
  "sub_type": 0,
  "position": 1,
  "owner_id": "123456789012345678"
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

← [子频道更新](/wiki/develop/api-v2/autogen/event/channel_update.html) [获取频道详情](/wiki/develop/api-v2/autogen/api/guilds_guild_id.get.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区