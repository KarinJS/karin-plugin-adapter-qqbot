# [#](#发送机器人在频道接口权限的授权链接) 发送机器人在频道接口权限的授权链接

## [#](#接口) 接口

```http
POST /guilds/{guild_id}/api_permission/demand
```

1

## [#](#功能描述) 功能描述

用于创建 API 接口权限授权链接，该链接指向`guild_id`对应的频道 。

* 每天只能在一个频道内发 `3` 条（默认值）频道权限授权链接。

## [#](#示例图) 示例图
![创建频道API接口权限授权](https://qq-ai.cdn-go.cn/web/bot-docs/-/v1.7.0/images/api-231017/post_api_permission_demand.png)
## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|channel\_id|string|授权链接发送的子频道 id|
|api\_identify|[APIPermissionDemandIdentify](/wiki/develop/api-v2/server-inter/channel/api_permissions/model.html#APIPermissionDemandIdentify) 对象|api 权限需求标识对象|
|desc|string|机器人申请对应的 API 接口权限后可以使用功能的描述|

## [#](#返回) 返回

返回[APIPermissionDemand](/wiki/develop/api-v2/server-inter/channel/api_permissions/model.html#APIPermissionDemand) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```json
{
  "channel_id": "123456",
  "api_identify": {
    "path": "/guilds/{guild_id}",
    "method": "GET"
  },
  "desc": "显示频道信息"
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

响应数据包

```json
{
  "guild_id": "xxxxxx",
  "channel_id": "123456",
  "api_identify": {
    "path": "/guilds/{guild_id}",
    "method": "GET"
  },
  "title": "王者机器人申请授权频道信息接口权限",
  "desc": "申请权限后才能正常使用机器人显示频道信息功能"
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

← [获取机器人在频道可用权限列表](/wiki/develop/api-v2/server-inter/channel/api_permissions/get_guild_api_permission.html) [获取频道消息频率的设置详情](/wiki/develop/api-v2/server-inter/channel/speak/setting/message_setting.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区