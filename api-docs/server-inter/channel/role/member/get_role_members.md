# [#](#获取频道身份组成员列表) 获取频道身份组成员列表

## [#](#接口) 接口

```http
GET /guilds/{guild_id}/roles/{role_id}/members
```

1

## [#](#功能描述) 功能描述

用于获取 `guild_id` 频道中指定`role_id`身份组下所有成员的详情列表，支持分页。

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
|start\_index|string|将上一次回包中`next`填入， 如果是第一次请求填 0，默认为 0|
|limit|uint32|分页大小，1-400，默认是 1。成员较多的频道尽量使用较大的`limit`值，以减少请求数|

## [#](#返回) 返回

|字段名|类型|描述|
|---|---|---|
|data|[Member](/wiki/develop/api-v2/server-inter/channel/role/member/model.html#member) 对象数组|一组用户信息对象|
|next|string|下一次请求的分页标识|

## [#](#有关返回结果的说明) 有关返回结果的说明

每次返回的member数量与limit不一定完全相等。特定管理身份组下的成员可能存在一次性返回全部的情况

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求

```http
GET /guilds/123456/roles/4/members?limit=2
```

1

响应数据包

```json
{
  "data": [
    {
      "user": {
        "id": "xxx",
        "username": "xxx",
        "avatar": "xxx",
        "bot": false
      },
      "nick": "xxx",
      "joined_at": "2021-11-03T20:41:36+08:00"
    }
  ],
  "next": "0"
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

← [获取频道成员列表](/wiki/develop/api-v2/server-inter/channel/role/member/get_members.html) [获取频道成员详情](/wiki/develop/api-v2/server-inter/channel/role/member/get_member.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区