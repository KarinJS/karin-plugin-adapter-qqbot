/** QQ 官方限制：单聊中同一 `msg_id` 最多发送四次被动回复。 */
export const C2C_PASSIVE_REPLY_LIMIT = 4

/** QQ keyboard 限制：最多 5 行。 */
export const KEYBOARD_MAX_ROWS = 5

/** QQ keyboard 限制：每行最多 5 个按钮。 */
export const KEYBOARD_MAX_BUTTONS_PER_ROW = 5

/** 只有按钮没有文本时仍需提供非空 markdown 内容（零宽空格）。 */
export const BUTTON_ONLY_MARKDOWN = '​'

/** 群聊 event_id 白名单 */
export const GROUP_EVENT_WHITELIST = new Set([
  'INTERACTION_CREATE', 'GROUP_ADD_ROBOT', 'GROUP_MSG_RECEIVE',
])

/** 单聊 event_id 白名单 */
export const FRIEND_EVENT_WHITELIST = new Set([
  'INTERACTION_CREATE', 'C2C_MSG_RECEIVE', 'FRIEND_ADD',
])

/** 平台限制的最大禁言时长：30 天 */
export const MAX_GROUP_MUTE_SECONDS = 30 * 24 * 60 * 60

/** 群成员列表自动翻页的安全上限：每页最多 30 条，200 页约 6000 人 */
export const GROUP_MEMBER_LIST_MAX_PAGES = 200

/** 平台限制：入群申请列表 / 入群自动审批策略列表单页最大 50 条（接口文档 v1.28.0 由 100 下调） */
export const MAX_GROUP_CURSOR_LIMIT = 50

/** QQ 客户端回调按钮需要快速 ACK，超时必须小于平台等待窗口。 */
export const INTERACTION_ACK_TIMEOUT = 2800

/** 输入中状态默认展示时长（秒），平台 typing 窗口约 60s */
export const INPUT_NOTIFY_DEFAULT_SECOND = 60
