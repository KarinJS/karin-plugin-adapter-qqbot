# [#](#频道全员禁言) 频道全员禁言

## [#](#接口) 接口

```http
PATCH /guilds/{guild_id}/mute
```

1

## [#](#功能描述) 功能描述

用于将频道的全体成员（非管理员）禁言。

* 需要使用的 `token` 对应的用户具备管理员权限。如果是机器人，要求被添加为管理员。

该接口同样可用于解除禁言，具体使用见[解除全员禁言](#%E8%A7%A3%E9%99%A4%E7%A6%81%E8%A8%80)。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|mute\_end\_timestamp|string|禁言到期时间戳，绝对时间戳，单位：秒（与 mute\_seconds 字段同时赋值的话，以该字段为准）|
|mute\_seconds|string|禁言多少秒（两个字段二选一，默认以 mute\_end\_timestamp 为准）|

### [#](#解除禁言) 解除禁言

该接口同样支持**解除全员禁言**，将`mute_end_timestamp`或`mute_seconds`传值为字符串`'0'`即可。

## [#](#返回) 返回

成功返回 HTTP 状态码 `204`。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```json
{
  "mute_end_timestamp": "1641916800",
  "mute_seconds": "120"
}
```

1  
2  
3  
4

← [获取频道消息频率的设置详情](/wiki/develop/api-v2/server-inter/channel/speak/setting/message_setting.html) [频道指定成员禁言](/wiki/develop/api-v2/server-inter/channel/speak/patch_guild_member_mute.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区