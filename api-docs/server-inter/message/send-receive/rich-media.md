# [#](#富媒体消息) 富媒体消息

仅用于在QQ单聊和QQ群聊内，发送图片、视频、语音、文件富媒体消息时，需先调用以下上传接口后再发送。

## [#](#用于单聊) 用于单聊

* **请求**

||
|---|
|基本|
|HTTP URL|/v2/users/{openid}/files|
|HTTP Method|POST|

* **路径参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|openid|string|是|QQ 用户的 openid，可在各类事件中获得。|

* **请求参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|file\_type|int|是|媒体类型：1 图片（png/jpg）、2 视频（mp4）、3 语音（silk/wav/mp3/flac）、4 文件|
|url|string|是|需要发送媒体资源的url|
|file\_data||否|base64 二进制数据|

* **返回参数**

|**属性**|**类型**|**说明**|
|---|---|---|
|file\_uuid|string|文件 ID|
|file\_info|string|文件信息，用于发消息接口的 media 字段使用|
|ttl|int|有效期，表示剩余多少秒到期，到期后 file\_info 失效，当等于 0 时，表示可长期使用|

* **错误码**

## [#](#用于群聊) 用于群聊

* **请求**

||
|---|
|基本|
|HTTP URL|/v2/groups/{group\_openid}/files|
|HTTP Method|POST|

* **路径参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|group\_openid|string|是|群聊的 openid|

* **请求参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|file\_type|int|是|媒体类型：1 图片（png/jpg）、2 视频（mp4）、3 语音（silk/wav/mp3/flac）、4 文件|
|url|string|是|需要发送媒体资源的 url|
|file\_data||否|base64 二进制数据|

* **返回参数**

|**属性**|**类型**|**说明**|
|---|---|---|
|file\_uuid|string|文件 ID|
|file\_info|string|文件信息，用于发消息接口的 media 字段使用|
|ttl|int|有效期，表示剩余多少秒到期，到期后 file\_info 失效，当等于 0 时，表示可长期使用|

← [发送消息](/wiki/develop/api-v2/server-inter/message/send-receive/send.html) [撤回消息](/wiki/develop/api-v2/server-inter/message/send-receive/reset.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区