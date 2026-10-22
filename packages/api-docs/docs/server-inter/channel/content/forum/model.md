# [#](#论坛对象-forum) 论坛对象(forum)

## [#](#thread) Thread

* 话题频道内发表的主帖称为主题
* 该事件在话题频道内新发表主题或删除时生产事件中包含该对象

|字段名|类型|描述|
|---|---|---|
|guild\_id|string|频道ID|
|channel\_id|string|子频道ID|
|author\_id|string|作者ID|
|thread\_info|object|[ThreadInfo](#ThreadInfo) 主帖内容|

### [#](#threadinfo) ThreadInfo

* 帖子事件包含的主帖内容相关信息

|字段名|类型|描述|
|---|---|---|
|thread\_id|string|主帖ID|
|title|string|帖子标题|
|content|string|帖子内容|
|date\_time|ISO8601 timestamp|发表时间|

## [#](#post) Post

* 话题频道内对主题的评论称为帖子
* 话题频道内对帖子主题评论或删除时生产事件中包含该对象

|字段名|类型|描述|
|---|---|---|
|guild\_id|string|频道ID|
|channel\_id|string|子频道ID|
|author\_id|string|作者ID|
|post\_info|object|[PostInfo](#PostInfo) 帖子内容|

### [#](#postinfo) PostInfo

* 帖子事件包含的帖子内容信息

|字段名|类型|描述|
|---|---|---|
|thread\_id|string|主题ID|
|post\_id|string|帖子ID|
|content|string|帖子内容|
|date\_time|string|评论时间|

## [#](#reply) Reply

* 话题频道对帖子回复或删除时生产该事件中包含该对象
* 话题频道内对帖子的评论称为回复

|字段名|类型|描述|
|---|---|---|
|guild\_id|string|频道ID|
|channel\_id|string|子频道ID|
|author\_id|string|作者ID|
|reply\_info|object|[ReplyInfo](#ReplyInfo) 回复内容|

### [#](#replyinfo) ReplyInfo

* 回复事件包含的回复内容信息

|字段名|类型|描述|
|---|---|---|
|thread\_id|string|主题ID|
|post\_id|string|帖子ID|
|reply\_id|string|回复ID|
|content|string|回复内容|
|date\_time|string|回复时间|

### [#](#auditresult) AuditResult

* 论坛帖子审核结果事件

|字段名|类型|描述|
|---|---|---|
|guild\_id|string|频道ID|
|channel\_id|string|子频道ID|
|author\_id|string|作者ID|
|thread\_id|string|主题ID|
|post\_id|string|帖子ID|
|reply\_id|string|回复ID|
|type|uint32|[AuditType](#AuditType)审核的类型|
|result|uint32|审核结果. 0:成功 1:失败|
|err\_msg|string|result不为0时错误信息|

### [#](#audittype) AuditType

* 审核的类型

|字段名|值|描述|
|---|---|---|
|PUBLISH\_THREAD|1|帖子|
|PUBLISH\_POST|2|评论|
|PUBLISH\_REPLY|3|回复|

### [#](#richobject) RichObject

* 富文本内容

|字段|类型|描述|
|---|---|---|
|type|int|[RichType](#RichType) 富文本类型|
|text\_info|object|[TextInfo](#TextInfo) 文本|
|at\_info|object|[AtInfo](#AtInfo) @ 内容|
|url\_info|object|[URLInfo](#URLInfo) 链接|
|emoji\_info|object|[EmojiInfo](#EmojiInfo) 表情|
|channel\_info|object|[ChannelInfo](#ChannelInfo) 提到的子频道|

#### [#](#richtype) RichType

* 富文本类型

|字段名|值|描述|
|---|---|---|
|TEXT|1|普通文本|
|AT|2|at信息|
|URL|3|url信息|
|EMOJI|4|表情|
|CHANNEL|5|#子频道|
|VIDEO|10|视频|
|IMAGE|11|图片|

#### [#](#textinfo) TextInfo

* 富文本 - 普通文本

|字段|类型|描述|
|---|---|---|
|text|string|普通文本|

#### [#](#atinfo) AtInfo

* 富文本 - @内容

|字段|类型|描述|
|---|---|---|
|type|[AtType](#AtType)|at类型|
|user\_info|[AtUserInfo](#AtUserInfo)|用户|
|role\_info|[AtRoleInfo](#AtRoleInfo)|角色组信息|
|guild\_info|[AtGuildInfo](#AtGuildInfo)|频道信息|

##### [#](#attype) AtType

* @的类型

|字段名|值|描述|
|---|---|---|
|AT\_EXPLICIT\_USER|1|at特定人|
|AT\_ROLE\_GROUP|2|at角色组所有人|
|AT\_GUILD|3|at频道所有人|

##### [#](#atuserinfo) AtUserInfo

* @用户信息

|字段|类型|描述|
|---|---|---|
|id|string|身份组ID|
|nick|string|用户昵称|

##### [#](#atroleinfo) AtRoleInfo

* @身份组信息

|字段|类型|描述|
|---|---|---|
|role\_id|uint64|身份组ID|
|name|string|身份组名称|
|color|uint32|颜色值|

##### [#](#atguildinfo) AtGuildInfo

* @频道信息

|字段|类型|描述|
|---|---|---|
|guild\_id|string|频道ID|
|guild\_name|string|频道名称|

#### [#](#urlinfo) URLInfo

* 富文本 - 链接信息

|字段|类型|描述|
|---|---|---|
|url|string|链接地址|
|display\_text|string|链接显示文本|

#### [#](#emojiinfo) EmojiInfo

* 富文本 - Emoji信息

|字段|类型|描述|
|---|---|---|
|id|string|表情id|
|type|string|表情类型|
|name|string|名称|
|url|string|链接|

#### [#](#channelinfo) ChannelInfo

* 富文本 - 子频道信息

|字段|类型|描述|
|---|---|---|
|channel\_id|uint64|子频道id|
|channel\_name|string|子频道名称|

### [#](#richtext) RichText

* 富文本内容

|字段|类型|描述|
|---|---|---|
|paragraphs|[Paragraph](#Paragraph)|段落，一段落一行，段落内无元素的为空行|

### [#](#paragraph) Paragraph

* 富文本 - 段落结构

|字段|类型|描述|
|---|---|---|
|elems|[Elem](#Elem)|元素列表|
|props|[ParagraphProps](#ParagraphProps)|段落属性|

### [#](#elem) Elem

* 富文本 - 元素列表结构

|字段|类型|描述|
|---|---|---|
|text|[TextElem](#TextElem)|文本元素|
|image|[ImageElem](#ImageElem)|图片元素|
|video|[VideoElem](#VideoElem)|视频元素|
|url|[URLElem](#URLElem)|URL元素|
|type|[ElemType](#ElemType)|元素类型|

##### [#](#elemtype) ElemType

* 元素类型

|字段名|值|描述|
|---|---|---|
|ELEM\_TYPE\_TEXT|1|文本|
|ELEM\_TYPE\_IMAGE|2|图片|
|ELEM\_TYPE\_VIDEO|3|视频|
|ELEM\_TYPE\_URL|4|URL|

### [#](#textelem) TextElem

* 富文本 - 文本属性

|字段|类型|描述|
|---|---|---|
|text|string|正文|
|props|[TextProps](#TextProps)|文本属性|

### [#](#textprops) TextProps

* 富文本 - 文本段落属性

|字段|类型|描述|
|---|---|---|
|font\_bold|bool|加粗|
|italic|bool|斜体|
|underline|bool|下划线|

### [#](#imageelem) ImageElem

* 富文本 - 图片属性

|字段|类型|描述|
|---|---|---|
|third\_url|string|第三方图片链接|
|width\_percent|double|宽度比例（缩放比，在屏幕里显示的比例）|

### [#](#platimage) PlatImage

* 富文本 - 平台图片属性

|字段|类型|描述|
|---|---|---|
|url|string|架平图片链接|
|width|uint32|图片宽度|
|height|uint32|图片高度|
|image\_id|string|图片ID|

### [#](#videoelem) VideoElem

* 富文本 - 视频属性

|字段|类型|描述|
|---|---|---|
|third\_url|string|第三方视频文件链接|

### [#](#platvideo) PlatVideo

* 富文本 - 平台视频属性

|字段|类型|描述|
|---|---|---|
|url|string|架平图片链接|
|width|uint32|图片宽度|
|height|uint32|图片高度|
|video\_id|string|视频ID|
|duration|uint32|视频时长|
|cover|[PlatImage](#PlatImage)|视频封面图属性|

### [#](#urlelem) URLElem

* 富文本 - URL属性

|字段|类型|描述|
|---|---|---|
|url|string|URL链接|
|desc|string|URL描述|

### [#](#paragraphprops) ParagraphProps

* 富文本 - 段落属性

|字段|类型|描述|
|---|---|---|
|alignment|int32|段落对齐方向属性，数值可以参考[Alignment](#Alignment)|

##### [#](#alignment) Alignment

* 段落对齐方向属性

|字段名|值|描述|
|---|---|---|
|ALIGNMENT\_LEFT|0|左对齐|
|ALIGNMENT\_MIDDLE|1|居中|
|ALIGNMENT\_RIGHT|2|右对齐|

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区