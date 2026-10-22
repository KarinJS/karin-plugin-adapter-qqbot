# [#](#获取频道身份组列表) 获取频道身份组列表

## [#](#接口) 接口

```http
GET /guilds/{guild_id}/roles
```

1

## [#](#功能描述) 功能描述

用于获取 `guild_id`指定的频道下的身份组列表。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

|字段名|类型|描述|
|---|---|---|
|guild\_id|string|频道 ID|
|roles|[Role](/wiki/develop/api-v2/server-inter/channel/role/member/role_model.html#role) 对象数组|一组频道身份组对象|
|role\_num\_limit|string|默认分组上限|

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```shell
GET /guilds/123456/roles
```

1

响应数据包

```json
{
  "guild_id": "123456",
  "roles": [
    {
      "id": "4",
      "name": "创建者",
      "color": 4294927682,
      "hoist": 1,
      "number": 1,
      "member_limit": 1
    },
    {
      "id": "2",
      "name": "管理员",
      "color": 4280276644,
      "hoist": 1,
      "number": 5,
      "member_limit": 50
    }
  ],
  "role_num_limit": "30"
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
18  
19  
20  
21  
22

← [音视频/直播子频道成员进出事件](/wiki/develop/api-v2/server-inter/channel/role/audio_or_live_channel_member.html) [创建频道身份组](/wiki/develop/api-v2/server-inter/channel/role-group/post_guild_role.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区