# [#](#素材管理) 素材管理

开发者可将 Markdown 消息所需的图片预先上传到平台，获得 `qqbot-media://` 引用后写入 Markdown 消息，无需依赖网络资源。图片在有效期内可反复引用，发送时由平台自动转存。

## [#](#使用流程) 使用流程

1. `POST /v2/media-images/prepare` 申请上传，获得预签名 URL
2. `PUT <presigned_url>` 使用返回的预签名 URL 直传图片二进制
3. `POST /v2/media-images/complete` 完成上传，获得图片引用与 `image_id`
4. 在 Markdown 中引用：`![说明 #宽px #高px](qqbot-media://image/v1/<token>)`

## [#](#限制说明) 限制说明

|项目|限制|
|---|---|
|单张图片大小|不超过 10MB|
|支持格式|png / jpeg / gif / webp|
|文件名与 Content-Type|扩展名需与 Content-Type 一致|
|单机器人数量上限|100 张（可通过删除接口释放）|
|图片有效期|滑动过期：自最后一次被消息引用起 90 天内未使用则失效|
|上传任务有效期|4 小时（prepare 返回的 `upload_id` 超过 4 小时失效，需重新申请）|
|预签名 URL 有效期|以 prepare 响应的 `expires_in` 为准|

## [#](#申请图片上传) 申请图片上传

`POST /v2/media-images/prepare`

### [#](#请求参数) 请求参数

|属性|类型|必填|说明|
|---|---|---|---|
|file\_name|string|是|文件名（含扩展名，如 kline.png）|
|file\_size|uint64|是|文件大小（字节）|
|content\_type|string|是|图片 MIME 类型：image/png / image/jpeg / image/gif / image/webp|
|md5|string|是|文件内容 MD5（32 位十六进制）|
|sha1|string|是|文件内容 SHA1（40 位十六进制）|

### [#](#返回参数) 返回参数

|属性|类型|说明|
|---|---|---|
|upload\_id|string|上传任务 ID，4 小时内有效|
|presigned\_url|string|预签名上传 URL，用 HTTP PUT 直传图片二进制|
|expires\_in|uint32|预签名 URL 有效期（秒），过期后需重新申请|

### [#](#示例) 示例

请求

```json
{
  "file_name": "kline.png",
  "file_size": 40156,
  "content_type": "image/png",
  "md5": "e10adc3949ba59abbe56e057f20f883e",
  "sha1": "d5c5d9b5b3d5d9e0a1b2c3d4e5f60718293a4b5c"
}
```

1  
2  
3  
4  
5  
6  
7

响应

```json
{
  "upload_id": "upload_1792051409302628435_772218",
  "presigned_url": "https://xxx.cos.ap-guangzhou.myqcloud.com/robot_upload/...",
  "expires_in": 3600
}
```

1  
2  
3  
4  
5

上传图片：使用返回的 `presigned_url`，以 HTTP PUT 直传图片二进制。请求头中的 Content-Type 必须与 prepare 时声明的 `content_type` 完全一致，否则 COS 会拒绝（403）。COS 返回响应头中的 ETag 即文件 MD5（去掉引号），供下一步使用：

```bash
curl -X PUT --data-binary @kline.png \
  -H "Content-Type: image/png" \
  "https://<presigned_url>"
```

1  
2  
3

## [#](#完成图片上传) 完成图片上传

`POST /v2/media-images/complete`

### [#](#请求参数-2) 请求参数

|属性|类型|必填|说明|
|---|---|---|---|
|upload\_id|string|是|prepare 返回的上传任务 ID|
|md5|string|是|上传返回的 ETag（文件 MD5，32 位十六进制）。服务端会与 COS 对象实际 ETag 比对，不一致返回 40035003|

### [#](#返回参数-2) 返回参数

|属性|类型|说明|
|---|---|---|
|image\_id|string|图片 ID，用于查询与删除|
|url|string|Markdown 引用链接：`qqbot-media://image/v1/<token>`|
|ttl|uint32|滑动有效期窗口（秒）。每次发送消息引用该图片后自动顺延；90 天（7776000 秒）内未被引用则失效|
|preview\_url|string|临时预览链接（外网 COS 预签名，短时效），仅供预览与发送前自查，请勿持久化存储|

### [#](#示例-2) 示例

请求

```json
{
  "upload_id": "upload_1792051409302628435_772218",
  "md5": "e10adc3949ba59abbe56e057f20f883e"
}
```

1  
2  
3  
4

响应

```json
{
  "image_id": "102083127_3f9a1c4b7d2e8065",
  "url": "qqbot-media://image/v1/6awbXUyjS27ckbHEMVNHr_ot0jW19fq...",
  "ttl": 7776000,
  "preview_url": "https://xxx.cos.ap-guangzhou.myqcloud.com/robot_upload/...?..."
}
```

