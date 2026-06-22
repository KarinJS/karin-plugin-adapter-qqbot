# [#](#接口权限对象) 接口权限对象

## [#](#接口权限对象-apipermission) 接口权限对象 (APIPermission)

|字段名|类型|描述|
|---|---|---|
|path|string|API 接口名，例如 /guilds/{guild\_id}/members/{user\_id}|
|method|string|请求方法，例如 GET|
|desc|string|API 接口名称，例如 获取频道信|
|auth\_status|int|授权状态，auth\_stats 为 1 时已授权|

## [#](#接口权限需求对象-apipermissiondemand) 接口权限需求对象（APIPermissionDemand）

|字段名|类型|描述|
|---|---|---|
|guild\_id|string|申请接口权限的频道 id|
|channel\_id|string|接口权限需求授权链接发送的子频道 id|
|api\_identify|[APIPermissionDemandIdentify](#APIPermissionDemandIdentify)|权限接口唯一标识|
|title|string|接口权限链接中的接口权限描述信息|
|desc|string|接口权限链接中的机器人可使用功能的描述信息|

## [#](#接口权限需求标识对象-apipermissiondemandidentify) 接口权限需求标识对象（APIPermissionDemandIdentify）

|字段名|类型|描述|
|---|---|---|
|path|string|API 接口名，例如 /guilds/{guild\_id}/members/{user\_id}|
|method|string|请求方法，例如 GET|

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区