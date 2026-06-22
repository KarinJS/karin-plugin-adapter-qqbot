# [#](#子频道事件) 子频道事件

## [#](#内容) 内容

在 [Channel](/wiki/develop/api-v2/server-inter/channel/manage/channel/model.html#channel) 的**部分字段**基础上，增加 `op_user_id` 代表操作人。

## [#](#channel-create) CHANNEL\_CREATE

### [#](#发送时机) 发送时机

* 子频道被创建

### [#](#示例) 示例

```json
{
    "guild_id": "200000000",
    "id": "2943679",
    "name": "测试",
    "op_user_id": "100000000",
    "owner_id": "100000000",
    "sub_type": 0,
    "type": 0
}
```

1  
2  
3  
4  
5  
6  
7  
8  
9

## [#](#channel-update) CHANNEL\_UPDATE

### [#](#发送时机-2) 发送时机

* 子频道信息变更

### [#](#示例-2) 示例

```json
{
    "guild_id": "200000000",
    "id": "2943679",
    "name": "测试2",
    "op_user_id": "100000000",
    "owner_id": "100000000",
    "sub_type": 0,
    "type": 0
}
```

1  
2  
3  
4  
5  
6  
7  
8  
9

## [#](#channel-delete) CHANNEL\_DELETE

### [#](#发送时机-3) 发送时机

* 子频道被删除

### [#](#示例-3) 示例

```json
{
    "guild_id": "200000000",
    "id": "2943679",
    "name": "测试2",
    "op_user_id": "100000000",
    "owner_id": "100000000",
    "sub_type": 0,
    "type": 0
}
```

1  
2  
3  
4  
5  
6  
7  
8  
9

← [频道事件](/wiki/develop/api-v2/server-inter/channel/manage/event/guild.html) [获取子频道在线成员数](/wiki/develop/api-v2/server-inter/channel/role/get_online_nums.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区