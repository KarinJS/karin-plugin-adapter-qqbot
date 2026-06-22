# [#](#消息按钮) 消息按钮

说明

在 markdown 消息的基础上，支持消息最底部挂载按钮。 （markdown 需要必填内容，不支持仅下发键盘消息）

## [#](#发送方式) 发送方式

2026/04/23 能力更新说明

单聊场景、群聊场景自定义按钮能力已开放使用，无需单独申请按钮模版，频道场景目前需要内邀开通。

```json
{
    "keyboard": {
        "content": {
            "rows": [
                {"buttons": [{button}, {button}, {button}, {button}, {button}]},
                {"buttons": [{button}, {button}, {button}, {button}, {button}]},
                {"buttons": [{button}, {button}, {button}, {button}, {button}]},
                {"buttons": [{button}, {button}, {button}, {button}, {button}]},
                {"buttons": [{button}, {button}, {button}, {button}, {button}]},
            ] // 自定义按钮内容，最多可以发送5行按钮，每一行最多5个按钮。
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

按钮模版，通过管理端申请获得模版ID，按钮模版暂时不支持使用变量填充。

```json
{
    "keyboard": {
        "id": "123" // 申请模版后获得
    }
}
```

1  
2  
3  
4  
5

## [#](#数据结构与协议) 数据结构与协议

消息发送接口 keyboard 字段值是一个 Json Object {}，rows 数组的每个元素表示每一行按钮

每个 button 是一个 Json Object，具体字段如下：

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|id|string|否|按钮ID：在一个 keyboard 消息内设置唯一|
|render\_data.label|string|是|按钮上的文字|
|render\_data.visited\_label|string|是|点击后按钮的上文字|
|render\_data.style|int|是|按钮样式：0 灰色线框，1 蓝色线框|
|action.type|int|是|设置 0 跳转按钮：http 或 小程序 客户端识别 scheme，设置 1 回调按钮：回调后台接口, data 传给后台，设置 2 指令按钮：自动在输入框插入 @bot data|
|action.permission.type|int|是|0 指定用户可操作，1 仅管理者可操作，2 所有人可操作，3 指定身份组可操作（仅频道可用）|
|action.permission.specify\_user\_ids|array|否|有权限的用户 id 的列表|
|action.permission.specify\_role\_ids|array|否|有权限的身份组 id 的列表（仅频道可用）|
|action.data|string|是|操作相关的数据|
|action.reply|bool|否|指令按钮可用，指令是否带引用回复本消息，默认 false。支持版本 8983|
|action.enter|bool|否|指令按钮可用，点击按钮后直接自动发送 data，仅单聊可用，默认 false。支持版本 8983|
|action.anchor|int|否|本字段仅在指令按钮下有效，设置后后会忽略 action.enter 配置。<br />设置为 1 时 ，点击按钮自动唤起启手Q选图器，其他值暂无效果。<br />（仅支持手机端版本 8983+ 的单聊场景，桌面端不支持）|
|action.click\_limit|int|否|【已弃用】可操作点击的次数，默认不限|
|action.at\_bot\_show\_channel\_list|bool|否|【已弃用】指令按钮可用，弹出子频道选择器，默认 false|
|action.unsupport\_tips|string|是|客户端不支持本 action 的时候，弹出的 toast 文案|

示例

```json
{
  "rows": [
    {
      "buttons": [
        {
          "id": "1",
          "render_data": {
            "label": "⬅️上一页",
            "visited_label": "⬅️上一页"
          },
          "action": {
            "type": 1,
            "permission": {
              "type": 1,
              "specify_role_ids": [
                "1",
                "2",
                "3"
              ]
            },
            "click_limit": 10,
            "unsupport_tips": "兼容文本",
            "data": "data",
            "at_bot_show_channel_list": true
          }
        },
        {
          "id": "2",
          "render_data": {
            "label": "➡️下一页",
            "visited_label": "➡️下一页"
          },
          "action": {
            "type": 1,
            "permission": {
              "type": 1,
              "specify_role_ids": [
                "1",
                "2",
                "3"
              ]
            },
            "click_limit": 10,
            "unsupport_tips": "兼容文本",
            "data": "data",
            "at_bot_show_channel_list": true
          }
        }
      ]
    },
    {
      "buttons": [
        {
          "id": "3",
          "render_data": {
            "label": "📅 打卡（5）",
            "visited_label": "📅 打卡（5）"
          },
          "action": {
            "type": 1,
            "permission": {
              "type": 1,
              "specify_role_ids": [
                "1",
                "2",
                "3"
              ]
            },
            "click_limit": 10,
            "unsupport_tips": "兼容文本",
            "data": "data",
            "at_bot_show_channel_list": true
          }
        }
      ]
    }
  ]
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

## [#](#事件) 事件

### [#](#点击回调按钮) 点击回调按钮

* **基本概况**

||
|---|
|基本|
|intents|1<<26|
|事件类型|INTERACTION\_CREATE|
|触发场景|用户点击了消息体的回调按钮|
|推送方式|Websocket|

* **事件字段**

|**属性**|**类型**|**说明**|
|---|---|---|
|id|string|平台方事件 ID，可以用于被动消息发送|
|type|int|消息按钮： 11，单聊快捷菜单：12|
|scene|string|事件发生的场景：c2c、group、guild|
|chat\_type|int|0 频道场景，1 群聊场景，2 单聊场景|
|timestamp|string|触发时间 RFC 3339 格式|
|guild\_id|string|频道的 openid ，仅在频道场景提供该字段|
|channel\_id|string|文字子频道的 openid，仅在频道场景提供该字段|
|user\_openid|string|单聊单聊按钮触发x，的用户 openid，仅在单聊场景提供该字段|
|group\_openid|string|群的 openid，仅在群聊场景提供该字段|
|group\_member\_openid|string|按钮触发用户，群聊的群成员 openid，仅在群聊场景提供该字段|
|data.resoloved.button\_data|string|操作按钮的 data 字段值（在发送消息按钮时设置）|
|data.resoloved.button\_id|string|操作按钮的 id 字段值（在发送消息按钮时设置）|
|data.resoloved.user\_id|string|操作的用户 userid，仅频道场景提供该字段|
|data.resoloved.feature\_id|string|操作按钮的 id 字段值，仅自定义菜单提供该字段（在管理端设置）|
|data.resoloved.message\_id|string|操作的消息id，目前仅频道场景提供该字段|
|version|int|默认 1|

* **事件示例**

```json
// Websocket
{
    "chat_type": 2,
    "data": {
        "resolved": {
            "button_data": "回调按钮",
            "button_id": "21",
            "user_id": "E4F4AEA33253A2797FB897C50B81D7ED"
        },
        "type": 11
    },
    "id": "30540ff7-9d8f-4737-83f1-e116ce6afa8b",
    "type": 11,
    "version": 1

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

* **其他说明**

由于 websocket 推送事件是单向的，开发者收到事件之后，需要进行一次"回应"，告知QQ后台，事件已经收到，否则客户端会一直处于loading状态，直到超时。

回应的 openapi 接口如下：

* **请求**

||
|---|
|基本|
|HTTP URL|/interactions/{interaction\_id}|
|HTTP Method|PUT|

* **路径参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|interaction\_id|string|是|上述事件中获得。|

* **请求参数**

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|code|int|是|0 成功<br />1 操作失败<br />2 操作频繁<br />3 重复操作<br />4 没有权限<br />5 仅管理员操作|

* **返回参数**

成功返回空

* **错误码**

← [文本交互](/wiki/develop/api-v2/server-inter/message/trans/text-chain.html) [机器人链接](/wiki/develop/api-v2/server-inter/user/share_url.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区