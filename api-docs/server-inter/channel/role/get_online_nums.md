# [#](#获取子频道在线成员数) 获取子频道在线成员数

## [#](#接口) 接口

```http
GET /channels/{channel_id}/online_nums
```

1

## [#](#功能描述) 功能描述

用于查询音视频/直播子频道 `channel_id` 的在线成员数。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

成功返回空对象。

```json
{
  "online_nums": 1
}
```

1  
2  
3

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```http
GET /channels/123456/online_nums
```

1

响应数据包

```json
{
  "online_nums": 1
}
```

1  
2  
3

← [删除子频道](/wiki/develop/api-v2/autogen/api/channels_channel_id.delete.html) [获取频道成员列表](/wiki/develop/api-v2/server-inter/channel/role/member/get_members.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区