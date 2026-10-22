# [#](#删除帖子) 删除帖子

## [#](#接口) 接口

```http
DELETE /channels/{channel_id}/threads/{thread_id}
```

1

## [#](#功能描述) 功能描述

* 该接口用于删除指定子频道下的某个帖子。

注意

* 公域机器人暂不支持申请，仅私域机器人可用，选择私域机器人后默认开通。
* 注意: 开通后需要先将机器人从频道移除，然后重新添加，方可生效。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#返回) 返回

HTTP 状态码 `204`

← [发表帖子](/wiki/develop/api-v2/server-inter/channel/content/forum/put_thread.html) [论坛事件对象(ForumEvent)](/wiki/develop/api-v2/server-inter/channel/content/forum/forum.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区