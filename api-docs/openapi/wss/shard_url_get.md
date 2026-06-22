# [#](#获取带分片-wss-接入点) 获取带分片 WSS 接入点

### [#](#接口) 接口

```http
GET /gateway/bot
```

1

### [#](#功能描述) 功能描述

用于获取 WSS 接入地址及相关信息，通过该地址可建立 `websocket` 长连接。相关信息包括：

* 建议的分片数。
* 目前连接数使用情况。

### [#](#content-type) Content-Type

```http
application/json
```

1

### [#](#返回) 返回

|字段名|类型|描述|
|---|---|---|
|url|string|WebSocket 的连接地址|
|shards|int|建议的 shard 数|
|session\_start\_limit|[SessionStartLimit](#sessionstartlimit)|创建 Session 限制信息|

### [#](#sessionstartlimit) SessionStartLimit

|字段名|类型|描述|
|---|---|---|
|total|int|每 24 小时可创建 Session 数|
|remaining|int|目前还可以创建的 Session 数|
|reset\_after|int|重置计数的剩余时间(ms)|
|max\_concurrency|int|每 5s 可以创建的 Session 数|

### [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例) 示例

```json
{
  "wss://api.sgroup.qq.com/websocket/",
  "shards": 9,
  "session_start_limit": {
    "total": 1000,
    "remaining": 999,
    "reset_after": 14400000,
    "max_concurrency": 1
  }
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

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区