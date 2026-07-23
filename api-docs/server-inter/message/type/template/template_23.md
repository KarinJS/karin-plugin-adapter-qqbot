# [#](#_23-链接-文本列表模板) 23 链接+文本列表模板

### [#](#样式) 样式
![23](https://qq-ai.cdn-go.cn/web/bot-docs/-/v1.14.0/assets/img/23.dcdba41f.png)

模板 id=23。

### [#](#模板格式) 模板格式

```json
{
  "app": "com.tencent.channel.robot",
  "view": "albumAddPic",
  "ver": "0.0.0.1",
  "desc": "#DESC#",
  "prompt": "[QQ小程序]#PROMPT#",
  "meta": {
    "detail": {
      "list": "#LIST#"
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

### [#](#字段描述) 字段描述

|字段名|类型|描述|
|:---|:---|:---|
|#DESC#|string|描述|
|#PROMPT#|string|提示消息|
|#LIST#|array|#LIST#数组|

### [#](#list-结构) #LIST# 结构

|字段名|类型|描述|
|:---|:---|:---|
|desc|string|文本内容|
|link|string|链接，需要提前报备，如果不填就显示为文本，如果填了就显示为链接|

#### [#](#请求示例) 请求示例

```json
{
  "ark": {
    "template_id": 23,
    "kv": [
      {
        "key": "#DESC#",
        "value": "descaaaaaa"
      },
      {
        "key": "#PROMPT#",
        "value": "promptaaaa"
      },
      {
        "key": "#LIST#",
        "obj": [
          {
            "obj_kv": [
              {
                "key": "desc",
                "value": "需求标题：UI问题解决"
              }
            ]
          },
          {
            "obj_kv": [
              {
                "key": "desc",
                "value": "当前状态\"体验中\"点击下列动作直接扭转状态到："
              }
            ]
          },
          {
            "obj_kv": [
              {
                "key": "desc",
                "value": "已评审"
              },
              {
                "key": "link",
                "value": "https://qun.qq.com"
              }
            ]
          },
          {
            "obj_kv": [
              {
                "key": "desc",
                "value": "已排期"
              },
              {
                "key": "link",
                "value": "https://qun.qq.com"
              }
            ]
          },
          {
            "obj_kv": [
              {
                "key": "desc",
                "value": "开发中"
              },
              {
                "key": "link",
                "value": "https://qun.qq.com"
              }
            ]
          },
          {
            "obj_kv": [
              {
                "key": "desc",
                "value": "增量测试中"
              },
              {
                "key": "link",
                "value": "https://qun.qq.com"
              }
            ]
          },
          {
            "obj_kv": [
              {
                "key": "desc",
                "value": "请关注"
              }
            ]
          }
        ]
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
39  
40  
41  
42  
43  
44  
45  
46  
47  
48  
49  
50  
51  
52  
53  
54  
55  
56  
57  
58  
59  
60  
61  
62  
63  
64  
65  
66  
67  
68  
69  
70  
71  
72  
73  
74  
75  
76  
77  
78  
79  
80  
81  
82  
83  
84  
85  
86  
87  
88  
89  
90  
91  
92

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区