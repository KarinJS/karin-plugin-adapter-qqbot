# [#](#自定义菜单与指令面板) 自定义菜单与指令面板

机器人可在单聊场景下配置**自定义菜单**，在单聊、群聊、文字子频道、频道私信场景下配置**指令面板**，帮助用户更便捷地发现和使用机器人能力。

|自定义菜单|指令面板|
|---|---|
|![自定义菜单](https://qq-ai.cdn-go.cn/web/bot-docs/-/v1.28.0/assets/img/custom-menu.674eb658.png)|![指令面板](https://qq-ai.cdn-go.cn/web/bot-docs/-/v1.28.0/assets/img/command-panel.4fde9574.png)|

## [#](#自定义菜单) 自定义菜单

自定义菜单展示在机器人单聊窗口底部，支持开关、发送消息、链接跳转、含子菜单的折叠项等按钮类型，设置后对所有用户生效。

相关接口：

* [查询全局自定义菜单](/wiki/develop/api-v2/autogen/api/v2_menu.get.html)
* [修改全局自定义菜单](/wiki/develop/api-v2/autogen/api/v2_menu.put.html)

## [#](#指令面板) 指令面板

指令面板以面板形式展示指令或链接，支持按 c2c（单聊）、group（群聊）、channel（文字子频道）、dm（频道私信）场景生效，并可指定用户/群生效。

相关接口：

* [查询指令面板列表](/wiki/develop/api-v2/autogen/api/v2_panels.get.html)
* [创建指令面板](/wiki/develop/api-v2/autogen/api/v2_panels.post.html)
* [查询指令面板详情](/wiki/develop/api-v2/autogen/api/v2_panels_panel_id.get.html)
* [修改指令面板](/wiki/develop/api-v2/autogen/api/v2_panels_panel_id.put.html)
* [删除指令面板](/wiki/develop/api-v2/autogen/api/v2_panels_panel_id.delete.html)
* [修改指令面板关联对象](/wiki/develop/api-v2/autogen/api/v2_panels_panel_id_target.put.html)

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区