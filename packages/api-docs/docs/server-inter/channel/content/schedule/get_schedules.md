# [#](#获取频道日程列表) 获取频道日程列表

## [#](#接口) 接口

```http
GET /channels/{channel_id}/schedules
```

1

## [#](#功能描述) 功能描述

用于获取`channel_id`指定的子频道中当天的日程列表。

* 若带了参数 `since`，则返回结束时间在 `since` 之后的日程列表；若未带参数 `since`，则默认返回当天的日程列表。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|since|uint64|起始时间戳(**ms**)|

## [#](#返回) 返回

返回 [Schedule](/wiki/develop/api-v2/server-inter/channel/content/schedule/model.html#schedule) 对象数组。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```json
{
  "since": 1642076400000
}
```

1  
2  
3

响应数据包

```json
[
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
]
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
18  
19

← [获取精华消息](/wiki/develop/api-v2/server-inter/channel/content/pins/get_pins_message.html) [获取日程详情](/wiki/develop/api-v2/server-inter/channel/content/schedule/get_schedule.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区