# [#](#获取群成员信息) 获取群成员信息

获取指定群成员的详细信息。

该能力正在内邀接入中，敬请期待

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/{group\_openid}/members/{member\_openid}|
|HTTP Method|GET|
|接口频率限制|30 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|group\_openid|string|是|群OpenID|
|member\_openid|string|是|成员OpenID|

### [#](#请求示例) 请求示例

**获取群成员信息**

```text
GET /v2/groups/3E5D8A1F7B2C9E4D6A0F1B3C5D7E9F2A/members/7A3B9C1D5E2F4A6B8C0D1E3F5A7B9C2D
```

1

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|member\_openid|string|成员 OpenID|
|username|string|用户昵称|
|member\_role|string|群成员角色 member-普通成员，owner-群主，admin-管理员|
|bot|boolean|是否机器人|
|joined\_at|string|入群时间戳（RFC3339格式）|
|union\_openid|string|用户在应用/开放平台下的统一标识（如有）|

## [#](#响应示例) 响应示例

**获取群成员信息**

```json
{
  "member_openid": "7A3B9C1D5E2F4A6B8C0D1E3F5A7B9C2D",
  "username": "小明",
  "member_role": "admin",
  "bot": false,
  "joined_at": "2025-08-20T09:15:00+08:00",
  "union_openid": "B4C6D8E0F2A4B6C8D0E2F4A6B8C0D2E4"
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

### [#](#错误码) 错误码

|错误码|描述|排查建议|
|---|---|---|
|11253|应用无接口访问权限|该接口仅白名单机器人可用，请联系平台运营申请权限|

← [获取群成员列表](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_members.get.html) [群成员批量移除](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_batch_remove_members.post.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区