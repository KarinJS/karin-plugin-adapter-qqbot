# [#](#群黑名单查询) 群黑名单查询

查询群黑名单列表，支持分页。

该能力正在内邀接入中，敬请期待

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/{group\_openid}/member\_blacklist|
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
|limit|integer|否|单页数量，默认 20，最大 100|

### [#](#请求示例) 请求示例

**群黑名单查询**

```text
GET /v2/groups/3E5D8A1F7B2C9E4D6A0F1B3C5D7E9F2A/member_blacklist
```

1

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|users|\[\][BlacklistUser](#schema-blacklistuser)|黑名单用户列表|
|next\_cursor|string|下一页游标，空串表示已到末页|

**BlacklistUser**

|名称|类型|描述|
|---|---|---|
|union\_openid|string|用户在应用/开放平台下的统一标识（如有）|
|member\_openid|string|用户 openid|
|username|string|用户昵称|
|banned\_at|string|拉黑时间戳（RFC3339 格式）|
|bot|boolean|是否为机器人账号|

## [#](#响应示例) 响应示例

**获取群黑名单列表成功**

```json
{
  "users": [
    {
      "union_openid": "9F2E872045CCCC5948BEAF5B5FCCDF22",
      "member_openid": "7A3B9C1D5E2F4A6B8C0D1E3F5A7B9C2D",
      "username": "阳光少年",
      "banned_at": "2025-07-01T10:30:00+08:00",
      "bot": false
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

### [#](#错误码) 错误码

|错误码|描述|排查建议|
|---|---|---|
|11253|应用无接口访问权限|该接口仅白名单机器人可用，请联系平台运营申请权限|

← [群成员批量移除](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_batch_remove_members.post.html) [群黑名单操作](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_member_blacklist.post.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区