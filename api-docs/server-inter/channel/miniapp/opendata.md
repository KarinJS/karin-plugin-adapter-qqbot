# [#](#开放数据域加密) 开放数据域加密

## [#](#背景) 背景

由于小程序没有用于跟平台接口进行后台鉴权使用的用户票据。 所以开发者在小程序前端鉴权会后，如果还需要将鉴权结果传递给自己的后台，做后台鉴权，这个时候在后台中需要机遇 session key 针对 rawData 进行签名验证来保证数据没有被篡改过。

## [#](#开放数据加密-参考文档) 开放数据加密-参考文档

https://q.qq.com/wiki/develop/game/frame/open-ability/signature.html

← [开放论坛事件对象(OpenForumEvent)](/wiki/develop/api-v2/server-inter/channel/content/forum/open_forum.html) [获取频道和当前人信息](/wiki/develop/api-v2/server-inter/channel/miniapp/interface.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区