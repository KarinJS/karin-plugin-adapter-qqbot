# [#](#日程对象-schedule) 日程对象(Schedule)

用于描述一个日程。

## [#](#schedule) Schedule

|字段名|类型|描述|
|---|---|---|
|id|string|日程 id|
|name|string|日程名称|
|description|string|日程描述|
|start\_timestamp|string|日程开始时间戳(ms)|
|end\_timestamp|string|日程结束时间戳(ms)|
|creator|[Member](/wiki/develop/api-v2/server-inter/channel/role/member/model.html#member)|创建者|
|jump\_channel\_id|string|日程开始时跳转到的子频道 id|
|remind\_type|string|日程提醒类型，取值参考[RemindType](#remindtype)|

## [#](#remindtype) RemindType

|提醒类型 id|描述|
|---|---|
|0|不提醒|
|1|开始时提醒|
|2|开始前 5 分钟提醒|
|3|开始前 15 分钟提醒|
|4|开始前 30 分钟提醒|
|5|开始前 60 分钟提醒|

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区