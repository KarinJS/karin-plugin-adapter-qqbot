# [#](#获取子频道列表) 获取子频道列表

## [#](#接口) 接口

```http
GET /guilds/{guild_id}/channels
```

1

## [#](#功能描述) 功能描述

用于获取 `guild_id` 指定的频道下的子频道列表。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

返回 [Channel](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#channel) 对象数组。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```shell
GET /guilds/123456/channels
```

1

响应数据包

```json
[
  {
    "id": "xxxxxx",
    "guild_id": "123456",
    "name": "很高兴遇见你",
    "type": 4,
    "position": 2,
    "parent_id": "0",
    "owner_id": "0",
    "sub_type": 0
  },

  {
    "id": "xxxxxx",
    "guild_id": "123456",
    "name": "🔒管理员议事厅",
    "type": 0,
    "position": 1,
    "parent_id": "xxxxxx",
    "owner_id": "0",
    "sub_type": 0,
    "private_type": 1
  },
  {
    "id": "xxxxxx",
    "guild_id": "123456",
    "name": "🚪小黑屋",
    "type": 0,
    "position": 2,
    "parent_id": "xxxxxx",
    "owner_id": "0",
    "sub_type": 0,
    "private_type": 0
  },
  {
    "id": "xxxxxx",
    "guild_id": "123456",
    "name": "新的子频道",
    "type": 0,
    "position": 2,
    "parent_id": "123456",
    "owner_id": "0",
    "sub_type": 0,
    "private_type": 2
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
20  
21  
22  
23  
24  
25  
26  
27  
28  
29  
30  
31  
32  
33  
34  
35  
36  
37  
38  
39  
40  
41  
42  
43  
44  
45  
46

← [获取频道详情](/wiki/develop/api-v2/server-inter/channel/manage/guild/get_guild.html) [获取子频道详情](/wiki/develop/api-v2/server-inter/channel/manage/channel/get_channel.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区