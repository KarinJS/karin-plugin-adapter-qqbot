# [#](#子频道权限对象-channelpermissions) 子频道权限对象(ChannelPermissions)

## [#](#channelpermissions) ChannelPermissions

|字段名|类型|描述|
|---|---|---|
|channel\_id|string|子频道 id|
|user\_id/role\_id|string|用户 id 或 身份组 id，只会返回其中之一|
|[permissions](#Permissions)|string|用户拥有的子频道权限|

## [#](#permissions) Permissions

权限是QQ频道管理频道成员的一种方式，管理员可以对不同的人、不同的子频道设置特定的权限。用户的权限包括**个人权限**和**身份组权限**两部分，最终生效是取两种权限的并集。

权限使用位图表示，传递时序列化为十进制数值字符串。如权限值为`0x6FFF`，会被序列化为十进制`"28671"`。

|权限|值|描述|
|---|---|---|
|可查看子频道|0x0000000001 (1 << 0)|支持`指定成员`可见类型，支持`身份组`可见类型|
|可管理子频道|0x0000000002 (1 << 1)|创建者、管理员、子频道管理员都具有此权限|
|可发言子频道|0x0000000004 (1 << 2)|支持`指定成员`发言类型，支持`身份组`发言类型|

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区