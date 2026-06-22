# [#](#事件) 事件

## [#](#机器人加入-退出群聊) 机器人加入/退出群聊

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|GROUP\_ADD\_ROBOT、GROUP\_DEL\_ROBOT|
|触发场景|机器人被添加/移出群聊|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|触发时间|
|group\_openid|string|群 openid|
|op\_member\_openid|string|操作人的群成员 openid|

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

## [#](#群聊设置接收-拒绝机器人主动消息) 群聊设置接收/拒绝机器人主动消息

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|GROUP\_MSG\_RECEIVE、GROUP\_MSG\_REJECT|
|触发场景|群管理员主动在机器人群资料页操作开启/关闭通知|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|操作的时间|
|group\_openid|string|群 openid|
|op\_member\_openid|string|操作人的群成员 openid|

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

## [#](#群成员加入-退出群聊) 群成员加入/退出群聊

* **基本概况**

||
|---|
|基本|
|intents|1<<24|
|事件类型|GROUP\_MEMBER\_ADD、GROUP\_MEMBER\_REMOVE|
|触发场景|成员进退群聊时触发|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|触发时间|
|group\_openid|string|群 openid|
|member\_openid|string|群成员 openid|

* **事件示例**

```json
{
	"group_openid": "C9F778FE6ADF9D1D1DBE395BF744A33A",
	"op_member_openid": "8C4A124E88A3669648C400773BD49EF0",
	"timestamp": 1781680853
}
```

1  
2  
3  
4  
5

← [事件](/wiki/develop/api-v2/server-inter/user/manage/event.html) [获取用户详情](/wiki/develop/api-v2/server-inter/channel/manage/user/me.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区