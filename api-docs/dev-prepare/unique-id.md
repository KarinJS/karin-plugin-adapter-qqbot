# [#](#唯一身份机制) 唯一身份机制

不同的 `bot(AppID)` 获取到的用户 `openid`，群 `openid`，频道 `openid` 均不相同，若跨业务有关联用户身份需求，后续提供跨 `AppID` 绑定后，使用类似 `unionid` 的机制打通身份。

举例

* 不同 `bot` 在单聊场景，获取到的用户唯一识别 `openid` 不一样，称为 `user_openid`
* 不同 `bot` 在群聊场景，获取到的群唯一识别号 `openid` 不一样，称为 `group_openid`
* 相同 `bot` 在不同的群，获取到同一个用户在群内的唯一识别号 `openid` 不一样，称为 `member_openid`

← [事件订阅与通知](/wiki/develop/api-v2/dev-prepare/interface-framework/event-emit.html) [openapi](/wiki/develop/api-v2/dev-prepare/error-trace/openapi.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区