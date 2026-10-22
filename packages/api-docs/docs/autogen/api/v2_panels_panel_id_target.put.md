# [#](#修改指令面板关联对象) 修改指令面板关联对象

对指定指令面板关联的用户或群进行添加或删除操作。c2c 场景操作用户 openid，group 场景操作群 openid。channel 和 dm 场景为全局配置，不支持此操作

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/panels/{panel\_id}/target|
|HTTP Method|PUT|
|接口频率限制|60 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|panel\_id|string|是|面板 ID|

## [#](#请求体) 请求体

|名称|类型|必填|描述|
|---|---|---|---|
|op|string|是|操作类型，可选值：add（添加关联对象）、del（移除关联对象）|
|user\_openids|\[\]string|否|用户 openid 列表，仅 c2c 场景有效，一次最多 20 个|
|group\_openids|\[\]string|否|群 openid 列表，仅 group 场景有效，一次最多 20 个|

### [#](#请求示例) 请求示例

**添加群关联**

```text
{
  "op": "add",
  "group_openids": [
    "openid_group_003"
  ]
}
```

1  
2  
3  
4  
5  
6

**删除用户关联**

```text
{
  "op": "del",
  "user_openids": [
    "openid_user_001"
  ]
}
```

1  
2  
3  
4  
5  
6

## [#](#响应) 响应

无

## [#](#响应示例) 响应示例

**成功**

```json
{}
```

1

### [#](#错误码) 错误码

|错误码|描述|排查建议|
|---|---|---|
|40030013|超出数量限制|请减少请求数量，具体限制值见返回信息中的 limit|
|40030017|操作类型不合法|op 仅支持 add/del|
|40030018|当前场景不支持此操作|检查 scope 是否支持当前操作|
|40030021|全局面板不支持添加指定关联对象|target\_type=all 的面板不支持此操作，请使用 specific 模式|

← [删除指令面板](/wiki/develop/api-v2/autogen/api/v2_panels_panel_id.delete.html) [用户添加好友](/wiki/develop/api-v2/autogen/event/friend_add.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区