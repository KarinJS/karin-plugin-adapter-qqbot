# [#](#发送消息) 发送消息

2026/03/05 能力更新说明

沙箱环境内，机器人发送消息不受频控策略影响。

2026/01/10 能力更新说明

单聊场景新增互动召回消息能力，在用户主动与机器人对话之后，机器人在未来 30 天内可下发互动召回消息给用户（消息类型与当前机器人拥有的消息类型权限一致），每个周期内可下发一条。分别为：当天、1 - 3 天、3 - 7 天、7 - 30 天，合计：4 个周期，C2C发消息接口新增 is\_wakeup 字段使用该能力。

注意

主动推送能力于 2025 年 4 月 21 日起不再提供，接口调用时会收到错误信息。 公告信息：[【关于QQ机器人消息推送策略调整通知】(opens new window)](https://q.qq.com/miniapp#/news/detail/974e66a946a5e54c441ca983585a7aab)

说明

发送消息分为，主动推送与被动回复，主动消息和被动消息在不同的场景下，发送的频次有不同的规则。 发送消息的接口有`4`个场景：QQ单聊、QQ群聊、文字子频道、频道私信

主动消息与被动消息说明： QQ 用户可以在 QQ 客户端主动设置是否接收机器人发送的主动消息，如果设置了关闭，主动消息一律发送失败。

* 单聊
  * 主动消息每月 `4 条`，超额会发送失败。（例如：给相同用户每月最多发 4 条）
  * 被动消息（回复类）有效时间为 `60 分钟`，每个消息最多回复 `5 次`，超时或超频会发送（回复）失败；
  * 互动召回消息：当用户主动与机器人对话之后每个的周期内可下发 1 条召回消息。周期分别为：当天、1 - 3 天、3 - 7 天、7 - 30 天。在用户隔天发消息给机器人后，周期都会按天维度往后重新计算。
* 群聊
  * 主动消息每月 `4 条`，超额会发送失败。（例如：给相同群每月最多发 4 条）
  * 被动消息（回复类）有效时间为 `5 分钟`，每个消息最多回复 `5 次`，超时或超频会发送（回复）失败；
* 文字子频道
  * 主动消息在频道主或管理设置了情况下，按设置的数量进行限频。在未设置的情况遵循如下限制:
    * 主动推送消息，默认每天往每个子频道可推送的消息数是 `20` 条，超过会被限制。
    * 主动推送消息在每个频道中，每天可以往 `2` 个子频道推送消息。超过后会被限制。
  * 不论主动消息还是被动消息，在一个子频道中，`每秒` 最多可发送 `5 条` 消息。
  * 被动回复消息有效期为 `5 分钟`，超时会发送失败。
  * 发送消息接口要求机器人接口需要连接到 `WebSocket` 上保持在线状态
  * 有关主动消息审核，可以通过 `事件订阅 Intents` 中审核事件 `MESSAGE_AUDIT` 返回 `MessageAudited` 对象获取结果。
* 频道私信
  * 私信场景下，每个机器人每天可以对一个用户发 `2 条` 主动消息。
  * 私信场景下，每个机器人每天累计可以发 `200 条` 主动消息。
  * 被动回复消息有效期为 `5 分钟`，超时会发送失败。

发送的消息内容包含 URL 的说明：

如开发者需要在消息内容发送含有 url 信息的消息，请现在 q.qq.com 后台-开发设置-消息URL配置 预先配置，否则会发送失败。 调用发消息 http 接口的 timeout 建议设置最低为 5 秒，避免出现实际消息已发送成功，但没接收到同步的结果返回。

## [#](#单聊) 单聊

说明

单独发送消息给用户。

* **请求**
  ||

  |---|
  |调用方式|
  |HTTP URL|/v2/users/{openid}/messages|
  |HTTP Method|POST|
* **路径参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|openid|string|是|QQ 用户的 openid，可在各类事件中获得。|

* **请求参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|content|string|否|文本消息内容|
|msg\_type|int|是|消息类型：0 文本、2 markdown、3 ark、4 embed、7 media 富媒体|
|markdown|object|否|[Markdown](/wiki/develop/api-v2/server-inter/message/type/markdown.html#数据结构与协议) 对象|
|keyboard|object|否|[Keyboard](/wiki/develop/api-v2/server-inter/message/trans/msg-btn.html#数据结构与协议) 对象|
|ark|object|否|[Ark](/wiki/develop/api-v2/server-inter/message/type/ark.html#数据结构与协议) 对象|
|media|object|否|[富媒体单聊](/wiki/develop/api-v2/server-inter/message/send-receive/rich-media.html#用于单聊) 的 file\_info|
|message\_reference|object|否|消息引用|
|event\_id|string|否|前置收到的事件 ID，用于发送被动消息，支持事件："INTERACTION\_CREATE"、"C2C\_MSG\_RECEIVE"、"FRIEND\_ADD"|
|msg\_id|string|否|前置收到的用户发送过来的消息 ID，用于发送被动（回复）消息|
|msg\_seq|int|否|回复消息的序号，与 msg\_id 联合使用，避免相同消息 id 回复重复发送，不填默认是 1。相同的 msg\_id + msg\_seq 重复发送会失败。|
|is\_wakeup|bool|否|指明发送消息为互动召回消息，与 msg\_id，event\_id 互斥使用|

* **返回参数**

|**属性**|**类型**|**说明**|
|---|---|---|
|id|string|消息唯一ID|
|timestamp|int|发送时间|

* **常见错误码**

|**code**|**message**|**说明**|
|---|---|---|
|22009|msg limit exceed|消息发送超频|
|304082|upload media info fail|富媒体资源拉取失败，请重试|
|304083|convert media info fail|富媒体资源拉取失败，请重试|

## [#](#群聊) 群聊

说明

发送消息到群。

* **请求**
  ||

  |---|
  |调用方式|
  |HTTP URL|/v2/groups/{group\_openid}/messages|
  |HTTP Method|POST|
* **路径参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|group\_openid|string|是|群聊的 openid|

* **请求参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|content|string|是|文本消息内容|
|msg\_type|int|是|消息类型： 0 文本、2 markdown、3 ark 消息、4 embed、7 media 富媒体|
|markdown|object|否|[Markdown](/wiki/develop/api-v2/server-inter/message/type/markdown.html#数据结构与协议) 对象|
|keyboard|object|否|[Keyboard](/wiki/develop/api-v2/server-inter/message/trans/msg-btn.html#数据结构与协议) 对象|
|media|object|否|[富媒体群聊](/wiki/develop/api-v2/server-inter/message/send-receive/rich-media.html#用于群聊) 的file\_info|
|ark|object|否|[Ark](/wiki/develop/api-v2/server-inter/message/type/ark.html#数据结构与协议) 对象|
|message\_reference|object|否|消息引用|
|event\_id|string|否|前置收到的事件 ID，用于发送被动消息，支持事件："INTERACTION\_CREATE"、"GROUP\_ADD\_ROBOT"、"GROUP\_MSG\_RECEIVE"|
|msg\_id|string|否|前置收到的用户发送过来的消息 ID，用于发送被动消息（回复）|
|msg\_seq|int|否|回复消息的序号，与 msg\_id 联合使用，避免相同消息 id 回复重复发送，不填默认是 1。相同的 msg\_id + msg\_seq 重复发送会失败。|

* **返回参数**

|**属性**|**类型**|**说明**|
|---|---|---|
|id|string|消息唯一 ID|
|timestamp|int|发送时间|

* **常见错误码**

|**code**|**message**|**说明**|
|---|---|---|
|22009|msg limit exceed|消息发送超频|
|304082|upload media info fail|富媒体资源拉取失败，请重试|
|304083|convert media info fail|富媒体资源拉取失败，请重试|

## [#](#文字子频道) 文字子频道

说明

发送消息到文字子频道。

* **请求**
  ||

  |---|
  |调用方式|
  |HTTP URL|/channels/{channel\_id}/messages|
  |HTTP Method|POST|
* **详细文档** [发送消息|QQ机器人文档](/wiki/develop/api-v2/server-inter/message/post_messages.html)

## [#](#频道私信) 频道私信

发送消息到频道私信，请求参数与文字子频道发送消息参数一致

* **请求**
  ||

  |---|
  |调用方式|
  |HTTP URL|/dms/{guild\_id}/messages|
  |HTTP Method|POST|
* **详细文档** [发送私信|QQ机器人文档](/wiki/develop/api-v2/server-inter/message/dms/post_dms_messages.html)

← [websocket](/wiki/develop/api-v2/dev-prepare/error-trace/websocket.html) [富媒体消息](/wiki/develop/api-v2/server-inter/message/send-receive/rich-media.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区