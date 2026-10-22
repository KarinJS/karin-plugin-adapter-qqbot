# [#](#获取日程详情) 获取日程详情

## [#](#接口) 接口

```http
GET /channels/{channel_id}/schedules/{schedule_id}
```

1

## [#](#功能描述) 功能描述

获取日程子频道 `channel_id` 下 `schedule_id` 指定的的日程的详情。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

返回 [Schedule](/wiki/develop/api-v2/server-inter/channel/content/schedule/model.html#schedule) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```shell
GET /channels/123455/schedules/112233
```

1

响应数据包

```json
{
  "id": "112233",
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

← [获取频道日程列表](/wiki/develop/api-v2/server-inter/channel/content/schedule/get_schedules.html) [创建日程](/wiki/develop/api-v2/server-inter/channel/content/schedule/post_schedule.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区