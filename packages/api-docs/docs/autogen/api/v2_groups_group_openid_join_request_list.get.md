# [#](#入群申请列表拉取) 入群申请列表拉取

拉取入群申请列表，支持分页。

机器人需拥有群管理员身份。

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/{group\_openid}/join\_request\_list|
|HTTP Method|GET|
|接口频率限制|30 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|group\_openid|string|是|群OpenID|

## [#](#请求体) 请求体

|名称|类型|必填|描述|
|---|---|---|---|
|cursor|string|否|分页游标，首次请求可不传或传空串|
|limit|integer|否|单页数量，默认 20，最大 50|

### [#](#请求示例) 请求示例

```text
GET /v2/groups/30584554AA2BF4E72BD3B8F27A70339D/join_request_list
```

1

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|list|\[\][JoinRequest](#schema-joinrequest)|入群申请列表|
|next\_cursor|string|下一页游标，空串表示已到末页|

**JoinRequest**

|名称|类型|描述|
|---|---|---|
|join\_request\_id|string|申请ID,需要在申请接口回传|
|risk\_tips|string|安全提示语；可疑消息直接返回 warning\_tips；普通消息命中 sec\_risk\_rules 时返回 top\_tips|
|union\_openid|string|用户在应用/开放平台下的统一标识（如有）|
|member\_openid|string|申请人 openid|
|username|string|申请人昵称|
|apply\_at|string|申请时间戳（RFC3339 格式）|
|apply\_source|string|申请来源：self\_apply 主动申请，invited 被邀请|
|invited\_by|string|邀请人 openid（apply\_source=invited 时有效）|
|bot|boolean|是否为机器人账号|
|verify\_info|[VerifyInfo](#schema-verifyinfo)|用户入群验证方式|

**VerifyInfo**

|名称|类型|描述|
|---|---|---|
|method|string|入群验证方式：verify\_message / admin\_review\_qa|
|verify\_message|string|验证消息内容；仅 auth\_type=verify\_message 时可能携带|
|review\_qa\_list|\[\][ReviewQA](#schema-reviewqa)|问答列表；仅 auth\_type=admin\_review\_qa 时可能携带|

**ReviewQA**

|名称|类型|描述|
|---|---|---|
|question|string|管理员设置的问题|
|answer|string|申请人填写的答案|

## [#](#响应示例) 响应示例

```json
{
  "list": [
    {
      "join_request_id": "Ael-dmvlRdC9fZepnrfMhamsZgO103pSjmzwUz5SyyORaQMX-q0zkY3Q1caz71KiH2nJzehE-QWM-xCWzIsLg1i1vAPkdJfdPkUDVImXoiR8OY_s40J7OsFZGaEFUdDkIhAPs9uMXOxNpW91mGWQTlaFnmgksAxk",
      "risk_tips": "",
      "union_openid": "FE003FAF76C4817251FDC128A16753BB",
      "member_openid": "FE003FAF76C4817251FDC128A16753BB",
      "username": "痞孓小光光╮hw灰",
      "apply_at": "2026-08-05T14:19:09+08:00",
      "apply_source": "self_apply",
      "invited_by": "",
      "bot": false,
      "verify_info": {
        "method": "verify_message",
        "verify_message": "几款看看",
        "review_qa_list": []
      }
    }
  ],
  "next_cursor": "1785767153250497"
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

← [获取机器人群内状态](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_bot_state.get.html) [入群申请审批](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_approval_join_request_member_openid.post.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区