# [#](#创建日程) 创建日程

## [#](#接口) 接口

```http
POST /channels/{channel_id}/schedules
```

1

## [#](#功能描述) 功能描述

用于在 `channel_id` 指定的`日程子频道`下创建一个日程。

* 要求操作人具有`管理频道`的权限，如果是机器人，则需要将机器人设置为管理员。
* 创建成功后，返回创建成功的日程对象。
* 创建操作频次限制
  * 单个管理员每天限`10`次。
  * 单个频道每天`100`次。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|schedule|[Schedule](/wiki/develop/api-v2/server-inter/channel/content/schedule/model.html#schedule)|日程对象，不需要带 `id`|

## [#](#返回) 返回

返回[Schedule](/wiki/develop/api-v2/server-inter/channel/content/schedule/model.html#schedule) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```json
{
  "schedule": {
    "name": "上王者",
    "start_timestamp": "1642076453000",
    "end_timestamp": "1642083653000",
    "jump_channel_id": "0",
    "remind_type": "0"
  }
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

响应数据包

```json
{
  "id": "xxxxxx",
  "name": "上王者",
  "start_timestamp": "1642076400000",
  "end_timestamp": "1642083600000",
  "creator": {
    "user": {
      "id": "xxxxxx",
      "username": "xxxxxx",
      "bot": true
    },
    "nick": "",
    "joined_at": "2022-01-11T10:24:13+08:00"
  },
  "jump_channel_id": "0",
  "remind_type": "0"
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
13  
14  
15  
16  
17

← [获取日程详情](/wiki/develop/api-v2/server-inter/channel/content/schedule/get_schedule.html) [修改日程](/wiki/develop/api-v2/server-inter/channel/content/schedule/patch_schedule.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区