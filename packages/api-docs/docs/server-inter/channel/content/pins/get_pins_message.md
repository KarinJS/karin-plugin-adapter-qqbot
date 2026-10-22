# [#](#获取精华消息) 获取精华消息

## [#](#接口) 接口

```http
GET /channels/{channel_id}/pins
```

1

## [#](#功能描述) 功能描述

用于获取子频道 `channel_id` 内的精华消息。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

返回 [PinsMessage](/wiki/develop/api-v2/server-inter/channel/content/pins/model.html#PinsMessage) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

响应数据包

```json
{
  "guild_id": "xxxxxx",
  "channel_id": "xxxxxx",
  "message_ids": ["xxxxx"]
}
```

1  
2  
3  
4  
5

← [删除精华消息](/wiki/develop/api-v2/server-inter/channel/content/pins/delete_pins_message.html) [获取频道日程列表](/wiki/develop/api-v2/server-inter/channel/content/schedule/get_schedules.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区