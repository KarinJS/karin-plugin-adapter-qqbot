# [#](#删除入群自动审批策略) 删除入群自动审批策略

删除指定的入群自动审批策略。

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/join\_approval\_strategy/{strategy\_id}|
|HTTP Method|DELETE|
|接口频率限制|60 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|strategy\_id|string|是|策略 ID|

### [#](#请求示例) 请求示例

```text
DELETE /v2/groups/join_approval_strategy/st_d83eca11e9

{}
```

1  
2  
3

## [#](#响应) 响应

无

## [#](#响应示例) 响应示例

```json
{}
```

1

← [修改入群自动审批策略](/wiki/develop/api-v2/autogen/api/v2_groups_join_approval_strategy_strategy_id.patch.html) [执行入群自动审批策略](/wiki/develop/api-v2/autogen/api/v2_groups_join_approval_strategy_strategy_id_execute.post.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区