# [#](#文本交互) 文本交互

说明

QQBot 提供文本消息的交互能力，当开发者使用指定的格式发送消息，用户即可在消息体上进行点击交互操作，例如@某人，跳转链接等。

## [#](#使用-能力) 使用 @ 能力

说明

群聊&文字子频道，支持含有文本文字的消息类型，如：文本消息、图文消息、markdown 消息。

1. @某人｜群聊、文字子频道可用

嵌入文本使用格式：`<qqbot-at-user id="" />` 协议：`<@userid>`即将弃用，请使用上述最新格式。

客户端展示为： <font>@用户</font> 标签

2. @全部成员｜仅在文字子频道可用

嵌入文本使用格式：`<qqbot-at-everyone />` 协议：`@everyone`即将弃用，请使用上述最新格式。

客户端展示为： <font>@全部成员</font> 标签，需要机器人拥有发送 <font>@全部成员</font> 消息的权限，

## [#](#指令操作) 指令操作

目前仅在 markdown 支持。

**1\. 回车指令格式（点击后，文本直接发送）**

嵌入文本使用格式：

`<qqbot-cmd-enter text="xxx" />`

客户端展示为： <font>/回车指令</font> 用户可点击的标签，群聊和文字子频道不支持该能力。

* `text` 用户点击后直接发送的文本，参数必填，最大限制 100 字符，传值时需要 urlencode。

**2\. 参数指令格式（点击后，文本插入输入框，用户自行编辑发送）**

嵌入文本使用格式：

`<qqbot-cmd-input text="xxx" show="xxx" reference="false" />`

客户端展示为： <font>/参数指令</font> 用户可点击的标签

* `text` 用户点击后插入输入框的文本，参数必填，最大限制 100 字符，传值时需要 urlencode。
* `show` 用户在消息内看到的文本，参数选填，默认取 text 值，最大限制 100 字符，传值时需要 urlencode。
* `reference` 插入输入框时是否带消息原文回复引用，参数选填，默认为 `false`，填入 `true` 时则带引用回复到输入框中。

## [#](#跳转子频道) 跳转子频道

仅频道可用。

嵌入文本使用格式：`<#channel_id>`

客户端展示为： <font>#XXX文字子频道</font> 标签，点击可以跳转至子频道，仅支持当前频道内的子频道。

## [#](#表情) 表情

仅频道可用，解析为系统表情。 具体表情id参考 [Emoji 列表](/wiki/develop/api-v2/openapi/emoji/model.html#Emoji 列表)。

嵌入文本使用格式：`<emoji:id>`

* 仅支持 `type = 1` 的系统表情。
* `type = 2` 的 emoji 表情直接按字符串填写即可。

← [互动事件响应](/wiki/develop/api-v2/autogen/api/interactions_interaction_id.put.html) [获取机器人详情](/wiki/develop/api-v2/autogen/api/users_me.get.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区