# [#](#获取用户详情) 获取用户详情

## [#](#接口) 接口

```http
GET /users/@me
```

1

## [#](#功能描述) 功能描述

用于获取当前用户（机器人）详情。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

返回 [User](/wiki/develop/api-v2/server-inter/channel/manage/user/model.html#user) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

响应数据包

```json
{
  "id": "11586990140073229091",
  "username": "gitsub",
  "avatar": "https://thirdqq.qlogo.cn/g?b=oidb&k=M5TibpXicS7Jt4z89BZxiamAA&s=100&t=1641802698",
  "union_openid": "74F138F7F3AF68C4B8E8325013FCA295",
  "union_user_account": ""
}
```

1  
2  
3  
4  
5  
6  
7

← [事件](/wiki/develop/api-v2/server-inter/group/manage/event.html) [获取用户频道列表](/wiki/develop/api-v2/server-inter/channel/manage/guild/guilds.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区