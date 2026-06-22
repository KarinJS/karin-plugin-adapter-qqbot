# [#](#删除日程) 删除日程

## [#](#接口) 接口

```http
DELETE /channels/{channel_id}/schedules/{schedule_id}
```

1

## [#](#功能描述) 功能描述

用于删除日程子频道 `channel_id` 下 `schedule_id` 指定的日程。

* 要求操作人具有`管理频道`的权限，如果是机器人，则需要将机器人设置为管理员。

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

```shell
DELETE /channels/123456/schedules/112233
```

1

← [修改日程](/wiki/develop/api-v2/server-inter/channel/content/schedule/patch_schedule.html) [音频控制](/wiki/develop/api-v2/server-inter/channel/content/audio/audio_control.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区