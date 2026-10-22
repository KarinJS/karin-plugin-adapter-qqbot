# [#](#机器人下麦) 机器人下麦

## [#](#接口) 接口

```http
DELETE /channels/{channel_id}/mic
```

1

## [#](#功能描述) 功能描述

机器人在 `channel_id` 对应的语音子频道下麦。

音频接口：仅限音频类机器人才能使用，后续会根据机器人类型自动开通接口权限，现如需调用，需联系平台申请权限。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

url参数：channel\_id

## [#](#返回) 返回

成功返回空对象。

```json
{}
```

1

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```json
{}
```

1

响应数据包

```json
{}
```

1

← [机器人上麦](/wiki/develop/api-v2/server-inter/channel/content/audio/put_mic.html) [获取帖子列表](/wiki/develop/api-v2/server-inter/channel/content/forum/get_threads_list.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区