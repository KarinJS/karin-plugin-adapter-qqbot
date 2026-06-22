# [#](#删除频道成员) 删除频道成员

## [#](#接口) 接口

```http
DELETE /guilds/{guild_id}/members/{user_id}
```

1

## [#](#功能描述) 功能描述

用于删除 `guild_id` 指定的频道下的成员 `user_id`。

* 需要使用的 `token` 对应的用户具备踢人权限。如果是机器人，要求被添加为管理员。
* 操作成功后，会触发**频道成员删除事件**。
* 无法移除身份为管理员的成员

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
|add\_blacklist|bool|删除成员的同时，将该用户添加到频道黑名单中|
|delete\_history\_msg\_days|int|删除成员的同时，撤回该成员的消息，可以指定撤回消息的时间范围|

注：消息撤回时间范围仅支持固定的天数：`3`，`7`，`15`，`30`。 特殊的时间范围：`-1: 撤回全部消息`。默认值为`0`不撤回任何消息。

## [#](#返回) 返回

成功返回 HTTP 状态码 `204`。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```shell
DELETE /guilds/123456/members/112233
{
    "add_blacklist": true,
    "delete_history_msg_days": -1
}
```

1  
2  
3  
4  
5

← [获取频道成员详情](/wiki/develop/api-v2/server-inter/channel/role/member/get_member.html) [频道成员事件](/wiki/develop/api-v2/server-inter/channel/role/guild_member.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区