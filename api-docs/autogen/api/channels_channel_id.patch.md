# [#](#修改子频道) 修改子频道

修改子频道信息。需要管理员权限。

需要管理员权限。私域接口，只需传入要修改的字段，修改成功后会触发 CHANNEL\_UPDATE 事件。

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/channels/{channel\_id}|
|HTTP Method|PATCH|
|接口频率限制|50 QPS|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|channel\_id|string|是||

## [#](#请求体) 请求体

|名称|类型|必填|描述|
|---|---|---|---|
|name|string|否|子频道名|
|position|integer|否|排序|
|parent\_id|string|否|分组 ID|
|private\_type|integer|否|私密类型|
|speak\_permission|integer|否|发言权限|

### [#](#请求示例) 请求示例

**修改子频道名称和排序**

```text
PATCH /channels/123456
{
  "name": "公告区（已改名）",
  "position": 5,
  "parent_id": "0"
}
```

1  
2  
3  
4  
5  
6

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|id|string|子频道 ID|
|guild\_id|string|所属频道 ID|
|name|string|子频道名|
|type|integer|子频道类型: 0=文字, 2=语音, 4=分组, 10005=直播, 10006=应用, 10007=论坛|
|sub\_type|integer|子频道子类型（文字子频道）: 0=闲聊, 1=公告, 2=攻略, 3=开黑|
|position|integer|排序值，从 1 开始|
|parent\_id|string|所属分组 ID（仅子频道有效）|
|owner\_id|string|创建人 ID|
|private\_type|integer|子频道私密类型: 0=公开, 1=群主管理员可见, 2=群主管理员+指定成员|
|speak\_permission|integer|子频道发言权限: 0=无效, 1=所有人, 2=群主管理员+指定成员|
|application\_id|string|应用子频道标识|
|permissions|string|用户拥有的子频道权限|

## [#](#响应示例) 响应示例

**示例1**

```json
{
  "id": "123456",
  "guild_id": "123456789012345678",
  "name": "公告区（已改名）",
  "type": 0,
  "sub_type": 0,
  "position": 5,
  "parent_id": "0",
  "owner_id": "123456789012345678",
  "private_type": 0,
  "speak_permission": 1
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

← [获取子频道详情](/wiki/develop/api-v2/autogen/api/channels_channel_id.get.html) [删除子频道](/wiki/develop/api-v2/autogen/api/channels_channel_id.delete.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区