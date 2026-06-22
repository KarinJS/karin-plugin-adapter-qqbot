# [#](#音频控制) 音频控制

## [#](#接口) 接口

```http
POST /channels/{channel_id}/audio
```

1

## [#](#功能描述) 功能描述

用于控制子频道 `channel_id` 下的音频。

* 音频接口：仅限**音频类机器人**才能使用，后续会根据机器人类型自动开通接口权限，现如需调用，需联系平台申请权限。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

参照 [AudioControl](/wiki/develop/api-v2/server-inter/channel/content/audio/model.html#audiocontrol)。

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
{
  "audio_url": "http:/xxxxx.mp3",
  "text": "xxx",
  "status": 0
}
```

1  
2  
3  
4  
5

响应数据包

```json
{}
```

1

← [删除日程](/wiki/develop/api-v2/server-inter/channel/content/schedule/delete_schedule.html) [机器人上麦](/wiki/develop/api-v2/server-inter/channel/content/audio/put_mic.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区