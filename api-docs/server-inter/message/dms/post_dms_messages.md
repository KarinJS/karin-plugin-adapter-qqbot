# [#](#发送私信) 发送私信

### [#](#接口) 接口

```http
POST /dms/{guild_id}/messages
```

1

### [#](#功能描述) 功能描述

用于发送私信消息，前提是已经创建了私信会话。

* 私信的 `guild_id` 在[创建私信会话](/wiki/develop/api-v2/server-inter/message/dms/post_dms.html)时以及[私信消息事件](/wiki/develop/api-v2/server-inter/message/dms/direct_message.html)中获取。
* 私信场景下，每个机器人每天可以对一个用户发 2 条主动消息。
* 私信场景下，每个机器人每天累计可以发 200 条主动消息。
* 私信场景下，被动消息没有条数限制。

### [#](#content-type) Content-Type

```http
application/json
```

1

### [#](#参数) 参数

和[发送消息](/wiki/develop/api-v2/server-inter/message/post_messages.html)参数一致。

### [#](#返回) 返回

和[发送消息](/wiki/develop/api-v2/server-inter/message/post_messages.html)返回一致。

### [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例) 示例

参见[发送消息](/wiki/develop/api-v2/server-inter/message/post_messages.html#示例)示例。

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区