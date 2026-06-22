# [#](#获取子频道详情) 获取子频道详情

## [#](#接口) 接口

```http
GET /channels/{channel_id}
```

1

## [#](#功能描述) 功能描述

用于获取 `channel_id` 指定的子频道的详情。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

返回[Channel](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#channel) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```shell
GET /channels/123456
```

1

响应数据包

```json
{
  "id": "123456",
  "guild_id": "xxxxxx",
  "name": "很高兴遇见你",
  "type": 4,
  "position": 2,
  "owner_id": "0",
  "sub_type": 0,
  "private_type": 0,
  "speak_permission": 0,
  "application_id": "0"
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
12

← [获取子频道列表](/wiki/develop/api-v2/server-inter/channel/manage/channel/get_channels.html) [创建子频道](/wiki/develop/api-v2/server-inter/channel/manage/channel/post_channels.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区