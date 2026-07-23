# [#](#获取机器人群内状态) 获取机器人群内状态

获取机器人在指定群的状态信息。

仅白名单机器人开放，需要向平台运营申请

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/groups/{group\_openid}/bot\_state|
|HTTP Method|GET|
|接口频率限制|60 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|group\_openid|string|是|群 OpenID|

### [#](#请求示例) 请求示例

**获取机器人群内状态**

```text
GET /v2/groups/3E5D8A1F7B2C9E4D6A0F1B3C5D7E9F2A/bot_state
```

1

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|member\_openid|string|机器人的 OpenID|
|joined\_at|string|入群时间，RFC3339 格式|
|allow\_proactive\_msg|boolean|是否接收主动推送|
|recv\_msg\_setting|string|接收消息类型: all=全部, only\_mention=仅@, mention\_and\_context=@和上下文|
|member\_role|string|群成员角色: member=普通成员, owner=群主, admin=管理员|

## [#](#响应示例) 响应示例

**获取机器人群内状态**

```json
{
  "member_openid": "7A3B9C1D5E2F4A6B8C0D1E3F5A7B9C2D",
  "joined_at": "2025-06-15T14:30:00+08:00",
  "allow_proactive_msg": false,
  "recv_msg_setting": "only_mention",
  "member_role": "member
}
```

1  
2  
3  
4  
5  
6  
7

### [#](#错误码) 错误码

|错误码|描述|排查建议|
|---|---|---|
|11253|应用无接口访问权限|该接口仅白名单机器人可用，请联系平台运营申请权限|

← [获取群基础信息](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_info.get.html) [机器人加入群聊](/wiki/develop/api-v2/autogen/event/group_add_robot.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区