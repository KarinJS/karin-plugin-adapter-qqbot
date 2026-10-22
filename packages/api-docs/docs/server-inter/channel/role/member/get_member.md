# [#](#获取频道成员详情) 获取频道成员详情

## [#](#接口) 接口

```http
GET /guilds/{guild_id}/members/{user_id}
```

1

## [#](#功能描述) 功能描述

用于获取 `guild_id` 指定的频道中 `user_id` 对应成员的详细信息。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

返回[Member](/wiki/develop/api-v2/server-inter/channel/role/member/model.html#member) 成员对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```shell
GET /guilds/123456/members/112233
```

1

响应数据包

```json
{
  "user": {
    "id": "2823701233424295228",
    "username": "xxx",
    "avatar": "https://qqchannel-profile-1251316161.file.myqcloud.com/xxxxxxx",
    "bot": false,
    "union_openid": "",
    "union_user_account": ""
  },
  "nick": "",
  "roles": [
    "1"
  ],
  "joined_at": "2021-12-05T14:08:29+08:00"
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

← [获取频道身份组成员列表](/wiki/develop/api-v2/server-inter/channel/role/member/get_role_members.html) [删除频道成员](/wiki/develop/api-v2/server-inter/channel/role/member/delete_member.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区