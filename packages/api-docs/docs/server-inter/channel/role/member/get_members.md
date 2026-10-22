# [#](#获取频道成员列表) 获取频道成员列表

## [#](#接口) 接口

```http
GET /guilds/{guild_id}/members
```

1

## [#](#功能描述) 功能描述

用于获取 `guild_id` 指定的频道中所有成员的详情列表，支持分页。

注意

* 公域机器人暂不支持申请，仅私域机器人可用，选择私域机器人后默认开通。
* 注意: 开通后需要先将机器人从频道移除，然后重新添加，方可生效。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|after|string|上一次回包中最后一个`member`的`user id`， 如果是第一次请求填 0，默认为 0|
|limit|uint32|分页大小，1-400，默认是 1。成员较多的频道尽量使用较大的`limit`值，以减少请求数|

## [#](#返回) 返回

返回 [Member](/wiki/develop/api-v2/server-inter/channel/role/member/model.html#member) 对象数组。

## [#](#有关返回结果的说明) 有关返回结果的说明

1. 在每次翻页的过程中，可能会返回上一次请求已经返回过的`member`信息，需要调用方自己根据`user id`来进行去重。

2. 每次返回的`member`数量与`limit`不一定完全相等。翻页请使用最后一个`member`的`user id`作为下一次请求的after参数，直到回包为空，拉取结束。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求

```shell
GET /guilds/123456/members?limit=2
```

1

响应数据包

```json
[
  {
    "user": {
      "id": "xxxxxx",
      "username": "xxxx",
      "avatar": "xxxxxx",
      "bot": false,
      "public_flags": 0,
      "system": false,
      "union_openid": "xxxxxx",
      "union_user_account": ""
    },
    "nick": "",
    "roles": ["1"],
    "joined_at": "2021-12-09T15:53:41+08:00",
    "deaf": false,
    "mute": false,
    "pending": false
  },
  {
    "user": {
      "id": "xxxxxx",
      "username": "秦时明月",
      "avatar": "xxxxxx",
      "bot": false,
      "public_flags": 0,
      "system": false,
      "union_openid": "xxxxxx",
      "union_user_account": ""
    },
    "nick": "",
    "roles": ["4"],
    "joined_at": "2021-12-02T15:19:00+08:00",
    "deaf": false,
    "mute": false,
    "pending": false
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

← [获取子频道在线成员数](/wiki/develop/api-v2/server-inter/channel/role/get_online_nums.html) [获取频道身份组成员列表](/wiki/develop/api-v2/server-inter/channel/role/member/get_role_members.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区