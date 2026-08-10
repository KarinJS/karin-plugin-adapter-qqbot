# [#](#变更记录) 变更记录

## [#](#_20260810) 20260810

### [#](#优化) 优化

* **接口调用域名统一**：所有接口调用域名统一为 `api.bot.qq.com`。

### [#](#新增) 新增

* **群消息 / C2C 消息**

  * 发送 Markdown 消息：新增可选参数 `force_verify_image_resource`。开启后，当图片资源转存失败时，将中断消息发送并返回失败（默认关闭，保持原有行为）。
* **群管理接口**

  * 新增**群禁言管理**相关接口：
    * 查询用户禁言状态
    * 设置用户禁言
  * 新增**入群申请审批**相关接口：
    * 拉取入群申请列表
    * 审批入群请求
  * 新增**入群自动审批策略**相关接口。
* **事件**

  * 新增用户入群申请事件。

← [获取频道和当前人信息](/wiki/develop/api-v2/server-inter/channel/miniapp/interface.html)

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区