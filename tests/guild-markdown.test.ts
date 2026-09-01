/**
 * 频道 Markdown 能力探测：降级标记的生命周期与权限错误识别。
 *
 * 这里判错的代价不对称——漏判只是多白跑一次请求，误判会把一个有权限的 bot
 * 永久按在普通消息通道上，因此反例比正例更需要覆盖。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  canSendGuildMarkdown,
  disableGuildMarkdown,
  isGuildMarkdownForbiddenError,
  resetGuildMarkdown,
} from '@/core/adapter/guild-markdown'

const BOT_A = '102000001'
const BOT_B = '102000002'

describe('降级标记', () => {
  beforeEach(() => {
    resetGuildMarkdown(BOT_A)
    resetGuildMarkdown(BOT_B)
  })

  it('默认乐观尝试 Markdown', () => {
    expect(canSendGuildMarkdown(BOT_A)).toBe(true)
  })

  it('只在首次标记时返回 true，供调用方只告警一次', () => {
    expect(disableGuildMarkdown(BOT_A)).toBe(true)
    expect(disableGuildMarkdown(BOT_A)).toBe(false)
    expect(canSendGuildMarkdown(BOT_A)).toBe(false)
  })

  it('按 bot 隔离，一个账号没权限不影响另一个', () => {
    disableGuildMarkdown(BOT_A)
    expect(canSendGuildMarkdown(BOT_B)).toBe(true)
  })

  it('reset 后重新探测，拿到内邀不必重启整个 Karin', () => {
    disableGuildMarkdown(BOT_A)
    resetGuildMarkdown(BOT_A)
    expect(canSendGuildMarkdown(BOT_A)).toBe(true)
  })
})

describe('权限错误识别', () => {
  it.each([
    ['50056 完整报文', '错误详情: [HTTP 403] | [Code 50056] 不允许发送 markdown content\n响应数据: {"code":50056}'],
    ['304036 模板权限', '错误详情: [HTTP 403] | [Code 304036] 没有 markdown 模板的权限'],
    ['仅中文文案', '不允许发送 markdown content'],
  ])('%s 触发降级', (_name, message) => {
    expect(isGuildMarkdownForbiddenError(new Error(message))).toBe(true)
  })

  it.each([
    ['markdown 空值是内容问题', '错误详情: [HTTP 400] | [Code 50041] markdown 有空值'],
    ['频率限制', '错误详情: [HTTP 429] | [Code 22009] 频率限制'],
    ['TraceID 里恰好含错误码', 'TraceID: abc50056def'],
    ['响应体里的裸 code 字段', '响应数据: {"code":40011028,"message":"请求的资源不存在"}'],
  ])('%s 不触发降级', (_name, message) => {
    expect(isGuildMarkdownForbiddenError(new Error(message))).toBe(false)
  })

  it('非 Error 抛出物也能判定', () => {
    expect(isGuildMarkdownForbiddenError('[Code 50056] 不允许发送 markdown content')).toBe(true)
    expect(isGuildMarkdownForbiddenError(undefined)).toBe(false)
  })
})
