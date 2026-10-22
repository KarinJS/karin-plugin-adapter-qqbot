# [#](#群黑名单操作) 群黑名单操作

群黑名单操作，只有在目标用户不在群中时才能加入群黑名单。

该能力正在内邀接入中，敬请期待

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/{group\_openid}/member\_blacklist|
|HTTP Method|POST|
|接口频率限制|60 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|group\_openid|string|是|群OpenID|

## [#](#请求体) 请求体

|名称|类型|必填|描述|
|---|---|---|---|
|op|string|是|操作类型：del 移出黑名单, add 加入黑名单（目标成员在群中时无法加入黑名单）|
|member\_openids|\[\]string|是|目标成员 openid 列表，单次最多 20 个|

### [#](#请求示例) 请求示例

**添加群黑名单**

```text
POST /v2/groups/3E5D8A1F7B2C9E4D6A0F1B3C5D7E9F2A/member_blacklist
{
  "op": "add",
  "member_openids": [
    "7A3B9C1D5E2F4A6B8C0D1E3F5A7B9C2D"
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

**移出群黑名单**

```text
POST /v2/groups/3E5D8A1F7B2C9E4D6A0F1B3C5D7E9F2A/member_blacklist
{
  "op": "del",
  "member_openids": [
    "7A3B9C1D5E2F4A6B8C0D1E3F5A7B9C2D"
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

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|fail\_openids|\[\]string|op=add 时返回拉黑失败的 openid 列表；op=del 时同义|

## [#](#响应示例) 响应示例

**操作群黑名单成功**

```json
{
    "fail_openids": []
}
```

1  
2  
3

### [#](#错误码) 错误码

|错误码|描述|排查建议|
|---|---|---|
|11253|应用无接口访问权限|该接口仅白名单机器人可用，请联系平台运营申请权限|

← [群黑名单查询](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_member_blacklist.get.html) [机器人加入群聊](/wiki/develop/api-v2/autogen/event/group_add_robot.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区