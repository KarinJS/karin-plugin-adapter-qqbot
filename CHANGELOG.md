# Changelog

## [2.2.0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/adapter-qqbot-v2.1.0...adapter-qqbot-v2.2.0) (2026-07-09)


### Features

* Refactor QQBot configuration to support proxy settings ([#48](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/48)) ([ddce181](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/ddce18193c7d903be20039c48081cf1de7e6165a))

## [2.1.0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/adapter-qqbot-v2.0.0...adapter-qqbot-v2.1.0) (2026-06-30)


### Features

* **storage:** 实现基于SQLite后端的消息缓存 ([#46](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/46)) ([8031e03](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/8031e03b4fbe9d0e9215753cfd814ece27cb0b79))
* 支持`群成员加入`和`群成员退出`事件 ([16130cd](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/16130cd008108095c65d91aabad21c60db1a5519))
* 群全量事件添加发送者身份 ([16130cd](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/16130cd008108095c65d91aabad21c60db1a5519))


### Bug Fixes

* update readme ([16130cd](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/16130cd008108095c65d91aabad21c60db1a5519))
* 单聊中同一 `msg_id` 最多发送四次被动回复 ([16130cd](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/16130cd008108095c65d91aabad21c60db1a5519))

## [2.0.0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/adapter-qqbot-v1.3.1...adapter-qqbot-v2.0.0) (2026-05-30)


### Features

* 2.0 完整重写 ([#43](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/43)) ([ba2c0ca](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/ba2c0ca759bcb880ed77c338c94c0b7397907e81))
* getAvatarUrl() ([#12](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/12)) ([5f04a5e](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/5f04a5ebc5eed6d24dc8266b70cbafdc24e7d01d))
* try to support BotConfig.regex ([#8](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/8)) ([35c5e24](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/35c5e24e22c5b4a4e773d2d76aebb4b0531bb9b1))
* 适配`1.8.0` ([f6bff5c](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/f6bff5c70fcce8c2cb1bd3fa5257d05166563dcc))


### Bug Fixes

* build ([577e514](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/577e5148b6f729c5b2e98d954bb19ef853547648))
* build error ([176054c](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/176054c9b39e819962c3c01f536d305831a63850))
* build error ([4378c9f](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/4378c9f87f115da9041daeb70d1213659bb0f0d2))
* build error ([1ec7419](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/1ec7419a5b1ba0e9469cadc71cd3f49ef87ecb60))
* build error ([a1da77d](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/a1da77d9256c6d4a24fb8cb0f20c878c88cf43e4))
* build error ([5d2d91d](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/5d2d91d6f40a39ed9a1e56cba779bcb6d37f57fe))
* button e ([d045c30](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/d045c306c9fbefe2df7641ca8ccfc86e61351a4d))
* ci ([54c1557](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/54c1557bb144c3d13dbdba7058ff516937f920f3))
* ci ([9958ac1](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/9958ac1c121756552c733df6284f49ab37714610))
* dirname error ([52f5897](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/52f589722a525edaaf2ef9c197545e6a27c7866a))
* getGroupAvatarUrl name ([7c98c13](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/7c98c134b30c8098843d96aa6d3b2b8295bcb3dd))
* lock.yaml ([8d76d4e](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/8d76d4e737d1212fdfcbab2c3d226a4178c48d94))
* reply seq ([af824e1](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/af824e13389cab2bbfb0fe0561d06c76bed3ae03))
* text message send ([#15](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/15)) ([8c50d55](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/8c50d55c9232a3dd88cf9c36372def358d279974))
* token ([4b1f0f5](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/4b1f0f584d8018235845f617657f58cc5a295884))
* type of reg can't be string ([#22](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/22)) ([e5ea5fd](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/e5ea5fd512c1649d4ff5b7dbc67288aa15790bbf))
* web.config ([92bf606](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/92bf606b064fa0cf1eed658cd71f2a25a9470dff))
* 优化直接发送模式的图文混排 ([#32](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/32)) ([9aab4d0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/9aab4d051fe4a69ee9bce2cd3fab4a3ac1dfdbd7))
* 修复构建 ([#33](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/33)) ([2dd9d4a](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/2dd9d4a95506656476639fe7a5d5b95e472f2eb5))
* 修正adapter.id ([#29](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/29)) ([f3a52be](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/f3a52be8fb79a991cebdaacd38c65bf651305df8))
* 修正c2c下没去掉at ([117f223](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/117f223bb9ee01dc1644decbf79c7daefcf3f075))
* 修正断开连接收监听不到事件 跟随上游 ([3ce38b3](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/3ce38b3e9613d715ee745fac5c6128efa1ae45d9))
* 发版 ([#36](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/36)) ([ab24c78](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/ab24c78c07560927e4444e73f1c5219007b27b70))
* 支持撤回消息 ([#28](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/28)) ([03d5d4e](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/03d5d4eca59485b71651c933c60e27f9e238251b))
* 更新ci ([40738e4](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/40738e415ee81a18b87773cb33675585eac6765f))
* 补充说明 ([ce9bbe3](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/ce9bbe36a6faea5fa10da22389dffe7c8870d2de))
* 适配`segment.button` 和 `segment.keyboard` ([66001a0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/66001a02baf85859f855cfbe6204236210196c84))

## [2.0.0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.3.1...v2.0.0)

完整重写。对齐 QQ 开放平台 2026 年起的新事件协议与 Markdown / Keyboard 全量开放后的发送方式。

### ⚠ BREAKING CHANGES

- **配置结构**：
  - 移除 `markdown.mode`（模板模式 2/3/4/5 全部废弃）
  - 新增 `markdown.enable`（boolean）控制是否自动 markdown 化
  - 新增 `keyboard.enable`（boolean）控制 URL 是否自动转 keyboard 按钮
  - 移除 `event.wsUrl` / `event.wsToken`（中转方案已废弃，直连官方网关）
  - 不提供自动迁移：旧配置需手动改写或重新扫码
- **API 类**：`QQBotApi` 拆分为子模块门面
  - `super.messages.*`（sendFriendMsg / sendGroupMsg / sendChannelMsg / sendDmsMsg / recall）
  - `super.media.upload`
  - `super.interaction.ack`
  - `super.meta.getMe / createDms / getGateway`
  - `super.qq.{text,markdown,ark,media}` / `super.guild.{text,image,embed,ark,markdown}` 构造器
  - 旧 `QQdMsgOptions` / `GuildMsgOptions` 命名错别字已移除
- **适配器**：删除 `AdapterQQBotNormal` / `AdapterQQBotMarkdown` 二选一，合并为唯一 `AdapterQQBot`
- **事件类型**：`GroupMsgEvent.d` 新增 `mentions[]` / `message_scene` / `message_type` / `author.username` / `author.bot` / `author.union_openid`；`C2CMsgEvent.d` 同步对齐
- **删除模板**：`Markdown` / `Keyboard` 类型移除模板分支（`custom_template_id` / 模板 `id`）

### Features

- 完整支持 `GROUP_MESSAGE_CREATE` 群聊全量消息事件，通过 `mentions[].is_you` 判断是否补 self-at（与 `GROUP_AT_MESSAGE_CREATE` 共用 handler）
- WebSocket 接入层重写，**支持 Resume**：断网时携带 `session_id` / `seq` 通过 `op:6` 恢复，服务端拒绝时降级 Identify；指数退避 `1.5s × 2^n + jitter`，上限 30s
- 完整接入 `INTERACTION_CREATE`：自动 `PUT /interactions/{id}` ack 防止客户端 loading，按 `chat_type` 借道 group/friend/guild message 事件投递业务层
- 双发送通道：`含 segment.markdown / markdown.enable=true 且无视频语音` → markdown 通道；其余 → 经典通道
- 二维码扫码登录拆分为 `crypto / portal / qr / index` 子模块，错误日志统一走 logger
- intents 自动探测：从最大权限位（含 `GROUP_AND_C2C_EVENT` / `PUBLIC_GUILD_MESSAGES` / `DIRECT_MESSAGE` 等）逐级回退到可用集合，仅打一次汇总日志
- 被动消息 `event_id` 按官方场景白名单校验
- 频道场景图片上传支持 FormData 与 URL 双路径
- 新事件 `author.username` 写入 `sender.nick`，业务层可拿到群昵称

### Bug Fixes

- 修复 access_token 刷新内存泄漏：旧实现 setTimeout 句柄未保留，bot 销毁后定时器仍在跑、同 appId 重复初始化产生并发刷新链；新增 `stopTokenRefresh(appId)` 并在 `destroyBot` 统一清理
- 修复 webhook `op:13` 路径下用 finally 状态机控制响应的混乱逻辑
- 修复重连未传入 `session_id` / `seq` 导致每次都是全新 Identify（Resume 形同虚设）

### Refactor

- `core/api/` 按职能拆分（http / messages / media / interaction / meta / builders）
- `core/adapter/` 拆为 `base / grouping / pipeline-qq / pipeline-guild / text-to-md`
- `core/event/` 抽出 `dispatcher.ts`，分发逻辑与具体 handler 分离
- `core/onboard/` 拆为 `crypto / portal / qr / index`
- `connection/` 抽 `transport.ts` 事件总线；`ws/` 拆 `client / intents / manager`
- 删除 `core/internal/sign.ts` 重复实现，签名校验合并到 `core/api/sign.ts`
- `utils/` 移除 `event` / `silkEncode` / `textToButton` / `escapeMarkdown` / `expressStack` 等死代码
- 删除 `types/ws.ts`（中转方案）、`utils/dir.ts`（仅一行 re-export）

### Docs

- README 重写：删除模板 markdown 相关章节，新增双通道决策、Resume 行为、INTERACTION 接入、新版 GROUP_MESSAGE_CREATE 报文解读
- 新增 `plan/` 目录：13 篇 2.0 重写路线图文档

## [1.3.1](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.3.0...v1.3.1) (2025-11-03)


### Bug Fixes

* 更新ci ([40738e4](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/40738e415ee81a18b87773cb33675585eac6765f))

## [1.3.0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.10...v1.3.0) (2025-11-03)


### Features

* 适配`1.8.0` ([f6bff5c](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/f6bff5c70fcce8c2cb1bd3fa5257d05166563dcc))


### Bug Fixes

* build ([577e514](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/577e5148b6f729c5b2e98d954bb19ef853547648))
* lock.yaml ([8d76d4e](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/8d76d4e737d1212fdfcbab2c3d226a4178c48d94))
* token ([4b1f0f5](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/4b1f0f584d8018235845f617657f58cc5a295884))
* web.config ([92bf606](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/92bf606b064fa0cf1eed658cd71f2a25a9470dff))

## [1.2.10](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.9...v1.2.10) (2025-05-03)


### Bug Fixes

* 发版 ([#36](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/36)) ([ab24c78](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/ab24c78c07560927e4444e73f1c5219007b27b70))

## [1.2.9](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.8...v1.2.9) (2024-11-17)


### Bug Fixes

* 优化直接发送模式的图文混排 ([#32](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/32)) ([9aab4d0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/9aab4d051fe4a69ee9bce2cd3fab4a3ac1dfdbd7))
* 修复构建 ([#33](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/33)) ([2dd9d4a](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/2dd9d4a95506656476639fe7a5d5b95e472f2eb5))
* 修正adapter.id ([#29](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/29)) ([f3a52be](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/f3a52be8fb79a991cebdaacd38c65bf651305df8))
* 支持撤回消息 ([#28](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/28)) ([03d5d4e](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/03d5d4eca59485b71651c933c60e27f9e238251b))

## [1.2.8](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.7...v1.2.8) (2024-09-15)


### Bug Fixes

* button e ([d045c30](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/d045c306c9fbefe2df7641ca8ccfc86e61351a4d))

## [1.2.7](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.6...v1.2.7) (2024-09-15)


### Bug Fixes

* 适配`segment.button` 和 `segment.keyboard` ([66001a0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/66001a02baf85859f855cfbe6204236210196c84))

## [1.2.6](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.5...v1.2.6) (2024-08-30)


### Bug Fixes

* type of reg can't be string ([#22](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/22)) ([e5ea5fd](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/e5ea5fd512c1649d4ff5b7dbc67288aa15790bbf))

## [1.2.5](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.4...v1.2.5) (2024-08-25)


### Bug Fixes

* getGroupAvatarUrl name ([7c98c13](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/7c98c134b30c8098843d96aa6d3b2b8295bcb3dd))

## [1.2.4](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.3...v1.2.4) (2024-08-17)


### Bug Fixes

* 修正c2c下没去掉at ([117f223](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/117f223bb9ee01dc1644decbf79c7daefcf3f075))

## [1.2.3](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.2...v1.2.3) (2024-08-16)


### Bug Fixes

* build error ([176054c](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/176054c9b39e819962c3c01f536d305831a63850))

## [1.2.2](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.1...v1.2.2) (2024-08-16)


### Bug Fixes

* ci ([9958ac1](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/9958ac1c121756552c733df6284f49ab37714610))
* 修正断开连接收监听不到事件 跟随上游 ([3ce38b3](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/3ce38b3e9613d715ee745fac5c6128efa1ae45d9))

## [1.2.1](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.2.0...v1.2.1) (2024-08-15)


### Bug Fixes

* build error ([4378c9f](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/4378c9f87f115da9041daeb70d1213659bb0f0d2))
* build error ([1ec7419](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/1ec7419a5b1ba0e9469cadc71cd3f49ef87ecb60))
* text message send ([#15](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/15)) ([8c50d55](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/8c50d55c9232a3dd88cf9c36372def358d279974))

## [1.2.0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.1.1...v1.2.0) (2024-08-15)


### Features

* getAvatarUrl() ([#12](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/12)) ([5f04a5e](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/5f04a5ebc5eed6d24dc8266b70cbafdc24e7d01d))


### Bug Fixes

* reply seq ([af824e1](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/af824e13389cab2bbfb0fe0561d06c76bed3ae03))

## [1.1.1](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.1.0...v1.1.1) (2024-08-15)


### Bug Fixes

* build error ([a1da77d](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/a1da77d9256c6d4a24fb8cb0f20c878c88cf43e4))

## [1.1.0](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.0.2...v1.1.0) (2024-08-15)


### Features

* try to support BotConfig.regex ([#8](https://github.com/KarinJS/karin-plugin-adapter-qqbot/issues/8)) ([35c5e24](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/35c5e24e22c5b4a4e773d2d76aebb4b0531bb9b1))

## [1.0.2](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.0.1...v1.0.2) (2024-08-09)


### Bug Fixes

* dirname error ([52f5897](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/52f589722a525edaaf2ef9c197545e6a27c7866a))

## [1.0.1](https://github.com/KarinJS/karin-plugin-adapter-qqbot/compare/v1.0.0...v1.0.1) (2024-08-09)


### Bug Fixes

* build error ([5d2d91d](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/5d2d91d6f40a39ed9a1e56cba779bcb6d37f57fe))

## 1.0.0 (2024-08-09)


### Bug Fixes

* 补充说明 ([ce9bbe3](https://github.com/KarinJS/karin-plugin-adapter-qqbot/commit/ce9bbe36a6faea5fa10da22389dffe7c8870d2de))
