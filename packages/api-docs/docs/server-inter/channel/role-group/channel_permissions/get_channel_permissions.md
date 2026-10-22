# [#](#获取子频道用户权限) 获取子频道用户权限

## [#](#接口) 接口

```http
GET /channels/{channel_id}/members/{user_id}/permissions
```

1

## [#](#功能描述) 功能描述

用于获取 子频道`channel_id` 下用户 `user_id` 的权限。

* 获取子频道用户权限。
* 要求操作人具有管理子频道的权限，如果是机器人，则需要将机器人设置为管理员。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

返回 [ChannelPermissions](/wiki/develop/api-v2/server-inter/channel/role-group/channel_permissions/model.html#channelpermissions) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```shell
GET /channels/123456/members/112233/permissions
```

1

响应数据包

```json
{
  "channel_id": "123456",
  "user_id": "112233",
  "permissions": "4"
}
```

1  
2  
3  
4  
5

← [删除频道身份组成员](/wiki/develop/api-v2/server-inter/channel/role-group/delete_guild_member_role.html) [修改子频道用户权限](/wiki/develop/api-v2/server-inter/channel/role-group/channel_permissions/put_channel_permissions.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区