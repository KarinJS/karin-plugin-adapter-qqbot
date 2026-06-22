# [#](#_37-大图模板) 37 大图模板

### [#](#样式) 样式
![37](https://qq-ai.cdn-go.cn/web/bot-docs/-/v1.11.0/assets/img/37.2955062b.png)

模板 id=37。

### [#](#模板格式) 模板格式

```json
{
  "app": "com.tencent.imagetextbot",
  "view": "index",
  "ver": "1.0.0.11",
  "prompt": "#PROMPT#",
  "meta": {
    "robot": {
      "title": "#METATITLE#",
      "subtitle": "#METASUBTITLE#",
      "cover": "#METACOVER#",
      "jump_url": "#METAURL#"
    }
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

### [#](#字段描述) 字段描述

|字段名|类型|描述|
|:---|:---|:---|
|#PROMPT#|string|提示消息|
|#METATITLE#|string|标题|
|#METASUBTITLE#|string|子标题|
|#METACOVER#|string|大图，尺寸为 975\*540|
|#METAURL#|string|跳转链接|

#### [#](#请求示例) 请求示例

```json
{
  "ark": {
    "template_id": 37,
    "kv": [
      {
        "key": "#PROMPT#",
        "value": "通知提醒"
      },
      {
        "key": "#METATITLE#",
        "value": "标题"
      },
      {
        "key": "#METASUBTITLE#",
        "value": "子标题"
      },
      {
        "key": "#METACOVER#",
        "value": "https://vfiles.gtimg.cn/vupload/20211029/bf0ed01635493790634.jpg"
      },
      {
        "key": "#METAURL#",
        "value": "https://qq.com"
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
21  
22  
23  
24  
25  
26  
27

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区