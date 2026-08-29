# [#](#设置群成员禁言) 设置群成员禁言

设置群成员级禁言。

机器人需拥有群管理员身份，最大禁言时长为 30 天。

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/{group\_openid}/restrict\_chat\_setting|
|HTTP Method|POST|
|接口频率限制|60 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|group\_openid|string|是|群OpenID|

## [#](#请求体) 请求体

|名称|类型|必填|描述|
|---|---|---|---|
|members|\[\][SetMemberMuteState](#schema-setmembermutestate)|否|用户禁言列表；每项通过 op 控制增/改/删， 单次设置不能超过10个|

**SetMemberMuteState**

|名称|类型|必填|描述|
|---|---|---|---|
|op|string|是|操作类型：add 增加禁言，update 更新禁言到期时间，del 解除禁言|
|member\_openid|string|是|注意：增加/更新时，只能操作普通成员，不能操作群主，管理员，机器人 被禁言成员的 openid|
|mute\_expire\_at|string|否|禁言到期时间（RFC3339 格式）；op=del 时可传空串表示立即解除禁言|

### [#](#请求示例) 请求示例

\*\*禁言指定用户 \*\*

```text
POST /v2/groups/30584554AA2BF4E72BD3B8F27A70339D/restrict_chat_setting

{
    "members": [
        {
            "op": "add",
            "member_openid": "EC58D87F598C8294A533B9D458DAAF33",
            "mute_expire_at": "2026-08-05T11:23:05+08:00"
        }
    ]
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

## [#](#响应) 响应

无

## [#](#响应示例) 响应示例

```json
{}
```

1

← [查询群禁言状态](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_restrict_chat_setting.get.html) [查询入群自动审批策略列表](/wiki/develop/api-v2/autogen/api/v2_groups_join_approval_strategy.get.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区