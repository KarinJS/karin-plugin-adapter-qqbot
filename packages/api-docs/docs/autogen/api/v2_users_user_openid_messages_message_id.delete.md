# [#](#撤回单聊消息) 撤回单聊消息

撤回机器人发送给当前用户的消息。发送超过 2 分钟的消息不可撤回。 成功返回 HTTP 200，无响应体。

* 发送超出 **2 分钟**的消息不可撤回

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/users/{user\_openid}/messages/{message\_id}|
|HTTP Method|DELETE|
|接口频率限制|10 QPS|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|user\_openid|string|是|用户 OpenID|
|message\_id|string|是|消息 ID|

### [#](#请求示例) 请求示例

**示例1**

```text
DELETE /v2/users/A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4/messages/0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF
```

1

## [#](#响应) 响应

无

## [#](#响应示例) 响应示例

**示例1**

```json
{}
```

1

### [#](#错误码) 错误码

|错误码|描述|排查建议|
|---|---|---|
|306009|用户openid无效|请检查user\_openid是否正确|
|40061001|请求参数无效|请检查请求参数格式|
|40061002|请求参数msgid无效|请检查msgid格式是否正确|
|40064004|已超出消息撤回时限|消息发送超过2分钟后不可撤回|

← [流式发送单聊消息](/wiki/develop/api-v2/autogen/api/v2_users_user_openid_stream_messages.post.html) [单聊消息事件](/wiki/develop/api-v2/autogen/event/c2c_message_create.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区