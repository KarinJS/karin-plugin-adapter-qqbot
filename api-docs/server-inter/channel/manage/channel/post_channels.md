# [#](#创建子频道) 创建子频道

## [#](#接口) 接口

```http
POST /guilds/{guild_id}/channels
```

1

## [#](#功能描述) 功能描述

用于在 `guild_id` 指定的频道下创建一个子频道。

* 要求操作人具有`管理频道`的权限，如果是机器人，则需要将机器人设置为管理员。
* 创建成功后，返回创建成功的子频道对象，同时会触发一个频道创建的事件通知。

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
|name|string|子频道名称|
|type|int|子频道类型 [ChannelType](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#channeltype)|
|sub\_type|int|子频道子类型 [ChannelSubType](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#channelsubtype)|
|position|int|子频道排序，必填；当子频道类型为 `子频道分组（ChannelType=4）`时，必须大于等于 2|
|parent\_id|string|子频道所属分组ID|
|private\_type|int|子频道私密类型 [PrivateType](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#privatetype)|
|private\_user\_ids|string 数组|子频道私密类型成员 ID|
|speak\_permission|int|子频道发言权限 [SpeakPermission](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#speakpermission)|
|application\_id|string|应用类型子频道应用 AppID，仅应用子频道需要该字段|

## [#](#返回) 返回

返回[Channel](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#channel) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```json
{
  "name": "私密子频道",
  "type": 0,
  "position": 1,
  "parent_id": "123456",
  "owner_id": "0",
  "sub_type": 0,
  "private_type": 1
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

响应数据包

```json
{
  "id": "xxxxxx",
  "guild_id": "xxxxxx",
  "name": "私密子频道",
  "type": 1,
  "position": 7,
  "parent_id": "123456",
  "owner_id": "xxxxxx",
  "sub_type": 0
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

← [获取子频道详情](/wiki/develop/api-v2/server-inter/channel/manage/channel/get_channel.html) [修改子频道](/wiki/develop/api-v2/server-inter/channel/manage/channel/patch_channel.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区