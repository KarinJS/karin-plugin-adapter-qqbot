# [#](#添加精华消息) 添加精华消息

## [#](#接口) 接口

```http
PUT /channels/{channel_id}/pins/{message_id}
```

1

## [#](#功能描述) 功能描述

用于添加子频道 `channel_id` 内的精华消息。

* 精华消息在一个子频道内最多只能创建 `20` 条。
* 只有可见的消息才能被设置为精华消息。
* 接口返回对象中 `message_ids` 为当前请求后子频道内所有精华消息 `message_id` 数组。

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

请求数据包

```text
PUT /channels/123456/pins/112233
```

1

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

← [删除频道公告](/wiki/develop/api-v2/server-inter/channel/content/announces/delete_guild_announces.html) [删除精华消息](/wiki/develop/api-v2/server-inter/channel/content/pins/delete_pins_message.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区