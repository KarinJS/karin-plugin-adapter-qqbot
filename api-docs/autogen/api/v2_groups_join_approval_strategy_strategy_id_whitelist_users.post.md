# [#](#修改入群自动审批策略的白名单号码) 修改入群自动审批策略的白名单号码

对指定策略批量新增或删除白名单 QQ 号码，单次最多 10000 个，号码上限 10W。

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/join\_approval\_strategy/{strategy\_id}/whitelist\_users|
|HTTP Method|POST|
|接口频率限制|60 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|strategy\_id|string|是|策略 ID|

## [#](#请求体) 请求体

|名称|类型|必填|描述|
|---|---|---|---|
|op|string|是|操作类型：add 新增号码，del 删除号码|
|whitelist\_users|\[\]string|是|QQ 号码列表，单次最多 10000 个；使用字符串类型避免 JS 精度问题|

### [#](#请求示例) 请求示例

**添加白名单**

```text
POST /v2/groups/join_approval_strategy/st_d83eca11e9/whitelist_users

{"op":"add","whitelist_users":["1234567","1234568"]}
```

1  
2  
3

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|strategy\_id|string|策略 ID|
|whitelist\_user\_count|integer|操作后策略当前白名单号码数（估算）|
|updated\_at|string|策略更新时间（RFC3339 格式）|

## [#](#响应示例) 响应示例

```json
{
  "strategy_id": "st_d83eca11e9",
  "whitelist_user_count": 2,
  "updated_at": "2026-08-05T15:45:28+08:00"
}
```

1  
2  
3  
4  
5

← [执行入群自动审批策略](/wiki/develop/api-v2/autogen/api/v2_groups_join_approval_strategy_strategy_id_execute.post.html) [获取群成员列表](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_members.get.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区