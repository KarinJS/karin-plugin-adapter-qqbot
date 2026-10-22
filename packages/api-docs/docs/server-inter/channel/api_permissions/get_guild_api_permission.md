# [#](#获取机器人在频道可用权限列表) 获取机器人在频道可用权限列表

## [#](#接口) 接口

```http
GET /guilds/{guild_id}/api_permission
```

1

## [#](#功能描述) 功能描述

用于获取机器人在频道 `guild_id` 内可以使用的权限列表。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

|字段名|类型|描述|
|---|---|---|
|apis|[APIPermission](/wiki/develop/api-v2/server-inter/channel/api_permissions/model.html#APIPermission) 对象数组|机器人可用权限列表|

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

响应数据包

```json
{
  "apis": [
    {
      "path": "/guilds/{guild_id}/members/{user_id}",
      "method": "GET",
      "desc": "获取当前频道成员信息",
      "auth_status": 0
    },
    {
      "path": "/channels/{channel_id}/messages",
      "method": "POST",
      "desc": "创建消息",
      "auth_status": 1
    }
  ]
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

← [修改子频道身份组权限](/wiki/develop/api-v2/server-inter/channel/role-group/channel_permissions/put_channel_roles_permissions.html) [发送机器人在频道接口权限的授权链接](/wiki/develop/api-v2/server-inter/channel/api_permissions/post_api_permission_demand.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区