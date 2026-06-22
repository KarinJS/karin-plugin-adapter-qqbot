# [#](#创建私信会话) 创建私信会话

### [#](#接口) 接口

```http
POST /users/@me/dms
```

1

### [#](#功能描述) 功能描述

用于机器人和在同一个频道内的成员创建私信会话。

* 机器人和用户存在共同频道才能创建私信会话。
* 创建成功后，返回创建成功的频道 `id` ，子频道 `id` 和创建时间。

### [#](#content-type) Content-Type

```http
application/json
```

1

### [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|recipient\_id|string|接收者 id|
|source\_guild\_id|string|源频道 id|

### [#](#返回) 返回

返回[DMS](/wiki/develop/api-v2/server-inter/message/dms/model.html#dms)对象。

### [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例) 示例

请求数据包

```json
{
  "recipient_id": "123456",
  "source_guild_id": "112233"
}
```

1  
2  
3  
4

响应数据包

```json
{
  "guild_id": "xxxxxx",
  "channel_id": "xxxxxx",
  "create_time": "1642545606"
}
```

1  
2  
3  
4  
5

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区