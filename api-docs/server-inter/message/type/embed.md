# [#](#embed-消息) Embed 消息

|**单聊**|**群聊**|**文字子频道**|**频道私信**|
|---|---|---|---|---|
|机器人接收|\-|\-|\-|\-|
|机器人发送|不支持|不支持|支持|支持|

## [#](#样式) 样式
![embed](https://qq-ai.cdn-go.cn/web/bot-docs/-/v1.7.0/images/api-231017/message-embed.jpg)
## [#](#数据结构与协议) 数据结构与协议

### [#](#content-type) Content-Type

```http
application/json
```

1

### [#](#参数) 参数

|字段名|类型|描述|
|---|---|---|
|embed|[MessageEmbed](/wiki/develop/api-v2/server-inter/message/template/model.html#messageembed)|embed 消息详情|

* 其中 embed.thumbnail 为选填，没有缩略图的可以不填。
* embed.fields.name 为文本。

### [#](#返回) 返回

返回[Message](/wiki/develop/api-v2/server-inter/message/template/model.html#message)对象。

### [#](#错误码) 错误码

详见[错误码](/wiki/develop/api-v2/openapi/error/error.html)。

### [#](#示例) 示例

请求数据包

```json
{
  "embed": {
    "title": "标题",
    "prompt": "消息通知",
    "thumbnail": {
      "url": "xxxxxx"
    },
    "fields": [
      {
        "name": "当前等级：黄金"
      },
      {
        "name": "之前等级：白银"
      },
      {
        "name": "😁继续努力"
      }
    ]
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
11  
12  
13  
14  
15  
16  
17  
18  
19  
20

返回包

```json
{
  "id": "xxxxxx",
  "channel_id": "xxxxxx",
  "guild_id": "xxxxxx",
  "timestamp": "2021-12-07T15:24:54+08:00",
  "tts": false,
  "mention_everyone": false,
  "author": {
    "id": "xxxxxx",
    "username": "abc",
    "avatar": "",
    "bot": true
  },
  "embeds": [
    {
      "title": "标题",
      "prompt": "xxxx",
      "description": "",
      "thumbnail": {
        "url": "xxxxxx"
      },
      "fields": [
        {
          "name": "当前等级：黄金"
        },
        {
          "name": "之前等级：白银"
        },
        {
          "name": "😁继续努力"
        }
      ]
    }
  ],
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
20  
21  
22  
23  
24  
25  
26  
27  
28  
29  
30  
31  
32  
33  
34  
35  
36  
37  
38

← [ARK 消息](/wiki/develop/api-v2/server-inter/message/type/ark.html) [表情表态](/wiki/develop/api-v2/server-inter/message/trans/emoji.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区