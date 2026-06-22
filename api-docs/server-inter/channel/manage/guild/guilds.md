# [#](#获取用户频道列表) 获取用户频道列表

## [#](#接口) 接口

```http
GET /users/@me/guilds
```

1

## [#](#功能描述) 功能描述

用于获取当前用户（机器人）所加入的频道列表，支持分页。

当 `HTTP Authorization` 中填入 `Bot Token` 是获取机器人的数据，填入 `Bearer Token` 则获取用户的数据。 [票据说明](/wiki/develop/api-v2/#票据)。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

|字段名|类型|描述|要求|
|---|---|---|---|
|before|string|读此 guild id 之前的数据|before 设置时， 先反序，再分页|
|after|string|读此 guild id 之后的数据|after 和 before 同时设置时， after 参数无效|
|limit|int|每次拉取多少条数据|默认 100, 最大 100|

## [#](#返回) 返回

返回 [Guild](/wiki/develop/api-v2/server-inter/channel/manage/guild/model.html#guild) 对象数组。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

响应数据包

```json
[{
    "id": "696527283900292399",
    "name": "鹅们的萌宠啦咔咔啦",
    "icon": "https://groupprohead-76292.picgzc.qpic.cn/482231626508223/100?t=1626508224633",
    "owner_id": "4828365788198541698",
    "owner": false,
    "joined_at": "2021-12-08T16:12:31+08:00",
    "member_count": 17,
    "max_members": 300,
    "description": "123"
}]
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

← [获取用户详情](/wiki/develop/api-v2/server-inter/channel/manage/user/me.html) [获取频道详情](/wiki/develop/api-v2/server-inter/channel/manage/guild/get_guild.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区