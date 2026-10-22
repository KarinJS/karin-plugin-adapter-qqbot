# [#](#群成员批量移除) 群成员批量移除

批量移除群成员，单次最多 20 个，可选择同时加入黑名单。

该能力正在内邀接入中，敬请期待

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/{group\_openid}/batch\_remove\_members|
|HTTP Method|POST|
|接口频率限制|30 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|group\_openid|string|是|群OpenID|

## [#](#请求体) 请求体

|名称|类型|必填|描述|
|---|---|---|---|
|member\_openids|\[\]string|是|需要移除的成员 member\_openid 列表，单次最多 20 个|
|add\_to\_member\_blacklist|boolean|否|是否同时加入群黑名单，默认 false|

### [#](#请求示例) 请求示例

```text
POST /v2/groups/3E5D8A1F7B2C9E4D6A0F1B3C5D7E9F2A/batch_remove_members
{
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

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|remove\_members\_result|string|成功时返回 success|
|add\_to\_member\_blacklist\_fail\_openids|\[\]string|拉黑失败的 openid|

## [#](#响应示例) 响应示例

```json
{
    "remove_members_result": "success",
    "add_to_member_blacklist_fail_openids": []
}
```

1  
2  
3  
4

### [#](#错误码) 错误码

|错误码|描述|排查建议|
|---|---|---|
|11253|应用无接口访问权限|该接口仅白名单机器人可用，请联系平台运营申请权限|

← [获取群成员信息](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_members_member_openid.get.html) [群黑名单查询](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_member_blacklist.get.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区