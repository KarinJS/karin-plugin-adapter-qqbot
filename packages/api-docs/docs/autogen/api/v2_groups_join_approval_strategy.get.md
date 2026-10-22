# [#](#查询入群自动审批策略列表) 查询入群自动审批策略列表

查询当前生效中的策略列表，按创建时间倒序，支持分页。

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/join\_approval\_strategy|
|HTTP Method|GET|
|接口频率限制|60 QPM|

## [#](#请求体) 请求体

|名称|类型|必填|描述|
|---|---|---|---|
|cursor|string|否|分页游标，首次请求可不传或传空串|
|limit|integer|否|单页数量，默认 20，最大 50|

### [#](#请求示例) 请求示例

```text
GET /v2/groups/join_approval_strategy

{}
```

1  
2  
3

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|strategies|\[\][JoinApprovalStrategy](#schema-joinapprovalstrategy)|生效中的策略列表|
|next\_cursor|string|下一页游标，空串表示已到末页|

**JoinApprovalStrategy**

|名称|类型|描述|
|---|---|---|
|strategy\_id|string|策略 ID|
|group\_openids|\[\]string|关联的群 openid 列表（创建时使用 group\_openids 时返回）|
|group\_ids|array|关联的 QQ 群号列表（创建时使用 group\_ids 时返回）|
|whitelist\_user\_count|integer|白名单中的号码数量（估算，可能存在少量误差）|
|is\_enable|string|策略是否启用，on-启用 off-关闭|
|expire\_at|string|过期时间（RFC3339 格式）|
|created\_at|string|创建时间（RFC3339 格式）|
|updated\_at|string|最近更新时间（RFC3339 格式）|
|remark|string|策略备注|

## [#](#响应示例) 响应示例

```json
{
  "strategies": [
    {
      "strategy_id": "st_d83eca11e9",
      "group_openids": [],
      "group_ids": [],
      "whitelist_user_count": 2,
      "is_enable": "on",
      "expire_at": "2027-08-05T15:30:16+08:00",
      "created_at": "2026-08-05T15:30:16+08:00",
      "updated_at": "2026-08-05T15:45:28+08:00"
    },
    {
      "strategy_id": "st_7c0b77d442",
      "group_openids": [],
      "group_ids": [
        "10****499"
      ],
      "whitelist_user_count": 0,
      "is_enable": "on",
      "expire_at": "2027-08-04T11:20:40+08:00",
      "created_at": "2026-08-04T11:20:40+08:00",
      "updated_at": "2026-08-04T11:20:40+08:00"
    },
    {
      "strategy_id": "st_42cc272536",
      "group_openids": [],
      "group_ids": [
        "26****763",
        "26****978"
      ],
      "whitelist_user_count": 3,
      "is_enable": "on",
      "expire_at": "2027-07-31T11:40:21+08:00",
      "created_at": "2026-07-31T11:40:21+08:00",
      "updated_at": "2026-08-05T14:28:37+08:00"
    }
  ],
  "next_cursor": ""
}
```

1  
2  
3  
4  
5  
6  
7  
8  
9  
10  
11  
12  
13  
14  
15  
16  
17  
18  
19  
20  
21  
22  
23  
24  
25  
26  
27  
28  
29  
30  
31  
32  
33  
34  
35  
36  
37  
38  
39  
40

← [设置群成员禁言](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_restrict_chat_setting.post.html) [创建入群自动审批策略](/wiki/develop/api-v2/autogen/api/v2_groups_join_approval_strategy.post.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区