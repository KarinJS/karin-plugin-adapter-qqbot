# [#](#删除精华消息) 删除精华消息

## [#](#接口) 接口

```http
DELETE /channels/{channel_id}/pins/{message_id}
```

1

## [#](#功能描述) 功能描述

用于删除子频道 `channel_id` 下指定 `message_id` 的精华消息。

* 删除子频道内全部精华消息，请将 `message_id` 设置为 `all`。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

成功返回 HTTP 状态码 `204`。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```text
DELETE /channels/123456/pins/112233
```

1

← [添加精华消息](/wiki/develop/api-v2/server-inter/channel/content/pins/put_pins_message.html) [获取精华消息](/wiki/develop/api-v2/server-inter/channel/content/pins/get_pins_message.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区