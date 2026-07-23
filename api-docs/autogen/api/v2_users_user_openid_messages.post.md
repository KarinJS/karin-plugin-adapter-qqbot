# [#](#发送单聊消息) 发送单聊消息

向指定用户发送私聊消息。

* 被动消息有效时间 **60 分钟**，每个消息最多回复 **4 次**
* 主动消息频控规则
  * Bot 维度（发送方）：企业认证/个人身份证认证 **10/qps**；未认证 **5/qps** 且 **30/qpm**
  * 单关系维度（接收方）：**20/qpm**，每个好友 1 天最多接收 **1000** 条

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/users/{user\_openid}/messages|
|HTTP Method|POST|
|接口频率限制|100 QPS|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|user\_openid|string|是|用户 OpenID|

## [#](#请求体) 请求体

|名称|类型|必填|描述|
|---|---|---|---|
|msg\_type|integer|否|消息类型。决定哪个内容字段生效: 0=纯文本(content) 2=Markdown(markdown) 3=ARK(ark) 6=输入中状态（input\_notify) 7=富媒体(media)|
|content|string|否|文本内容。msg\_type=0 时为全文 注意: 传了 markdown 后此字段必须为空|
|markdown|[MessageMarkdown](#schema-messagemarkdown)|否|Markdown 消息。msg\_type=2 时必填 注意: 填写此字段后 content/ark 必须全为空|
|ark|[MessageArk](#schema-messageark)|否|结构化卡片消息。msg\_type=3 时填写，未对外开放，需要申请白名单|
|keyboard|[Keyboard](#schema-keyboard)|否|内嵌键盘。短形式只传 id，长形式传 content.rows|
|msg\_id|string|否|被动回复的消息 ID。从 C2C\_MESSAGE\_CREATE 等事件的 d.id 获取，5 分钟内有效|
|event\_id|string|否|被动回复的事件 ID。从事件最外层的id获取。与 msg\_id 二选一，支持事件："INTERACTION\_CREATE"、"C2C\_MSG\_RECEIVE"、"FRIEND\_ADD"|
|msg\_seq|integer|否|回复消息的序号，与 msg\_id 联合使用，避免相同消息 id 回复重复发送，不填默认是 1。相同的 msg\_id + msg\_seq 重复发送会失败。|
|media|[MediaInfo](#schema-mediainfo)|否|富媒体消息。msg\_type=7 时填写，file\_info 来自 /v2/groups/{group\_openid}/files|
|message\_reference|[MessageReference](#schema-messagereference)|否|引用回复。填写后以引用形式展示，关联上下文|
|is\_wakeup|boolean|否|指明发送消息为互动召回消息，与 msg\_id，event\_id 互斥使用|
|stream|[Stream](#schema-stream)|否|流式消息参数。设置后以流式方式下发消息，用于分片输出长文本回答。|

**MessageMarkdown**

|名称|类型|必填|描述|
|---|---|---|---|
|template\_id|integer|否|【已废弃】平台 Markdown 模板 ID。使用模板时填写，非模板不传|
|content|string|否|Markdown 内容。支持的格式参考文档：[Markdown(opens new window)](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/message/type/markdown.html)|
|custom\_template\_id|string|否|【已废弃】自定义模板 ID，与 template\_id 二选一|

**MessageArk**

|名称|类型|必填|描述|
|---|---|---|---|
|template\_id|integer|否|结构化消息ID|
|kv|\[\][MessageArkKv](#schema-messagearkkv)|否|模板参数|

**MessageArkKv**

|名称|类型|必填|描述|
|---|---|---|---|
|key|string|否|模板参数的Key|
|value|string|否|模板参数的Value|
|obj|\[\][MessageArkObj](#schema-messagearkobj)|否|嵌套对象|

**MessageArkObj**

|名称|类型|必填|描述|
|---|---|---|---|
|obj\_kv|\[\][MessageArkObjKv](#schema-messagearkobjkv)|否|嵌套的模板参数|

**MessageArkObjKv**

|名称|类型|必填|描述|
|---|---|---|---|
|key|string|否|模板参数的Key|
|value|string|否|模板参数的Value|

**Keyboard**

|名称|类型|必填|描述|
|---|---|---|---|
|id|string|否|内嵌键盘模板 ID。使用平台预设模板时填写此字段|
|content|[KeyboardContent](#schema-keyboardcontent)|否|自定义键盘布局。与 id 互斥，用于自定义按钮|

**KeyboardContent**

|名称|类型|必填|描述|
|---|---|---|---|
|rows|\[\][Row](#schema-row)|否|按钮行列表|

**Row**

|名称|类型|必填|描述|
|---|---|---|---|
|buttons|\[\][Button](#schema-button)|否|行内按钮，从左到右排列|

**Button**

|名称|类型|必填|描述|
|---|---|---|---|
|id|string|否|按钮 ID。同一键盘内唯一|
|render\_data|[RenderData](#schema-renderdata)|否|按钮渲染|
|action|[Action](#schema-action)|否|按钮点击行为|

**RenderData**

|名称|类型|必填|描述|
|---|---|---|---|
|label|string|否|按钮文字，最多 10 字符|
|visited\_label|string|否|点击后文字，不传则保持不变|
|style|integer|否|0=灰线框, 1=蓝线框, 2=白字, 3=蓝底白字|

**Action**

|名称|类型|必填|描述|
|---|---|---|---|
|type|integer|否|0：跳转按钮：http 或 小程序 1：回调按钮：回调后台接口, data 传给后台， 2：指令按钮：自动在输入框插入 @bot data|
|permission|[Permission](#schema-permission)|否|操作权限|
|data|string|否|回调数据。type=1/2 时必填|
|click\_limit|integer|否|【已废弃】可点击次数限制。0=无限|
|unsupport\_tips|string|否|版本过低时提示文案|
|enter|boolean|否|指令按钮可用，点击按钮后直接自动发送 data，仅单聊可用，默认 false。支持版本 8983|
|reply|boolean|否|指令按钮可用，指令是否带引用回复本消息，默认 false。支持版本 8983|
|anchor|integer|否|本字段仅在指令按钮下有效，设置后后会忽略 action.enter 配置。 设置为 1 时 ，点击按钮自动唤起启手Q选图器，其他值暂无效果。 （仅支持手机端版本 8983+ 的单聊场景，桌面端不支持）|

**Permission**

|名称|类型|必填|描述|
|---|---|---|---|
|type|integer|否|0=指定用户, 1=管理员, 2=所有人|
|specify\_user\_ids|\[\]string|否|有权限的用户 id 的列表|
|specify\_role\_ids|\[\]string|否|有权限的身份组 id 的列表（仅频道可用）|

**MediaInfo**

|名称|类型|必填|描述|
|---|---|---|---|
|file\_info|string|否|文件数据。来自文件上传接口返回值|

**MessageReference**

|名称|类型|必填|描述|
|---|---|---|---|
|message\_id|string|否|被引用消息 ID|

**Stream**

|名称|类型|必填|描述|
|---|---|---|---|
|state|integer|否|流式消息状态。1-5 正文生成中，6-10 消息生成结束，11-15 交互消息生成中，16-20 交互消息生成结束。 0=未知状态，1=正文生成中，6=正文生成结束预留，9=正文开发者异常结束， 10=正文生成结束，11=引导消息生成中，16=引导消息结束预留， 19=引导消息开发者异常结束，20=引导消息生成结束|
|id|string|否|流式消息ID。第一条不用填写，第二条需要填写第一个分片返回的 msgID|
|index|integer|否|流式消息的序号，第一分片为0，向上递增|
|reset|boolean|否|重新生成流式消息标记。此参数只能用于流式消息分片还没有发送完成时， reset 时 index 需要从0开始，需要填写流式ID|

### [#](#请求示例) 请求示例

**文本消息 (msg\_type=0)**

```text
POST /v2/users/A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4/messages
{
  "content": "你好，欢迎使用机器人助手！",
  "msg_type": 0,
  "msg_id": "ROBOT1.0_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "msg_seq": 1
}
```

1  
2  
3  
4  
5  
6  
7

**Markdown 消息 (msg\_type=2)**

```text
POST /v2/users/A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4/messages
{
  "msg_type": 2,
  "markdown": {
    "content": "# 今日推荐\n\n**精选文章**\n> 知识就是力量，学习永无止境\n\n[点击查看详情](https://example.com)"
  },
  "keyboard": {
    "id": "1070001"
  },
  "msg_id": "ROBOT1.0_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "msg_seq": 1
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

**输入状态通知 (msg\_type=6)**

```text
POST /v2/users/A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4/messages
{
  "msg_type": 6,
  "input_notify": {
    "input_type": 1,
    "input_second": 60
  },
  "msg_id": "ROBOT1.0_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "msg_seq": 1
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

**富媒体消息 (msg\_type=7)**

```text
POST /v2/users/A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4/messages
{
  "msg_type": 7,
  "media": {
    "file_info": "AE86C5D3F0E14B238C656C0F6DD1D0479C"
  },
  "msg_id": "ROBOT1.0_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "msg_seq": 1
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

**流式 Markdown 消息 (msg\_type=2, stream)**

```text
POST /v2/users/A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4/messages
{
  "msg_type": 2,
  "markdown": {
    "content": "今天天气不错，"
  },
  "stream": {
    "state": 1,
    "index": 0
  },
  "msg_seq": 2,
  "event_id": "C2C_MESSAGE_CREATE:xxxxxxxxxxxx"
}

// 流式消息通过多次调用本接口实现，每次调用携带一个内容分片：
// 1. 首个分片: stream.state=1(TEXT_GENERATING), stream.index=0, 不传 stream.id
//    - API 返回的 id 即为 stream_id，后续所有分片必须携带此 id
// 2. 中间分片: stream.state=1(TEXT_GENERATING), stream.index 递增, stream.id 为首个分片返回的 id
//    - index 从 0 开始，每个分片递增 1（0, 1, 2, ...）
//    - 每个请求的 msg_seq 也必须递增，不能重复
// 3. 最后文本分片: stream.state=10(TEXT_END), stream.id 为首个分片返回的 id
//    - 标记文本内容输出结束，可同时携带 markdown 内容
//    - 如果不需要发送按钮，此分片即为流的最后一个分片
// 4. 如果需要发送按钮: stream.state=11, stream.id 为首个分片返回的 id, 携带 Keyboard 参数
//    - state=11 的分片可同时携带 markdown 内容和键盘按钮
//    - 发送按钮后，还需发送 stream.state=20 标记流式结束
//    - 完整流程: state=1(开始) → state=1(中间) → state=10(文本结束) → state=11(按钮) → state=20(流结束)
// markdown.content 为当前分片的增量内容（非全量拼接）
//    - 各分片的 content 会自动拼接，如分片1="你好"，分片2="我是AI"，最终显示="你好我是AI"
//    - 最后文本分片的 content 可传空字符串 ""

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

## [#](#响应) 响应

### [#](#响应体) 响应体

|名称|类型|描述|
|---|---|---|
|id|string|消息 ID，可用于后续撤回|
|timestamp|string|发送时间，RFC3339 东八区|
|ext\_info|[MessageExtInfo](#schema-messageextinfo)|扩展信息|

**MessageExtInfo**

|名称|类型|描述|
|---|---|---|
|ref\_idx|string|引用消息索引。对应消息时间ext里的msg\_idx与ref\_msg\_idx|

## [#](#响应示例) 响应示例

**消息发送成功**

```json
{
  "id": "ROBOT1.0_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "timestamp": "2026-07-21T10:30:00+08:00"
}
```

1  
2  
3  
4

**消息发送成功（含扩展信息）**

```json
{
  "id": "ROBOT1.0_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "timestamp": "2026-07-21T10:30:00+08:00",
  "ext_info": {
    "ref_idx": "REFIDX_xxxxxxxxxxxxxxxxxxxx=="
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

### [#](#错误码) 错误码

|错误码|描述|排查建议|
|---|---|---|
|22006|消息类型与内容不匹配|请检查msg\_type与content是否对应|
|50059|输入类型错误|请检查输入类型|
|304004|无权限使用该ARK模板|请先申请ARK模板权限|
|304061|消息内容无效|请检查消息格式是否符合要求|
|304062|订阅按钮数量达到上限|请减少按钮数量|
|304064|订阅消息未授权|请先引导用户授权订阅消息|
|304080|文件信息无效|请检查文件信息格式是否正确|
|304103|消息ID已过期，不能回复|请在收到消息后尽快回复|
|340067|获取机器人信息失败|请检查机器人状态|
|40034004|富媒体信息转存失败|请重试|
|40034005|回复消息msg\_id已过期|请在收到消息后尽快回复|
|40034006|消息内容违规|请修改消息内容后重试|
|40034008|markdown参数有空值|请确保所有Markdown参数都有值|
|40034009|markdown参数有换行符|请移除Markdown参数中的换行符|
|40034010|模版参数中不能含有markdown语法|请使用纯文本参数，不要包含Markdown语法|
|40034011|无效的markdown内容|请检查Markdown语法是否正确|
|40034016|流式消息msgtype不一致|流式消息的msgtype必须与首次一致|
|40034017|流式消息markdown分片需要换行符结束|请确保Markdown分片以换行符结束|
|40034018|流式消息已结束|请发起新的流式消息|
|40034019|流式引导已结束|请发起新的流式引导|
|40034020|同一流式消息发送超时|请缩短流式消息发送间隔|
|40034021|其他流式消息发送中|请等待当前流式消息完成后再发送|
|40034022|已开启新的流式消息|旧流式消息已结束，请使用新的流式消息|
|40034024|请求参数msg\_id无效或越权|请检查msg\_id是否正确|
|40034025|请求参数event\_id无效|请检查event\_id是否正确|
|40034026|请求参数event\_id已过期|请在收到事件后尽快回复|
|40034027|该事件不支持回复消息|请确认事件类型是否支持回复|
|40034029|内联键盘行/列超限|请减少键盘按钮数量|
|40034100|主动消息发送超过频控限制|请降低发送频率或等待配额恢复|
|40034105|主动消息发送失败，无权限|请检查机器人权限设置|
|40034106|消息不支持该指令类型|请检查消息指令类型|
|40034108|指令参数长度超限|请缩短指令参数|
|40034109|指令参数解析失败|请检查指令参数格式|
|40034122|召回消息已达区间上限|召回消息已达上限，无法继续召回|
|40034123|不支持召回消息|该消息不支持召回操作|
|40034124|markdown消息参数错误|请检查Markdown参数格式|
|40034127|无markdown模板权限|请先申请Markdown模板权限|
|40034128|被动回复时间或次数超限|请在收到事件后尽快回复|
|40054004|无好友关系|请先添加好友后再发送私信|
|40054005|消息被去重|请确保每次请求使用不同的msgseq值|
|40054006|验证好友关系失败|请重试|
|40054007|消息长度超限|请缩短消息内容|
|40054013|用户拒收消息|用户已拒收消息，无法发送|
|40054014|流式消息分片过长|请拆分为更小的分片发送|
|40054015|流式消息分片数超限|请减少分片数量|
|40054016|机器人已下线|请检查机器人状态|
|40054018|消息过长或异常|请缩短消息内容|
|50055002|消息发送异常，请稍后重试|请稍后重试|

← [消息收发概述](/wiki/develop/api-v2/server-inter/message/overview.html) [流式发送单聊消息](/wiki/develop/api-v2/autogen/api/v2_users_user_openid_stream_messages.post.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区