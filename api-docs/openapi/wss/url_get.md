# [#](#获取通用-wss-接入点) 获取通用 WSS 接入点

### [#](#接口) 接口

```http
GET /gateway
```

1

### [#](#功能描述) 功能描述

用于获取 WSS 接入地址，通过该地址可建立 `websocket` 长连接。

### [#](#content-type) Content-Type

```http
application/json
```

1

### [#](#返回) 返回

返回一个用于连接 `websocket` 的地址。

### [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例) 示例

响应数据包

```json
{
  "url": "wss://api.sgroup.qq.com/websocket/"
}
```

1  
2  
3

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区