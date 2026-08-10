# [#](#创建入群自动审批策略) 创建入群自动审批策略

创建入群自动审批策略，指定关联群号。strategy\_id 由服务端生成。一个机器人最多 20 个策略。

设置的规则只有当机器人需拥有群管理员身份时，才会生效会运行。

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/join\_approval\_strategy|
|HTTP Method|POST|
|接口频率限制|60 QPM|

## [#](#请求体) 请求体

|名称|类型|必填|描述|
|---|---|---|---|
|group\_openids|\[\]string|否|group\_openids 与 group\_ids 二选一必填，同时传入或均未传入均返回错误 关联的群 openid 列表，最多 100 个；与 group\_ids 互斥|
|group\_ids|array|否|关联的 QQ 群号列表（uint64），最多 100 个；与 group\_openids 互斥|
|is\_enable|string|否|是否启用策略，on-启用 off-关闭，默认 on|
|expire\_at|string|否|过期时间（RFC3339 格式）；不传默认一年过期|
|remark|string|否|策略备注，最多 255 个汉字，不必填|

### [#](#请求示例) 请求示例

```text
POST /v2/groups/join_approval_strategy

{"group_openids":["\u003cxxxxxxxx1","xxxxx2\u003e"],"is_enable":"on","expire_at":""}
```

1  
2  
3

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|strategy\_id|string|服务端生成的策略 ID|
|is\_enable|string|是否启用，on-启用 off-关闭|
|expire\_at|string|过期时间（RFC3339 格式）|

## [#](#响应示例) 响应示例

```json
{
  "strategy_id": "st_d83eca11e9",
  "is_enable": "on",
  "expire_at": "2027-08-05T15:30:16+08:00"
}
```

1  
2  
3  
4  
5

← [查询入群自动审批策略列表](/wiki/develop/api-v2/autogen/api/v2_groups_join_approval_strategy.get.html) [修改入群自动审批策略](/wiki/develop/api-v2/autogen/api/v2_groups_join_approval_strategy_strategy_id.patch.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区