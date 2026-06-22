# [#](#事件) 事件

## [#](#用户添加机器人) 用户添加机器人

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|FRIEND\_ADD|
|触发场景|用户添加机器人为'好友'到消息列表|
|权限要求|暂无|
|推送方式|Websocket|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|添加时间戳|
|openid|string|用户 openid|
|scene|int|加好友场景值，详见定义|
|scene\_param|string|开发者自定义的回调数据（callback\_data）|

* **场景值说明**

|**scene 场景值**|**说明**|
|---|---|
|1000|缺省默认值|
|1001|网络搜索（全部tab）|
|1002|网络搜索（机器人tab）|
|1003|群场景|
|1004|空间场景|
|2001|站内分享资料页|
|2002|站外分享资料页|
|2003|开发者生成的分享链接（站内）|
|2004|开发者生成的分享链接（站外）|

* **事件示例**

```json
{
  "openid": "E4F4AEA33253A2797FB897C50B81D7ED",
  "timestamp": 1699240365,
  "scene": 1000,
  "scene_param": ""
}
```

1  
2  
3  
4  
5  
6

## [#](#用户删除机器人) 用户删除机器人

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|FRIEND\_DEL|
|触发场景|用户删除机器人'好友'|
|权限要求|暂无|
|推送方式|Websocket|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|删除时间戳|
|openid|string|用户openid|

* **事件示例**

```json
{
	"openid": "E4F4AEA33253A2797FB897C50B81D7ED",
	"timestamp": 1699240328
}
```

1  
2  
3  
4

## [#](#拒绝机器人主动消息) 拒绝机器人主动消息

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|C2C\_MSG\_REJECT|
|触发场景|用户在机器人资料卡手动关闭"主动消息"推送|
|权限要求|暂无|
|推送方式|Websocket|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|操作时间戳|
|openid|string|用户 openid|

* **事件示例**

```json
{
	"openid": "E4F4AEA33253A2797FB897C50B81D7ED",
	"timestamp": 1699240599
}
```

1  
2  
3  
4

## [#](#允许机器人主动消息) 允许机器人主动消息

* **基本概况**

||
|---|
|基本|
|intents|1<<25|
|事件类型|C2C\_MSG\_RECEIVE|
|触发场景|用户在机器人资料卡手动开启"主动消息"推送开关|
|权限要求|暂无|
|推送方式|Websocket|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|timestamp|int|操作时间戳|
|openid|string|用户 openid|

* **事件示例**

```json
{
	"openid": "E4F4AEA33253A2797FB897C50B81D7ED",
	"timestamp": 1699240617
}
```

1  
2  
3  
4

← [机器人链接](/wiki/develop/api-v2/server-inter/user/share_url.html) [事件](/wiki/develop/api-v2/server-inter/group/manage/event.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区