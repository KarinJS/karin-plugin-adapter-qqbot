# [#](#成员对象-member) 成员对象(Member)

## [#](#member) Member

|字段名|类型|描述|
|---|---|---|
|user|[User](/wiki/develop/api-v2/server-inter/channel/manage/user/model.html#user)|用户的频道基础信息，只有成员相关接口中会填充此信息|
|nick|string|用户的昵称|
|roles|string 数组|用户在频道内的身份组ID, 默认值可参考[DefaultRoles](/wiki/develop/api-v2/server-inter/channel/role/member/role_model.html#DefaultRoles)|
|joined\_at|ISO8601 timestamp|用户加入频道的时间|

## [#](#memberwithguildid) MemberWithGuildID

|字段名|类型|描述|
|---|---|---|
|guild\_id|string|频道id|
|user|[User](/wiki/develop/api-v2/server-inter/channel/manage/user/model.html#user)|用户的频道基础信息|
|nick|string|用户的昵称|
|roles|string 数组|用户在频道内的身份|
|joined\_at|ISO8601 timestamp|用户加入频道的时间|

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区