# [#](#获取频道消息频率的设置详情) 获取频道消息频率的设置详情

## [#](#接口) 接口

```http
GET /guilds/{guild_id}/message/setting
```

1

## [#](#功能描述) 功能描述

用于获取机器人在频道 `guild_id` 内的消息频率设置。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

返回[MessageSetting](/wiki/develop/api-v2/server-inter/channel/speak/setting/model.html#MessageSetting) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

响应数据包

```json
{
  "disable_create_dm": true,
  "disable_push_msg": false,
  "channel_ids": [
    "1146313",
    "2651849",
    "2651149"
  ],
  "channel_push_max_num": 12
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

← [发送机器人在频道接口权限的授权链接](/wiki/develop/api-v2/server-inter/channel/api_permissions/post_api_permission_demand.html) [频道全员禁言](/wiki/develop/api-v2/server-inter/channel/speak/patch_guild_mute.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区