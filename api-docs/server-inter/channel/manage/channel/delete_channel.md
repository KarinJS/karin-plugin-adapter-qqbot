# [#](#删除子频道) 删除子频道

## [#](#接口) 接口

```http
DELETE /channels/{channel_id}
```

1

## [#](#功能描述) 功能描述

用于删除 `channel_id` 指定的子频道。

* 要求操作人具有`管理子频道`的权限，如果是机器人，则需要将机器人设置为管理员。
* 修改成功后，会触发**子频道删除事件**。

注意

* 公域机器人暂不支持申请，仅私域机器人可用，选择私域机器人后默认开通。
* 注意: 开通后需要先将机器人从频道移除，然后重新添加，方可生效。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#返回) 返回

成功返回 HTTP 状态码 `200`。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```shell
DELETE /channels/123456
```

1

## [#](#注意) 注意

**子频道的删除是无法撤回的，一旦删除，将无法恢复。**

← [修改子频道](/wiki/develop/api-v2/server-inter/channel/manage/channel/patch_channel.html) [频道事件](/wiki/develop/api-v2/server-inter/channel/manage/event/guild.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区