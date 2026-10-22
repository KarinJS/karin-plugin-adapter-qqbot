# [#](#音视频-直播子频道成员进出事件) 音视频/直播子频道成员进出事件

## [#](#audio-or-live-channel-member-enter) AUDIO\_OR\_LIVE\_CHANNEL\_MEMBER\_ENTER

### [#](#发送时机) 发送时机

* 用户进入音视频/直播子频道时

### [#](#示例) 示例

```json
{
  "guild_id": "47129941624960822",
  "channel_id": "1661124",
  "channel_type": 2, // 2-音视频子频道 5-直播子频道
  "user_id": "144115218182563108"
}
```

1  
2  
3  
4  
5  
6

## [#](#audio-or-live-channel-member-exit) AUDIO\_OR\_LIVE\_CHANNEL\_MEMBER\_EXIT

### [#](#发送时机-2) 发送时机

* 用户离开音视频/直播子频道时

### [#](#示例-2) 示例

```json
{
  "guild_id": "47129941624960822",
  "channel_id": "1661124",
  "channel_type": 2, // 2-音视频子频道 5-直播子频道
  "user_id": "144115218182563108"
}
```

1  
2  
3  
4  
5  
6

← [频道成员事件](/wiki/develop/api-v2/server-inter/channel/role/guild_member.html) [获取频道身份组列表](/wiki/develop/api-v2/server-inter/channel/role-group/get_guild_roles.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区