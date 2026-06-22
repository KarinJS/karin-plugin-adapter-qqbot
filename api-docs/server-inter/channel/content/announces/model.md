# [#](#公告对象-announces) 公告对象(Announces)

## [#](#announces) Announces

|字段名|类型|描述|
|---|---|---|
|guild\_id|string|频道 id|
|channel\_id|string|子频道 id|
|message\_id|string|消息 id|
|announces\_type|uint32|公告类别 0:成员公告 1:欢迎公告，默认成员公告|
|recommend\_channels|[RecommendChannel](#RecommendChannel) 数组|推荐子频道详情列表|

# [#](#推荐子频道对象-recommendchannel) 推荐子频道对象(RecommendChannel)

## [#](#recommendchannel) RecommendChannel

|字段名|类型|描述|
|:---|---|---|
|channel\_id|string|子频道 id|
|introduce|string|推荐语|

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区