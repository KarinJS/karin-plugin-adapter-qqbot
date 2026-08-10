# [#](#用户申请加群事件) 用户申请加群事件

用户申请加群请求触发此事件

1.只有当机器人是群管理员时才可以收到此事件。

## [#](#事件) 事件

|字段|值|
|---|---|
|事件名|GROUP\_JOIN\_REQUEST|
|Intent|GROUP\_AND\_C2C\_EVENT (1<<25)|

### [#](#事件体) 事件体

|名称|类型|描述|
|---|---|---|
|group\_openid|string|群OpenID|
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
|auto\_approved|[AutoAppproved](#schema-autoappproved)|自动审批通过的扩展信息, 只有在下行事件中会携带。|

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

**AutoAppproved**

|名称|类型|描述|
|---|---|---|
|strategy\_id|string|自动审批通过的策略ID|

### [#](#事件示例) 事件示例

**用户申请入群申请**

```text
{
  "group_openid": "30584554AA2BF4E72BD3B8F27A70339D",
  "join_request_id": "AVKiFWpdy0-q0rfCkpQFbWB9GvX7QPIe9hlsbVeO6TiurrZw1DHP0sXGnbUR4Xm79tKNpfl4zZynxeibVwwUD6h96RqiFB-4V6p5FKGXfqInOuQQSf5WwXr8lyIsn6yeaMwEI1KSuTTMBMNe6WN8bDtKg2REXTcF",
  "member_openid": "FE003FAF76C4817251FDC128A16753BB",
  "username": "痞孓小光光╮hw灰",
  "apply_at": "2026-08-05T16:21:40+08:00",
  "apply_source": "self_apply",
  "verify_info": {
    "method": "verify_message",
    "verify_message": "就快乐了"
  }
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

**其他用户邀请用户入群**

```text
{
  "group_openid": "30584554AA2BF4E72BD3B8F27A70339D",
  "join_request_id": "AZj4L11PQ3oFrs2xf0wyfPmJ-3ONzbTr9MZRnXCSfoGce4KkWIgaTDwtkLXJVBaPx61VW9dzQz041oPt8o-JbBSyIerWVziQp1LaxYQCoyEx8rhffLwfBp5OW1-WL5C5HNji3M9lwDfZO4h_zNT4r0lywGojY4CX",
  "member_openid": "DE538D0B23260BFEC30EA4A17C3A71B1",
  "username": "吓唬",
  "apply_at": "2026-08-05T16:36:32+08:00",
  "apply_source": "invited",
  "invited_by": "FE003FAF76C4817251FDC128A16753BB"
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

**用户入群申请自动申请通过**

```text
{
  "group_openid": "30584554AA2BF4E72BD3B8F27A70339D",
  "join_request_id": "AZ22mGUrkPeeNy6Fzz_raGskCnpnbdy7pIq6pME7XUgS72LOXTH4TxgzGlv3FmAGmNQAelRYYhBZYKgJUEoSgu21rSJVSdKOznbSu6FdXqXvZ10SkpI5fyE_876Va8KSbuLFbWdKa8Rh9nc_hzvZYKZT0_X1W0o4",
  "member_openid": "FE003FAF76C4817251FDC128A16753BB",
  "username": "痞孓小光光╮hw灰",
  "apply_at": "2026-08-05T17:32:52+08:00",
  "apply_source": "self_apply",
  "verify_info": {
    "method": "verify_message",
    "verify_message": "健健康康"
  },
  "auto_approved": {
    "strategy_id": "st_7c0b77d442"
  }
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

← [群成员退出](/wiki/develop/api-v2/autogen/event/group_member_remove.html) [频道创建](/wiki/develop/api-v2/autogen/event/guild_create.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区