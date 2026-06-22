# [#](#机器人链接) 机器人链接

## [#](#获取机器人资料页分享链接) 获取机器人资料页分享链接

### [#](#功能描述) 功能描述

获取机器人分享链接，开发者可传入参数，用作追踪该链接后续被用户添加使用机器人的来源归因。

### [#](#接口) 接口

* **请求**

  ||
  |---|
  |调用方式|
  |HTTP URL|/v2/generate\_url\_link|
  |HTTP Method|POST|

* **请求参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|callback\_data|string(32)|否|添加好友时会回传该参数给到开发者|

* **返回参数**

|**属性**|**类型**|**说明**|
|---|---|---|
|url|string|生成的分享链接|

← [消息按钮](/wiki/develop/api-v2/server-inter/message/trans/msg-btn.html) [事件](/wiki/develop/api-v2/server-inter/user/manage/event.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区