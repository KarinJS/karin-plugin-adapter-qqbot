# [#](#表情表态对象) 表情表态对象

### [#](#messagereaction) MessageReaction

|字段名|类型|描述|
|---|---|---|
|user\_id|string|用户ID|
|guild\_id|string|频道ID|
|channel\_id|string|子频道ID|
|target|ReactionTarget|表态对象|
|emoji|[Emoji](/wiki/develop/api-v2/openapi/emoji/model.html#Emoji)|表态所用表情|

### [#](#reactiontarget) ReactionTarget

|字段名|类型|描述|
|---|---|---|
|id|string|表态对象ID|
|type|ReactionTargetType|表态对象类型，参考 ReactionTargetType|

### [#](#reactiontargettype) ReactionTargetType

|值|描述|
|---|---|
|0|消息|
|1|帖子|
|2|评论|
|3|回复|

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区