# [#](#内嵌格式) 内嵌格式

### [#](#功能描述) 功能描述

利用 `content` 字段发送内嵌格式的消息。

* 内嵌格式仅在 `content` 中会生效，在 `Ark` 和 `Embed` 中不生效。
* 为了区分是文本还是内嵌格式，消息抄送和发送会对消息内容进行相关的转义，参考 [转义内容](#%E8%BD%AC%E4%B9%89%E5%86%85%E5%AE%B9)

### [#](#支持的格式) 支持的格式

|类型|结构|描述|示例|
|:---|:---|:---|:---|
|@用户|`<@user_id>` 或者 `<@!user_id>`|解析为 `@用户` 标签|`<@1234000000001>`|
|@所有人|`@everyone`|解析为 `@所有人` 标签，需要机器人拥有发送 `@所有人` 消息的权限|`@everyone`|
|#子频道|`<#channel_id>`|解析为 `#子频道` 标签，点击可以跳转至子频道，仅支持当前频道内的子频道|`<#12345>`|
|表情|`<emoji:id>`|解析为系统表情，具体表情id参考 [Emoji 列表](/wiki/develop/api-v2/openapi/emoji/model.html#Emoji列表)，仅支持type=1的系统表情，type=2的emoji表情直接按字符串填写即可|`<emoji:4>` 解析为得意情|

### [#](#转义内容) 转义内容

* 消息抄送会将源字符转为转义后内容然后抄送给机器人
* 发消息会将转义后字符转为源字符后抄再发

|源字符|转义后|
|---|---|
|&|&amp;|
|<|&lt;|
|>|&gt;|

### [#](#示例) 示例

请求数据包

```json
{
    "content":"<@!1234>hello world"
}
```

1  
2  
3

响应数据包

```json
{
  "id": "xxxxxx",
  "channel_id": "xxxxxx",
  "guild_id": "xxxxxx",
  "content": "<@!1234>hello world",
  "timestamp": "2021-05-13T14:45:45+08:00",
  "tts": false,
  "mention_everyone": false,
  "author": {
    "id": "xxxxxx",
    "username": "abc",
    "avatar": "",
    "bot": true
  },
  "embeds": [{}],
  "pinned": false,
  "type": 0,
  "flags": 0
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
15  
16  
17  
18  
19

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区