# [#](#获取机器人详情) 获取机器人详情

获取当前用户（机器人）的详情信息。

* union\_openid 和 union\_user\_account 需特殊申请并配置后才会返回
* 这两个字段仅在单独拉取 member 信息时提供

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/users/@me|
|HTTP Method|GET|
|接口频率限制|50 QPS|

### [#](#请求示例) 请求示例

**获取当前用户信息**

```text
GET /users/@me
```

1

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|id|string|用户 ID|
|username|string|用户名|
|avatar|string|头像 URL|
|bot|boolean|是否为机器人|
|union\_openid|string|跨应用统一用户 OpenID（需特殊申请）|
|union\_user\_account|string|跨应用统一用户账号（需特殊申请）|

## [#](#响应示例) 响应示例

**获取当前用户信息成功**

```json
{
  "id": "5777414462219517083",
  "username": "阳光小助手",
  "avatar": "https://thirdqq.qlogo.cn/g?b=oidb&k=AbCdEfGhIjKlMnOpQrStUv&kti=xyzABC&s=0&t=1781676795",
  "bot": true,
  "union_openid": "9F2E872045CCCC5948BEAF5B5FCCDF22",
  "union_user_account": "",
  "share_url": "https://qun.qq.com/qunpro/robot/qunshare?robot_uin=3889007780&robot_appid=102083127&biz_type=0",
  "welcome_msg": "欢迎加入我们的群聊"
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

← [文本交互](/wiki/develop/api-v2/server-inter/message/trans/text-chain.html) [获取机器人加入的频道列表](/wiki/develop/api-v2/autogen/api/users_me_guilds.get.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区