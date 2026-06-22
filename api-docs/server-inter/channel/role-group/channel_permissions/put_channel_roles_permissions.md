# [#](#修改子频道身份组权限) 修改子频道身份组权限

## [#](#接口) 接口

```http
PUT /channels/{channel_id}/roles/{role_id}/permissions
```

1

## [#](#功能描述) 功能描述

用于修改子频道 channel\_id 下身份组 role\_id 的权限。

* 要求操作人具有`管理子频道`的权限，如果是机器人，则需要将机器人设置为管理员。
* 参数包括`add`和`remove`两个字段，分别表示授予的权限以及删除的权限。要授予身份组权限即把`add`对应位置 1，删除身份组权限即把`remove`对应位置 1。当两个字段同一位都为 1，表现为删除权限。
* 本接口不支持修改`可管理子频道`权限。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|[add](/wiki/develop/api-v2/server-inter/channel/role-group/channel_permissions/model.html#permission)|string|字符串形式的位图表示赋予用户的权限|
|[remove](/wiki/develop/api-v2/server-inter/channel/role-group/channel_permissions/model.html#permission)|string|字符串形式的位图表示删除用户的权限|

## [#](#返回) 返回

成功返回 HTTP 状态码 `204`。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```json
{
  "add": "1",
  "remove": "4"
}
```

1  
2  
3  
4

← [获取子频道身份组权限](/wiki/develop/api-v2/server-inter/channel/role-group/channel_permissions/get_channel_roles_permissions.html) [获取机器人在频道可用权限列表](/wiki/develop/api-v2/server-inter/channel/api_permissions/get_guild_api_permission.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区