import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AxiosError } from 'node-karin/axios'
import type { AxiosResponse } from 'node-karin/axios'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cleanupTestSandbox, createBot } from './helpers/bot'

let sandbox: string
let originalCwd: string

beforeAll(() => {
  originalCwd = process.cwd()
  sandbox = mkdtempSync(join(tmpdir(), 'qqbot-group-management-'))
  process.chdir(sandbox)
})

afterAll(() => cleanupTestSandbox(sandbox, originalCwd))

const removal = {
  method: 'post',
  url: '/v2/groups/group-openid/batch_remove_members',
  body: { member_openids: ['member-openid'] },
}
const blacklist = {
  method: 'post',
  url: '/v2/groups/group-openid/member_blacklist',
  body: { op: 'add', member_openids: ['member-openid'] },
}

describe('API 1.50.0 group member removal', () => {
  it('omits the expiry field when the standard mute method removes a mute', async () => {
    const { bot, requests } = await createBot(() => ({}))
    await bot.setGroupMute('group-openid', 'member-openid', 0)
    expect(requests).toEqual([
      {
        method: 'post',
        url: '/v2/groups/group-openid/restrict_chat_setting',
        body: { members: [{ op: 'del', member_openid: 'member-openid' }] },
      },
    ])
  })
  it('strips the removed simultaneous-blacklist field from native HTTP requests', async () => {
    const { bot, requests } = await createBot(() => ({ remove_members_result: 'success' }))
    const legacyBody = { member_openids: ['member-openid'], add_to_member_blacklist: true }

    await expect(bot.super.groups.batchRemoveGroupMembers('group-openid', legacyBody)).resolves.toEqual({
      remove_members_result: 'success',
    })
    expect(requests).toEqual([removal])
  })

  it('uses only the removal endpoint when rejecting a future join request is not requested', async () => {
    const { bot, requests } = await createBot(() => ({ remove_members_result: 'success' }))
    await bot.groupKickMember('group-openid', 'member-openid')
    expect(requests).toEqual([removal])
  })

  it('waits for successful removal before adding the member to the separate blacklist', async () => {
    let removed = false
    const { bot, requests } = await createBot(async (request) => {
      if (request.url.endsWith('/batch_remove_members')) {
        await Promise.resolve()
        removed = true
        return { remove_members_result: 'success' }
      }
      if (!removed) throw new Error('blacklisting while the member is still in the group')
      return { fail_openids: [] }
    })

    await bot.groupKickMember('group-openid', 'member-openid', true)
    expect(requests).toEqual([removal, blacklist])
  })

  it('propagates removal HTTP failures and does not attempt to blacklist', async () => {
    const { bot, requests } = await createBot(() => {
      throw new Error('removal permission denied')
    })

    await expect(bot.groupKickMember('group-openid', 'member-openid', true)).rejects.toThrow(
      'removal permission denied'
    )
    expect(requests).toEqual([removal])
  })

  it.each([{ remove_members_result: 'failed' }, {}])(
    'does not treat a non-success removal response as a completed kick: %j',
    async (response) => {
      const { bot, requests } = await createBot(() => response)

      await expect(bot.groupKickMember('group-openid', 'member-openid', true)).rejects.toThrow('移除群成员失败')
      expect(requests).toEqual([removal])
    }
  )

  it('reports partial success when the separate blacklist rejects the removed member', async () => {
    const { bot, requests } = await createBot((request) =>
      request.url.endsWith('/batch_remove_members')
        ? { remove_members_result: 'success' }
        : { fail_openids: ['member-openid'] }
    )

    await expect(bot.groupKickMember('group-openid', 'member-openid', true)).rejects.toThrow(
      /成员已移除.*黑名单失败.*member-openid/
    )
    expect(requests).toEqual([removal, blacklist])
  })

  it('reports a blacklist HTTP failure as partial success instead of silently completing', async () => {
    const { bot } = await createBot((request) => {
      if (request.url.endsWith('/batch_remove_members')) return { remove_members_result: 'success' }
      throw new Error('blacklist is invite-only')
    })

    await expect(bot.groupKickMember('group-openid', 'member-openid', true)).rejects.toThrow(
      /成员已移除.*黑名单失败.*invite-only/
    )
  })

  it('invalidates the removed member group card and role after a successful kick', async () => {
    const { bot } = await createBot((request) => {
      if (request.url.endsWith('/batch_remove_members')) return { remove_members_result: 'success' }
      throw new Error('member is no longer in the group')
    })
    const { cacheGroupMemberProfile } = await import('@/core/adapter/profiles')
    cacheGroupMemberProfile(bot, 'group-openid', 'member-openid', { card: '旧名片' })

    await bot.groupKickMember('group-openid', 'member-openid')
    const info = await bot.getGroupMemberInfo('group-openid', 'member-openid')
    expect(info.role).toBe('unknown')
    expect(info.card).toBeUndefined()
  })
})

describe('API 1.50.0 permission errors', () => {
  it.each([
    [40103011, '机器人', '/batch_remove_members'],
    [40103012, '群主', '/batch_remove_members'],
    [40184001, '好友关系', '/info'],
  ] as const)('describes error %i even when the platform omits its message', async (code, description, suffix) => {
    const { bot } = await createBot(() => {
      const error = new AxiosError('Forbidden')
      error.response = {
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        config: {} as AxiosResponse['config'],
        data: { err_code: code, trace_id: 'trace-test' },
      }
      throw error
    })
    const call =
      suffix === '/info'
        ? bot.super.meta.getUserInfo('user-openid')
        : bot.super.groups.batchRemoveGroupMembers('group-openid', { member_openids: ['member-openid'] })

    await expect(call).rejects.toThrow(description)
  })
})
