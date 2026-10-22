# [#](#开放论坛事件对象-openforumevent) 开放论坛事件对象(OpenForumEvent)

## [#](#oepn-forum-event-intents-open-forum-event) OEPN\_FORUM\_EVENT（intents OPEN\_FORUM\_EVENT）

**发送时机**

* 用户在话题子频道内发帖、评论、回复评论时产生该事件

## [#](#主题事件) 主题事件

* OPEN\_FORUM\_THREAD\_CREATE
* OPEN\_FORUM\_THREAD\_UPDATE
* OPEN\_FORUM\_THREAD\_DELETE

### [#](#示例) 示例

```json
{
  "guild_id": "47129941624960822",
  "channel_id": "1661124",
  "author_id": "144115218182563108",
}
```

1  
2  
3  
4  
5

## [#](#帖子事件) 帖子事件

* OPEN\_FORUM\_POST\_CREATE
* OPEN\_FORUM\_POST\_DELETE

### [#](#示例-2) 示例

```json
{
  "guild_id": "47129941624960822",
  "channel_id": "1661124",
  "author_id": "144115218182563108",
}
```

1  
2  
3  
4  
5

## [#](#回复事件) 回复事件

* OPEN\_FORUM\_REPLY\_CREATE
* OPEN\_FORUM\_REPLY\_DELETE

### [#](#示例-3) 示例

```json
{
  "guild_id": "47129941624960822",
  "channel_id": "1661124",
  "author_id": "144115218182563108",
}
```

1  
2  
3  
4  
5

← [论坛事件对象(ForumEvent)](/wiki/develop/api-v2/server-inter/channel/content/forum/forum.html) [开放数据域加密](/wiki/develop/api-v2/server-inter/channel/miniapp/opendata.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区