# [#](#修改子频道) 修改子频道

## [#](#接口) 接口

```http
PATCH /channels/{channel_id}
```

1

## [#](#功能描述) 功能描述

用于修改 `channel_id` 指定的子频道的信息。

* 要求操作人具有`管理子频道`的权限，如果是机器人，则需要将机器人设置为管理员。
* 修改成功后，会触发**子频道更新事件**。

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
|name|string|子频道名|
|position|int|排序|
|parent\_id|string|分组 id|
|private\_type|int|子频道私密类型 [PrivateType](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#privatetype)|
|speak\_permission|int|子频道发言权限 [SpeakPermission](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#speakpermission)|

需要修改哪个字段，就传递哪个字段即可。

## [#](#返回) 返回

返回[Channel](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#Channel) 对象。

## [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

## [#](#示例) 示例

请求数据包

```json
{
  "name": "新的私密子频道",
  "position": 1,
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

响应数据包

```json
{
  "id": "xxxxxx",
  "guild_id": "xxxxxx",
  "name": "私密子频道a",
  "type": 10006,
  "position": 2,
  "parent_id": "xxxxxx",
  "owner_id": "xxxxxx",
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
10  
11

← [创建子频道](/wiki/develop/api-v2/server-inter/channel/manage/channel/post_channels.html) [删除子频道](/wiki/develop/api-v2/server-inter/channel/manage/channel/delete_channel.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区