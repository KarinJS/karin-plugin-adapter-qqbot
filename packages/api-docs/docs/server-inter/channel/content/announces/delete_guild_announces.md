# [#](#删除频道公告) 删除频道公告

## [#](#接口) 接口

```http
DELETE /guilds/{guild_id}/announces/{message_id}
```

1

## [#](#功能描述) 功能描述

用于删除频道 `guild_id` 下指定 `message_id` 的全局公告。

* `message_id` 有值时，会校验 `message_id` 合法性，若不校验校验 `message_id`，请将 `message_id` 设置为 `all`。

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
DELETE /guilds/123456/announces/112233
```

1

← [创建频道公告](/wiki/develop/api-v2/server-inter/channel/content/announces/post_guild_announces.html) [添加精华消息](/wiki/develop/api-v2/server-inter/channel/content/pins/put_pins_message.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区