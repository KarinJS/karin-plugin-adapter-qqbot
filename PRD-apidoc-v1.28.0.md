# PRD：接口文档 v1.28.0（2026-09-03）适配

> 依据提交 `400f649`（`docs: 接口文档更新至2026-09-03, version: v1.28.0`）对 `api-docs/` 的变更，
> 逐项比对 `src/` 现状，列出本适配器尚不具备的能力。
>
> **约束**：本分支全部提交仅保留在本地，禁止 `git push`。
> 全部 todo 打勾并通过验收后，删除本文档。

## 变更来源速览

| 类别 | 官方变更 | 现状 |
| --- | --- | --- |
| 新增 | 5 个群成员管理接口 | 4 个完全缺失，1 个已按未公开接口实现但字段名有误 |
| 变更 | keyboard 按钮新增 `group_id`、`action.modal`，`render_data.style` 取值重定义 | 均未支持 |
| 变更 | 群消息发送移除 `is_wakeup`（单聊仍保留） | 类型上仍是群/单聊共用 |
| 变更 | 分页 `limit` 上限 100 → 50；禁言批量上限 10 → 20 | 注释与钳制均为旧值 |
| 变更 | `GROUP_JOIN_REQUEST` intent 改为 `GROUP_MEMBER_EVENT (1<<24)` | 注释仍写 `1<<25` |

---

## P0 · 群成员管理接口封装（`src/core/api/`）

- [x] **T1** 在 `src/core/api/types.ts` 补齐 5 个接口的请求 / 响应类型
  - `GetGroupMemberListParams` / `GetGroupMemberListResponse` / `GroupMemberItem`
  - `BatchRemoveGroupMembersBody` / `BatchRemoveGroupMembersResponse`
  - `GetGroupMemberBlacklistParams` / `GetGroupMemberBlacklistResponse` / `GroupBlacklistUser`
  - `SetGroupMemberBlacklistBody` / `SetGroupMemberBlacklistResponse`
  - 字段注释需带官方限制（每页 30 条 / 单次 20 个 / `limit` 默认 20 最大 100）
- [x] **T2** `GroupsApi.getGroupMemberList()` → `GET /v2/groups/{group_openid}/members`
      游标分页，`cursor` 为空串表示首页，返回 `next_cursor`
- [x] **T3** 修正 `QQGroupMemberResponse`：`nick` → `username`，补 `bot`、`union_openid`；
      该接口已在 v1.28.0 转为公开文档，去掉「未公开文档」的 TSDoc 免责说明
- [x] **T4** `GroupsApi.batchRemoveGroupMembers()` → `POST /v2/groups/{group_openid}/batch_remove_members`
      单次最多 20 个，支持 `add_to_member_blacklist`
- [x] **T5** `GroupsApi.getGroupMemberBlacklist()` → `GET /v2/groups/{group_openid}/member_blacklist`
- [x] **T6** `GroupsApi.setGroupMemberBlacklist()` → `POST /v2/groups/{group_openid}/member_blacklist`
      `op: add | del`，单次最多 20 个，返回 `fail_openids`
- [x] **T7** 更新 `GroupsApi` 类注释与 `src/core/api/index.ts` 门面注释中 `groups` 的职能描述

## P1 · 适配器层落地（`src/core/adapter/base.ts`）

- [x] **T8** 实现 `getGroupMemberList()`（当前为 `暂不支持` 桩）
      自动翻页至 `next_cursor` 为空，回填 `nicknameCache`，失败降级空数组 + 告警
- [x] **T9** `getGroupMemberInfo()` 改读 `username`（保留 `nick` 兼容回退）
- [x] **T10** 实现 `groupKickMember()`（当前为 `暂不支持` 桩）
      走 `batch_remove_members`，`rejectAddRequest` 映射为 `add_to_member_blacklist`

## P2 · 消息发送 schema 变更

- [x] **T11** keyboard 按钮支持 `group_id`（同组内一个按钮操作后其余置灰，仅 `action.type=1` 生效）
- [x] **T12** keyboard 按钮支持 `action.modal` 二次确认
      `content` ≤40 字符且不含 URL、`confirm_text` / `cancel_text` ≤4 字符
- [x] **T13** `render_data.style` 取值注释更新为 `0` 灰线框 / `1` 蓝线框 / `3` 白底红字 / `4` 蓝底白字，
      标注 `2` 已从官方文档移除
- [x] **T14** `QQMessageID.is_wakeup` 注释标注：群消息已下线该字段，仅单聊可用
- [x] **T15** `normalizeQQBotButton()` 透传 `group_id` 与 `action.modal`

## P3 · 约束与常量修正

- [x] **T16** `getJoinRequestList` 的 `limit` 上限 100 → 50（TSDoc + 类型注释 + 入参钳制）
- [x] **T17** `JoinApprovalApi` 策略列表 `limit` 上限 100 → 50（同上）
- [x] **T18** `restrict_chat_setting` 批量上限 10 → 20：更新注释，并补齐批量禁言入口
- [x] **T19** `src/types/event.ts` 中 `GROUP_JOIN_REQUEST` 的 intent 更正为 `GROUP_MEMBER_EVENT 1<<24`

## P4 · 验收

- [x] **T20** `pnpm typecheck` 通过
- [x] **T21** `pnpm lint` 通过
- [x] **T22** `pnpm test` 通过
- [x] **T23** `pnpm build` 通过
- [x] **T24** 变更以本地提交留存，未推送远程
- [ ] **T25** 验收通过后删除本文档

---

## 不纳入范围

- 图片 CDN 链接的 `v1.27.1` → `v1.28.0` 版本号、文档底部导航链接更新：纯文档内容，无对应代码。
- 单聊 `media.file_info` 来源由 `/v2/groups/.../files` 更正为 `/v2/users/.../files`：
  适配器已按会话场景分别调用正确的上传端点，属官方文档笔误修正。
- 新接口均标注「该能力正在内邀接入中」且无权限时返回 `11253`（`error.ts` 已收录该错误码），
  因此适配器层统一采取「降级 + 告警」而非抛错。
