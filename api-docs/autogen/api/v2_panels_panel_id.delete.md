# [#](#删除指令面板) 删除指令面板

删除指定的指令面板。删除后该面板不再对任何用户或群生效

## [#](#请求) 请求

### [#](#基础信息) 基础信息

|字段|值|
|---|---|
|HTTP URL|/v2/panels/{panel\_id}|
|HTTP Method|DELETE|
|接口频率限制|10 QPM|

## [#](#路径参数) 路径参数

|名称|类型|必填|描述|
|---|---|---|---|
|panel\_id|string|是|面板 ID|

### [#](#请求示例) 请求示例

**删除面板**

```text
DELETE /v2/panels/p_x8k2x8k2x8k2

```

1  
2

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
|40030006|指令面板不存在|确认 panel\_id 是否正确|

← [修改指令面板](/wiki/develop/api-v2/autogen/api/v2_panels_panel_id.put.html) [修改指令面板关联对象](/wiki/develop/api-v2/autogen/api/v2_panels_panel_id_target.put.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区