# [#](#创建频道公告) 创建频道公告

## [#](#接口) 接口

```http
POST /guilds/{guild_id}/announces
```

1

## [#](#功能描述) 功能描述

用于创建频道全局公告，公告类型分为 **消息类型的频道公告** 和 **推荐子频道类型的频道公告** 。

* 当请求参数 `message_id` 有值时，优先创建消息类型的频道公告， 消息类型的频道公告只能创建成员公告类型的频道公告。
* 创建推荐子频道类型的频道全局公告请将 `message_id` 设置为空，并设置对应的 `announces_type` 和 `recommend_channels` 请求参数，会一次全部替换推荐子频道公司。
* 推荐子频道和消息类型全局公告不能同时存在，会互相顶替设置。
* 同频道内推荐子频道最多只能创建 `3` 条。
* 只有子频道权限为全体成员可见才可设置为推荐子频道。
* 删除推荐子频道类型的频道公告请使用 [删除频道公告](/wiki/develop/api-v2/server-inter/channel/content/announces/delete_guild_announces.html),并将 `message_id` 设置为 `all`。

## [#](#content-type) Content-Type

```http
application/json
```

1

## [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|message\_id|string|选填，消息 id，message\_id 有值则优选将某条消息设置为成员公告|
|channel\_id|string|选填，子频道 id，message\_id 有值则为必填。|
|announces\_type|uint32|选填，公告类别 0:成员公告，1:欢迎公告，默认为成员公告|
|recommend\_channels|[RecommendChannel](/wiki/develop/api-v2/server-inter/channel/content/announces/model.html#RecommendChannel) 数组|选填，推荐子频道列表，会一次全部替换推荐子频道列表|

## [#](#返回) 返回

返回[Announces](/wiki/develop/api-v2/server-inter/channel/content/announces/model.html#Announces) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

创建频道公告请求数据包

```json
{
  "channel_id": "123456",
  "message_id": "xxxxxx"
}
```

1  
2  
3  
4

创建频道公告响应数据包

```json
{
  "guild_id": "xxxxxx",
  "channel_id": "123456",
  "message_id": "xxxxxx",
  "announces_type": 0,
  "recommend_channels":[]
}
```

1  
2  
3  
4  
5  
6  
7

创建推荐子频道类型的频道公告请求数据包

```json
{
 "announces_type": 1,
 "recommend_channels": [{
  "channel_id": "xxxx",
  "introduce": "推荐语"
 }, {
  "channel_id": "xxxx",
  "introduce": "推荐语"
 }]
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
11

创建推荐子频道类型的频道公告响应数据包

```json
{
	"guild_id": "xxxxxx",
	"channel_id": "xxxxx",
    "message_id": "",
	"announces_type": 1,
	"recommend_channels": [{
		"channel_id": "xxxx",
		"introduce": "推荐语"
	}, {
		"channel_id": "xxxx",
		"introduce": "推荐语"
	}]
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
11  
12  
13

← [频道批量成员禁言](/wiki/develop/api-v2/server-inter/channel/speak/patch_guild_mute_multi_member.html) [删除频道公告](/wiki/develop/api-v2/server-inter/channel/content/announces/delete_guild_announces.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区