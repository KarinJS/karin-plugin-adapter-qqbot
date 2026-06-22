# [#](#论坛事件对象-forumevent) 论坛事件对象(ForumEvent)

## [#](#forum-event-intents-forum-event) FORUM\_EVENT（intents FORUM\_EVENT）

## [#](#发送时机) 发送时机

* 用户在话题子频道内发帖、评论、回复评论时产生该事件

## [#](#主题事件) 主题事件

* FORUM\_THREAD\_CREATE
* FORUM\_THREAD\_UPDATE
* FORUM\_THREAD\_DELETE

事件内容为 [Thread](/wiki/develop/api-v2/server-inter/channel/content/forum/model.html#Thread) 对象

## [#](#示例) 示例

```json
{
  "guild_id": 47129941624960822,
  "channel_id": 1661124,
  "author_id": 144115218182563108,
  "thread_info": {
    "thread_id": "B_7c02cb615f8904001441152181825631080X60",
    "title": [{
      "type": 1,
      "text_info": {
        "text": "Test"
      }
    }],
    "content": [{
      "type": 1,
      "text_info": {
        "text": "tencent "
      }
    }, {
      "type": 5,
      "channel_info": {
        "channel_id": 1505272,
        "channel_name": "#隐私子频道"
      }
    }, {
      "type": 1,
      "text_info": {
        "text": " "
      }
    }, {
      "type": 3,
      "url_info": {
        "url": "https://apple.com",
        "display_text": "Apple"
      }
    }, {
      "type": 1,
      "text_info": {
        "text": ""
      }
    }],
    "date_time": "2021-12-30T15:17:34+08:00"
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

## [#](#帖子事件) 帖子事件

* FORUM\_POST\_CREATE
* FORUM\_POST\_DELETE

事件内容为 [Post](/wiki/develop/api-v2/server-inter/channel/content/forum/model.html#Post) 对象

## [#](#示例-2) 示例

```json
{
  "guild_id": "47129941624960822",
  "channel_id": "1661124",
  "author_id": "144115218182563108",
  "post_info": {
    "thread_id": "B_6d02bb61e45b0d001441152181867088220X60",
    "post_id": "c_1500cb611f950a001441152181825631080X60",
    "content": [{
      "type": 1,
      "text_info": {
        "text": "test"
      }
    }, {
      "type": 4,
      "emoji_info": {
        "id": 109,
        "type": "1"
      }
    }, {
      "type": 1,
      "text_info": {
        "text": "111"
      }
    }, {
      "type": 4,
      "emoji_info": {
        "id": 13,
        "type": "1"
      }
    }],
    "date_time": "2021-12-30T15:17:34+08:00"
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

## [#](#回复事件) 回复事件

* FORUM\_REPLY\_CREATE
* FORUM\_REPLY\_DELETE

事件内容为 [Reply](/wiki/develop/api-v2/server-inter/channel/content/forum/model.html#Reply) 对象

## [#](#示例-3) 示例

```json
{
  "guild_id": 47129941624960822,
  "channel_id": 1661124,
  "author_id": 144115218182563108,
  "reply_info": {
    "thread_id": "B_8914b26116bb03001441152181867088220X60",
    "post_id": "c_39bab261d2b907001441152181867088220X60",
    "reply_id": "r_e701cb6128dc0b001441152181825631080X60",
    "content": [{
      "type": 1,
      "text_info": {
        "text": "Apple"
      }
    }],
    "date_time": "2021-12-30T15:17:34+08:00"
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

## [#](#帖子审核事件) 帖子审核事件

* FORUM\_PUBLISH\_AUDIT\_RESULT

事件内容为 [AuditResult](/wiki/develop/api-v2/server-inter/channel/content/forum/model.html#AuditResult) 对象

```json
{
  "guild_id": 47129941624960822,
  "channel_id": 1661124,
  "author_id": 144115218182563108,
  "type": 1,
  "result":0,
  "err_msg": "",
  "thread_id": "B_8914b26116bb03001441152181867088220X60",
  "post_id": "c_39bab261d2b907001441152181867088220X60",
  "reply_id": "r_e701cb6128dc0b001441152181825631080X60"
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

← [删除帖子](/wiki/develop/api-v2/server-inter/channel/content/forum/delete_thread.html) [开放论坛事件对象(OpenForumEvent)](/wiki/develop/api-v2/server-inter/channel/content/forum/open_forum.html) →

手机QQ扫码
![开发者社区](https://guild-1251316161.cos.ap-guangzhou.myqcloud.com/miniapp/icons/qq_guild_developer_doc.png)

加入官方频道开发者社区