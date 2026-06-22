# [#](#获取频道详情) 获取频道详情

## [#](#接口) 接口

```http
GET /guilds/{guild_id}
```

1

## [#](#功能描述) 功能描述

用于获取 `guild_id` 指定的频道的详情。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

返回[Guild](/wiki/develop/api-v2/server-inter/channel/manage/guild/model.html#guild) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```shell
GET /guilds/123456
```

1

响应数据包

```json
{
  "id": "123456",
  "name": "xxxxxx",
  "icon": "xxxxxx",
  "owner_id": "xxxxxx",
  "owner": false,
  "joined_at": "2022-01-13T11:02:21+08:00",
  "member_count": 5,
  "max_members": 300,
  "description": "千江有水千江月，万里无云万里天"
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
11

← [获取用户频道列表](/wiki/develop/api-v2/server-inter/channel/manage/guild/guilds.html) [获取子频道列表](/wiki/develop/api-v2/server-inter/channel/manage/channel/get_channels.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区