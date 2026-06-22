# [#](#事件) 事件

## [#](#机器人加入群聊) 机器人加入群聊

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|GROUP\_ADD\_ROBOT|
|触发场景|机器人被添加到群聊|
|权限要求|暂无|
|推送方式|Websocket|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|加入的时间戳|
|group\_openid|string|加入群的群openid|
|op\_member\_openid|string|操作添加机器人进群的群成员openid|

* **事件示例**

```json
{
	"group_openid": "C9F778FE6ADF9D1D1DBE395BF744A33A",
	"op_member_openid": "E4F4AEA33253A2797FB897C50B81D7ED",
	"timestamp": 1699240248
}
```

1  
2  
3  
4  
5

## [#](#机器人退出群聊) 机器人退出群聊

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|GROUP\_DEL\_ROBOT|
|触发场景|机器人被移出群聊|
|权限要求|暂无|
|推送方式|Websocket|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|移除的时间戳|
|group\_openid|string|移除群的群openid|
|op\_member\_openid|string|操作移除机器人退群的群成员openid|

* **事件示例**

```json
{
	"group_openid": "C9F778FE6ADF9D1D1DBE395BF744A33A",
	"op_member_openid": "E4F4AEA33253A2797FB897C50B81D7ED",
	"timestamp": 1699240426
}
```

1  
2  
3  
4  
5

## [#](#群聊拒绝机器人主动消息) 群聊拒绝机器人主动消息

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|GROUP\_MSG\_REJECT|
|触发场景|群管理员主动在机器人资料页操作关闭通知|
|权限要求|暂无|
|推送方式|Websocket|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|操作的时间戳|
|group\_openid|string|操作群的群openid|
|op\_member\_openid|string|操作群成员的openid|

* **事件示例**

```json
{
	"group_openid": "C9F778FE6ADF9D1D1DBE395BF744A33A",
	"op_member_openid": "E4F4AEA33253A2797FB897C50B81D7ED",
	"timestamp": 1699240458
}
```

1  
2  
3  
4  
5

## [#](#群聊接受机器人主动消息) 群聊接受机器人主动消息

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|GROUP\_MSG\_RECEIVE|
|触发场景|群管理员主动在机器人资料页操作开启通知|
|权限要求|暂无|
|推送方式|Websocket|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|操作的时间戳|
|group\_openid|string|操作群的群openid|
|op\_member\_openid|string|操作群成员的openid|

* **事件示例**

```json
{

	"group_openid": "C9F778FE6ADF9D1D1DBE395BF744A33A",
	"op_member_openid": "E4F4AEA33253A2797FB897C50B81D7ED",
	"timestamp": 1699240477
}
```

1  
2  
3  
4  
5  
6

← [事件](/wiki/develop/api-v2/server-inter/user/manage/event.html) [获取用户详情](/wiki/develop/api-v2/server-inter/channel/manage/user/me.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区