# [#](#markdown-消息) Markdown 消息

2026/04/23 能力更新说明

单聊场景、群聊场景自定义 Markdown 消息能力已开放到所有机器人均可使用，无需单独申请 Markdown 模版，频道场景目前需要内邀开通。

|**单聊**|**群聊**|**文字子频道**|**频道私信**|
|---|---|---|---|---|
|机器人接收|\-|\-|\-|\-|
|机器人发送|支持|支持|支持|支持|

## [#](#支持格式) 支持格式

### [#](#标题) 标题

```text
# 一号标题
## 二号标题
正文
```

1  
2  
3

### [#](#文字样式) 文字样式

```text
**加粗**
__下划线加粗__
_斜体_
*星号斜体*
***加粗斜体***
~~删除线~~

```

1  
2  
3  
4  
5  
6  
7

### [#](#链接) 链接

```text
欢迎来到：[🔗腾讯网](https://www.qq.com)  
文档可以访问<https://doc.qq.com>
```

1  
2

### [#](#图片) 图片

对于 markdown 消息内的图片资源，请使用可在公网访问的资源 url，开放平台会下载转存该资源。

```text
![text #208px #320px](https://resource5-1255303497.cos.ap-guangzhou.myqcloud.com/abcmouse_word_watch/markdown/building.png)
```

1

### [#](#有序列表) 有序列表

```text
# 有序列表
1. 新人降落桃源岛的欢迎仪式
2. 阳光准则助力建设有温度的频道
3. 岛民分享吹水纳凉
```

1  
2  
3  
4

### [#](#无序列表) 无序列表

```text
# 无序列表
- 新人降落桃源岛的欢迎仪式
- 阳光准则助力建设有温度的频道
- 岛民分享吹水纳凉
```

1  
2  
3  
4

### [#](#列表嵌套) 列表嵌套

```text
# 有序列表标题
1. 嵌套一层
    - 列表前是普通文本，则需要在列表前用空行隔开，否则无法识别
    - 如果是段落标签比如标题，则无需用空行隔开
2. 嵌套二层
    1. 我是有序列表，二级列表前面需要空4个空格
    2. 无序列表和有序列表可以相互嵌套，但是不建议无限制嵌套。
```

1  
2  
3  
4  
5  
6  
7

### [#](#块引用) 块引用

```text
> 青青子衿，悠悠我心，但为君故，沉吟至今
> 四月维夏，六月徂暑。先祖匪人，胡宁忍予
> 秋日凄凄，百卉具腓。乱离瘼矣，爰其适归？
诗经《小雅》
```

1  
2  
3  
4

### [#](#水平分割线) 水平分割线

```text
这是段落1
***
这是段落2
```

1  
2  
3

### [#](#换多行) 换多行

```text
第一行

第二行

\u200B
\u200B
第三行
```

1  
2  
3  
4  
5  
6  
7

## [#](#发送方式) 发送方式

自定义 markdown 消息使用示例：

```json
{
  "markdown": {
    "content": "# 标题 \n## 简介很开心 \n内容[🔗腾讯](https://www.qq.com)"
  }
}
```

1  
2  
3  
4  
5

markdown 模版消息的使用示例：

```text
// 模版例子

#{{.title}}

![img#618px #249px]({{.image}})

*{{.para1}}
*{{.para2}}

## {{.desc}}

{{.content}}[{{.link_introduction}}]({{.link}})

// 发送case
{
	"markdown": {
		"custom_template_id": "101993071_1658748972",
		"params": [{
				"key": "title",
				"values": ["标题"]
			},
			{
				"key": "image",
				"values": [
					"https://resource5-1255303497.cos.ap-guangzhou.myqcloud.com/abcmouse_word_watch/other/mkd_img.png"
				]
			},
			{
				"key": "para1",
				"values": ["段落1"]
			},
			{
				"key": "para2",
				"values": ["段落2"]
			},
			{
				"key": "desc",
				"values": ["简介"]
			},
			{
				"key": "content",
				"values": ["在这个子频道非常开心"]
			},
			{
				"key": "link_introduction",
				"values": ["链接介绍"]
			},
			{
				"key": "link",
				"values": ["https://www.qq.com"]
			}
		]
	}
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
10  
11  
12  
13  
14  
15  
16  
17  
18  
19  
20  
21  
22  
23  
24  
25  
26  
27  
28  
29  
30  
31  
32  
33  
34  
35  
36  
37  
38  
39  
40  
41  
42  
43  
44  
45  
46  
47  
48  
49  
50  
51  
52  
53  
54

## [#](#数据结构与协议) 数据结构与协议

消息发送 markdown 字段值是一个 json object，具体字段如下：

|**属性**|**类型**|**必填**|**说明**|
|---|---|---|---|
|content|string|否|自定义 markdown 文本内容|
|custom\_template\_id|string|否|markdown 模版id，申请模版后获得|
|params|Array|否|{key: xxx, values: xxx}，模版内变量与填充值的kv映射|

← [富媒体消息](/wiki/develop/api-v2/server-inter/message/type/media.html) [表情消息](/wiki/develop/api-v2/server-inter/message/type/sticker.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区