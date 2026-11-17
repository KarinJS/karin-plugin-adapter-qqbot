import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanupTestSandbox, createBot as createFixture } from './helpers/bot'
import type { AxiosInstance } from '@/core/api/http'
import type { AdapterQQBot } from '@/core/adapter/base'
import type { GetMeResponse } from '@/core/api/types'

const runtime = vi.hoisted(() => ({ transport: undefined as unknown as AxiosInstance, register: vi.fn() }))

vi.mock('@/core/internal/axios', () => ({
  createAxiosInstance: () => runtime.transport,
  getAccessToken: async () => 'test-token',
  stopTokenRefresh: () => {},
}))

/** 替换进程注册和连接边界，机器人资料请求与实例初始化仍执行真实代码。 */
vi.mock('node-karin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node-karin')>()
  return { ...actual, registerBot: runtime.register, unregisterBot: () => {} }
})

let sandbox: string
let originalCwd: string
let core: typeof import('@/core/index')
const appIds = new Set<string>()

beforeAll(async () => {
  originalCwd = process.cwd()
  sandbox = mkdtempSync(join(tmpdir(), 'qqbot-initialization-'))
  process.chdir(sandbox)
  core = await import('@/core/index')
})

beforeEach(() => runtime.register.mockReset().mockReturnValue(1))

afterAll(() => {
  for (const appId of appIds) core.destroyBot(appId)
  return cleanupTestSandbox(sandbox, originalCwd)
})

const initialize = async (response: unknown, appId: string) => {
  const fixture = await createFixture(() => response, appId)
  runtime.transport = fixture.bot.super.axios
  appIds.add(appId)
  await core.createBot({ ...fixture.bot.cfg, event: { type: 1 } })
  return runtime.register.mock.calls[0]?.[1] as AdapterQQBot
}

describe('initialization with documented @me responses', () => {
  it('initializes from the documented fields without requiring an undocumented share_url', async () => {
    const me = {
      id: 'bot-user',
      username: '机器人昵称',
      avatar: 'https://example.com/bot.png',
      bot: true,
    } satisfies GetMeResponse
    const bot = await initialize(me, 'init-app')
    expect(bot.account).toMatchObject({
      selfId: 'init-app',
      name: '机器人昵称',
      avatar: 'https://example.com/bot.png',
      subId: { id: 'bot-user', appid: 'init-app', qq: '', union_openid: '' },
    })
  })

  it('preserves the QQ number and union ID from legacy extended responses', async () => {
    const bot = await initialize(
      {
        id: 'bot-user',
        username: '机器人昵称',
        avatar: 'https://example.com/bot.png',
        bot: true,
        share_url: 'https://qun.qq.com/qunpro/robot/qunshare?robot_uin=3889007780',
        union_openid: 'union-bot',
      },
      'legacy-init-app'
    )
    expect(bot.selfSubId('qq')).toBe('3889007780')
    expect(bot.selfSubId('union_openid')).toBe('union-bot')
  })

  it('does not abort initialization when the optional legacy share URL is malformed', async () => {
    const bot = await initialize(
      {
        id: 'bot-user',
        username: '机器人昵称',
        avatar: 'https://example.com/bot.png',
        bot: true,
        share_url: 'malformed',
      },
      'bad-url-init-app'
    )
    expect(bot.selfId).toBe('bad-url-init-app')
    expect(bot.selfSubId('qq')).toBe('')
  })

  it('propagates an @me failure through the returned promise without an unhandled finally rejection', async () => {
    const fixture = await createFixture(() => {
      throw new Error('me unavailable')
    }, 'failed-init-app')
    runtime.transport = fixture.bot.super.axios
    await expect(core.createBot({ ...fixture.bot.cfg, event: { type: 1 } })).rejects.toThrow('me unavailable')
    expect(runtime.register).not.toHaveBeenCalled()
  })
})
