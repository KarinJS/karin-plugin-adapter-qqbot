# [#](#删除频道身份组) 删除频道身份组

## [#](#接口) 接口

```http
DELETE /guilds/{guild_id}/roles/{role_id}
```

1

## [#](#功能描述) 功能描述

用于删除频道`guild_id`下 `role_id` 对应的身份组。

* 需要使用的 `token` 对应的用户具备删除身份组权限。如果是机器人，要求被添加为管理员。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

成功返回 HTTP 状态码 `204`。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```shell
DELETE /guilds/123456/roles/112233
```

1

← [修改频道身份组](/wiki/develop/api-v2/server-inter/channel/role-group/patch_guild_role.html) [创建频道身份组成员](/wiki/develop/api-v2/server-inter/channel/role-group/put_guild_member_role.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区