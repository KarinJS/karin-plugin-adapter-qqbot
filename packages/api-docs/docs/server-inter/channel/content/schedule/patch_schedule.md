# [#](#修改日程) 修改日程

## [#](#接口) 接口

```http
PATCH /channels/{channel_id}/schedules/{schedule_id}
```

1

## [#](#功能描述) 功能描述

用于修改日程子频道 `channel_id` 下 `schedule_id` 指定的日程的详情。

* 要求操作人具有`管理频道`的权限，如果是机器人，则需要将机器人设置为管理员。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|schedule|[Schedule](/wiki/develop/api-v2/server-inter/channel/content/schedule/model.html#schedule)|日程对象，不需要带 id|

## [#](#返回) 返回

返回 [Schedule](/wiki/develop/api-v2/server-inter/channel/content/schedule/model.html#schedule) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```json
{
  "schedule": {
    "name": "今晚八点上王者",
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
  "name": "今晚八点上王者",
  "start_timestamp": "1642076453000",
  "end_timestamp": "1642083653000",
  "creator": {
    "user": {
      "id": "xxxxxx",
      "username": "xxxxxx",
      "bot": true
    },
    "nick": "",
    "joined_at": "2022-01-13T11:02:21+08:00"
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

← [创建日程](/wiki/develop/api-v2/server-inter/channel/content/schedule/post_schedule.html) [删除日程](/wiki/develop/api-v2/server-inter/channel/content/schedule/delete_schedule.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区