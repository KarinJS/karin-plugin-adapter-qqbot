# [#](#删除子频道) 删除子频道

删除子频道。需要管理员权限。成功返回 HTTP 200。

需要管理员权限。私域接口，删除成功后会触发 CHANNEL\_DELETE 事件。子频道删除后无法恢复。

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/channels/{channel\_id}|
|HTTP Method|DELETE|
|接口频率限制|50 QPS|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|channel\_id|string|是||

### [#](#请求示例) 请求示例

**示例1**

```text
DELETE /channels/123456
```

1

## [#](#响应) 响应

无

## [#](#响应示例) 响应示例

**示例1**

```json
{}
```

1

← [修改子频道](/wiki/develop/api-v2/autogen/api/channels_channel_id.patch.html) [获取子频道在线成员数](/wiki/develop/api-v2/server-inter/channel/role/get_online_nums.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区