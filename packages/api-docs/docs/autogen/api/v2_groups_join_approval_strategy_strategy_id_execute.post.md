# [#](#执行入群自动审批策略) 执行入群自动审批策略

对策略关联的全部群发起全量扫描，命中白名单号码的入群申请自动审批通过。异步执行，约 10 分钟完成。

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/join\_approval\_strategy/{strategy\_id}/execute|
|HTTP Method|POST|
|接口频率限制|60 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|strategy\_id|string|是|策略 ID|

### [#](#请求示例) 请求示例

```text
POST /v2/groups/join_approval_strategy/st_d83eca11e9/execute
{}
```

1  
2

## [#](#响应) 响应

无

## [#](#响应示例) 响应示例

```json
{}
```

1

← [删除入群自动审批策略](/wiki/develop/api-v2/autogen/api/v2_groups_join_approval_strategy_strategy_id.delete.html) [修改入群自动审批策略的白名单号码](/wiki/develop/api-v2/autogen/api/v2_groups_join_approval_strategy_strategy_id_whitelist_users.post.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区