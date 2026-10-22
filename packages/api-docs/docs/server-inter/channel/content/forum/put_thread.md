# [#](#发表帖子) 发表帖子

## [#](#接口) 接口

```http
PUT /channels/{channel_id}/threads
```

1

## [#](#功能描述) 功能描述

* 创建成功后，返回创建成功的任务ID。

注意

* 公域机器人暂不支持申请，仅私域机器人可用，选择私域机器人后默认开通。
* 注意: 开通后需要先将机器人从频道移除，然后重新添加，方可生效。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|title|string|帖子标题|
|content|string|帖子内容|
|format|uint32|[帖子文本格式](#Format)|

### [#](#format) Format

* 帖子文本格式

|字段名|值|描述|
|---|---|---|
|FORMAT\_TEXT|1|普通文本|
|FORMAT\_HTML|2|HTML|
|FORMAT\_MARKDOWN|3|Markdown|
|FORMAT\_JSON|4|JSON（content参数可参照[RichText](/wiki/develop/api-v2/server-inter/channel/content/forum/model.html#RichText)结构）|

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#返回) 返回

|字段名|类型|描述|
|---|---|---|
|task\_id|string|帖子任务ID|
|create\_time|string|发帖时间戳，单位：秒|

## [#](#示例) 示例

请求数据包

```json
{
    "title": "title",
    "content": "<html lang=\"en-US\"><body><a href=\"https://bot.q.qq.com/wiki\" title=\"QQ机器人文档Title\">QQ机器人文档</a>\n<ul><li>主动消息：发送消息时，未填msg_id字段的消息。</li><li>被动消息：发送消息时，填充了msg_id字段的消息。</li></ul></body></html>",
    "format": 2
}
```

1  
2  
3  
4  
5

响应数据包

```json
{
    "task_id": "1645413752912602306",
    "create_time": "1645503180"
}
```

1  
2  
3  
4

← [获取帖子详情](/wiki/develop/api-v2/server-inter/channel/content/forum/get_thread.html) [删除帖子](/wiki/develop/api-v2/server-inter/channel/content/forum/delete_thread.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区