1  
2  
3  
4  
5  
6

在 Markdown 消息中引用（与公网图片语法一致，宽高可选）：

```json
{
  "msg_type": 2,
  "markdown": {
    "content": "![分时K线 #800px #400px](qqbot-media://image/v1/6awbXUyjS27ckbHEMVNHr_ot0jW19fq...)"
  }
}
```

1  
2  
3  
4  
5  
6

## [#](#查询有效图片) 查询有效图片

`GET /v2/media-images?cursor={next_cursor}`

查询当前机器人的有效图片列表，按上传时间倒序。首页不传 `cursor`，翻页使用上一页返回的 `next_cursor`，为空表示已到末页。

### [#](#返回参数-3) 返回参数

|属性|类型|说明|
|---|---|---|
|images|Array|图片列表|
|images\[\].image\_id|string|图片 ID|
|images\[\].url|string|Markdown 引用链接|
|images\[\].file\_name|string|上传时的文件名|
|images\[\].preview\_url|string|临时预览链接（外网 COS 预签名，短时效），请勿持久化存储|
|images\[\].created\_at|int64|上传时间（Unix 秒）|
|images\[\].expires\_at|int64|过期时间（Unix 秒），每次被引用后自动顺延|
|next\_cursor|string|下一页游标，为空表示末页|
|total|uint64|当前有效图片总数（与数量上限同一口径）|

### [#](#示例-3) 示例

响应

```json
{
  "images": [
    {
      "image_id": "102083127_3f9a1c4b7d2e8065",
      "url": "qqbot-media://image/v1/6awbXUyjS27ckbHEMVNHr_ot0jW19fq...",
      "file_name": "kline.png",
      "preview_url": "https://xxx.cos.ap-guangzhou.myqcloud.com/robot_upload/...?...",
      "created_at": 1792051409,
      "expires_at": 1792656210
    }
  ],
  "next_cursor": "",
  "total": 1
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
14

## [#](#删除图片) 删除图片

`DELETE /v2/media-images/{image_id}/delete`

删除指定图片，释放数量配额。删除后：

* 图片从查询列表消失，`total` 相应减少
* 引用链接立即失效，不能再被新消息引用
* 已发送消息不受影响（发送时平台已转存图片副本）

删除不存在的 `image_id` 返回 40035008。

### [#](#示例-4) 示例

```bash
curl -X DELETE "https://api.bot.qq.com/v2/media-images/102083127_3f9a1c4b7d2e8065/delete" \
  -H "Authorization: QQBot <access_token>"
```

1  
2

响应：空 JSON 对象。

## [#](#错误码) 错误码

|错误码|说明|
|---|---|
|40035001|图片格式不支持（扩展名与 Content-Type 需为 png/jpeg/gif/webp 且一致）|
|40035002|图片超过大小上限（默认 10MB）|
|40035003|上传任务不存在、已过期（超过 4 小时）或不属于当前机器人|
|40035006|服务端内部错误（COS 处理、链接生成等失败），可稍后重试|
|40035007|图片数量超过上限（100 张），删除部分图片后重试|
|40035008|图片不存在或已被删除|
|40035009|图片已过期或已被删除，引用链接不再可用|
|40035010|引用链接无效，或不属于当前机器人|

通用鉴权、请求头、基础 URL 等说明参见 [接口使用说明](/wiki/develop/api-v2/dev-prepare/interface-framework/api-use.html)。

## [#](#注意事项) 注意事项

1. 引用链接不要篡改：`qqbot-media://` 链接与机器人绑定，其他机器人无法引用（会返回 40035010）。
2. 时效：图片采用滑动过期，每次消息成功引用后有效期顺延至 90 天；连续 90 天未被引用则链接失效（40035009）。可提前用查询接口的 `expires_at` 确认剩余有效期。
3. 与公网图片并存：同一 Markdown 中 `qqbot-media://` 引用与普通公网图片 URL 可以混用。
4. 数量管理：单机器人默认上限 100 张，超限时 prepare/complete 返回 40035007；建议定期删除不再使用的图片。
5. 内容校验：服务端只校验文件名扩展名与 `content_type` 是否匹配，不校验文件实际内容。若上传内容并非声明的图片格式，complete 可能成功，但在发送消息时会因格式检查失败。请确保上传的确实是合法图片。
6. sha1 用途：prepare 需要提供文件 SHA1 用于上传任务登记与幂等识别，服务端在 complete 阶段以 md5 与 COS 对象实际 ETag 比对为准。

← [消息类型](/wiki/develop/api-v2/server-inter/message/type/overview.html) [Markdown 消息](/wiki/develop/api-v2/server-inter/message/type/markdown.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区