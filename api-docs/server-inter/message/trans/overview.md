# [#](#消息交互概述) 消息交互概述

说明

在各种消息场景内，开发者可在消息体上实现自定义一些与用户的交互方式。

|消息按钮|文字链|
|---|---|
|![消息按钮](https://qq-ai.cdn-go.cn/web/bot-docs/-/v1.17.0/assets/img/message-btn.94002609.jpg)|![文字链](https://qq-ai.cdn-go.cn/web/bot-docs/-/v1.17.0/assets/img/text-chain.b2f9b0fb.jpg)|

## [#](#消息按钮互动流程) 消息按钮互动流程

消息按钮互动的整体流程如下：

1. **发送带按钮的消息**：机器人下发包含 `keyboard` 字段的消息，用户端看到消息底部挂载的按钮
2. **用户点击按钮**：平台推送 [`INTERACTION_CREATE`](/wiki/develop/api-v2/autogen/event/interaction_create.html) 事件给机器人
3. **机器人响应互动**：机器人调用 [PUT /interactions/{interaction\_id}](/wiki/develop/api-v2/autogen/api/interactions_interaction_id.put.html) 回复用户

### [#](#发送消息时携带-keyboard) 发送消息时携带 keyboard

在消息的 `keyboard` 字段中传入按钮配置，支持模板按钮和自定义按钮两种模式。

* 发送单聊消息：[keyboard 字段参考](/wiki/develop/api-v2/autogen/api/v2_users_user_openid_messages.post.html#schema-keyboard)
* 发送群聊消息：[keyboard 字段参考](/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_messages.post.html#schema-keyboard)

**按钮数据示例**（一处配置缓存一批按钮，动态提取生成行为按钮）：

```json
{
  "keyboard": {
    "id": "keyboard_id_xxx",
    "content": {
      "rows": [
        {
          "buttons": [
            {
              "id": "button_1",
              "render_data": {
                "label": "确认",
                "visited_label": "已确认",
                "style": 1
              },
              "action": {
                "type": 2,
                "permission": {
                  "type": 2,
                  "specify_role_ids": [],
                  "specify_user_ids": []
                },
                "click_limit": 1,
                "data": "/action_confirm",
                "at_bot_show_channel_list": false,
                "reply": true,
                "enter": true
              }
            }
          ]
        }
      ]
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

### [#](#响应互动) 响应互动

收到 `INTERACTION_CREATE` 事件后，需要在规定时间内调用 [PUT /interactions/{interaction\_id}](/wiki/develop/api-v2/autogen/api/interactions_interaction_id.put.html) 响应，否则会超时。

**响应超时时间**：指令回调类场景为 3 秒。建议收到事件后尽快响应，避免因超时导致用户侧无反馈。

← [群聊分片上传完成](/wiki/develop/api-v2/autogen/api/v2_groups_group_id_upload_part_finish.post.html) [互动事件](/wiki/develop/api-v2/autogen/event/interaction_create.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区