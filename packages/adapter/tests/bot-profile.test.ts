import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { cleanupTestSandbox, createBot } from './helpers/bot'
import { EventEnum } from '@/types/event'
import type { C2CMsgEvent, GroupMsgEvent } from '@/types/event'
import type { AdapterQQBot } from '@/core/adapter/base'
import type { UserInfo, GroupInfo, GroupMemberInfo } from 'node-karin'

/** 使用真实 Karin 事件类，跳过只有完整 Karin 进程才会初始化的插件调度。 */
vi.mock('node-karin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node-karin')>()
  return {
    ...actual,
    createGroupMessage: (options: Parameters<typeof actual.createGroupMessage>[0]) => new actual.GroupMessage(options),
    createFriendMessage: (options: Parameters<typeof actual.createFriendMessage>[0]) =>
      new actual.FriendMessage(options),
    createGroupMemberDelNotice: (options: Parameters<typeof actual.createGroupMemberDelNotice>[0]) =>
      new actual.GroupMemberDecreaseNotice(options),
    createFriendDecreaseNotice: (options: Parameters<typeof actual.createFriendDecreaseNotice>[0]) =>
      new actual.FriendDecreaseNotice(options),
  }
})

let sandbox: string
let originalCwd: string

beforeAll(() => {
  originalCwd = process.cwd()
  sandbox = mkdtempSync(join(tmpdir(), 'qqbot-bot-profile-'))
  process.chdir(sandbox)
})

afterAll(() => cleanupTestSandbox(sandbox, originalCwd))

afterEach(() => vi.useRealTimers())

const userInfo = {
  username: 'QQ昵称',
  avatar: 'https://example.com/avatar.png?key=signed',
  allow_proactive_msg: false,
  union_openid: 'union-user',
}

describe('API 1.50.0 user profiles', () => {
  it('queries the documented user endpoint and keeps the complete native response', async () => {
    const { bot, requests } = await createBot(() => userInfo)

    await expect(bot.super.meta.getUserInfo('user-openid')).resolves.toEqual(userInfo)
    expect(requests).toEqual([{ method: 'get', url: '/v2/users/user-openid/info' }])
  })

  it('returns the Karin user structure and exposes the original avatar through getAvatarUrl', async () => {
    const { bot, requests } = await createBot(() => userInfo)

    await expect(bot.getStrangerInfo('user-openid')).resolves.toEqual({
      userId: 'user-openid',
      nick: 'QQ昵称',
    })
    await expect(bot.getAvatarUrl('user-openid', 100)).resolves.toBe('https://example.com/avatar.png?key=signed')
    expect(requests).toHaveLength(2)
  })

  it('accepts the documented response without a cross-application ID', async () => {
    const { bot } = await createBot(() => ({
      username: '普通用户',
      avatar: 'https://example.com/a.png',
      allow_proactive_msg: true,
    }))

    await expect(bot.getStrangerInfo('user-openid')).resolves.toMatchObject({
      userId: 'user-openid',
      nick: '普通用户',
    })
    await expect(bot.super.meta.getUserInfo('user-openid')).resolves.toEqual({
      username: '普通用户',
      avatar: 'https://example.com/a.png',
      allow_proactive_msg: true,
    })
  })

  it('keeps a newer event avatar when an older user query finishes later', async () => {
    let complete!: (value: typeof userInfo) => void
    const response = new Promise<typeof userInfo>((resolve) => {
      complete = resolve
    })
    const { bot } = await createBot(() => response)
    const { cacheUserProfile } = await import('@/core/adapter/profiles')
    const query = bot.getAvatarUrl('user-openid')
    cacheUserProfile(bot, 'user-openid', { nick: '最新昵称', avatar: 'https://example.com/new-avatar.png' })
    complete(userInfo)

    await expect(query).resolves.toBe('https://example.com/new-avatar.png')
    await expect(bot.getAvatarUrl('user-openid')).resolves.toBe('https://example.com/new-avatar.png')
  })

  it('keeps a newer event nickname when a user query returns an older nickname', async () => {
    let complete!: (value: typeof userInfo) => void
    const response = new Promise<typeof userInfo>((resolve) => {
      complete = resolve
    })
    const { bot } = await createBot(() => response)
    const { cacheUserProfile, getUserProfile } = await import('@/core/adapter/profiles')
    const query = bot.getStrangerInfo('user-openid')
    cacheUserProfile(bot, 'user-openid', { nick: '最新昵称' })
    complete(userInfo)

    await expect(query).resolves.toEqual({ userId: 'user-openid', nick: '最新昵称' })
    expect(getUserProfile(bot, 'user-openid')?.nick).toBe('最新昵称')
  })

  it('bounds event nicknames and expires the fallback nickname with its event profile', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { bot } = await createBot(() => {
      throw new Error('not permitted')
    })
    const { cacheUserProfile, getUserProfile } = await import('@/core/adapter/profiles')
    for (let index = 0; index <= 2000; index++) cacheUserProfile(bot, `user-${index}`, { nick: `昵称${index}` })
    expect(bot.nicknameCache.size).toBeLessThanOrEqual(2000)
    expect(getUserProfile(bot, 'user-0')).toBeUndefined()

    vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1)
    await expect(bot.getStrangerInfo('user-2000')).resolves.toEqual({ userId: 'user-2000', nick: '' })
    expect(bot.nicknameCache.has('user-2000')).toBe(false)
  })

  it('keeps the requested fallback size and retries after a failed profile lookup', async () => {
    let attempt = 0
    const { bot, requests } = await createBot(() => {
      if (++attempt === 1) throw new Error('[Code 40184001] 无好友关系')
      return userInfo
    })

    await expect(bot.getAvatarUrl('user-openid', 100)).resolves.toBe(
      'https://thirdqq.qlogo.cn/qqapp/test-app/user-openid/100'
    )
    await expect(bot.getAvatarUrl('user-openid', 100)).resolves.toBe('https://example.com/avatar.png?key=signed')
    expect(requests).toHaveLength(2)
  })

  it('retains a known nickname on failure using only the Karin user fields', async () => {
    const { bot } = await createBot(() => {
      throw new Error('not a friend')
    })
    bot.nicknameCache.set('member-openid', '已知昵称')

    const info = await bot.getStrangerInfo('member-openid')
    expect(info).toEqual({ userId: 'member-openid', nick: '已知昵称' })
  })

  it('queries @me for both bot identifiers instead of the user profile endpoint', async () => {
    const { bot, requests } = await createBot((request) => {
      if (request.url !== '/users/@me') throw new Error('wrong endpoint for the bot')
      return { id: 'bot-user-id', username: '测试机器人', avatar: 'https://example.com/bot.png', bot: true }
    })

    await expect(bot.getAvatarUrl(bot.selfId)).resolves.toBe('https://example.com/bot.png')
    await expect(bot.getAvatarUrl('bot-user-id')).resolves.toBe('https://example.com/bot.png')
    expect(requests).toHaveLength(1)
  })

  it('keeps official group extensions in the native API and the standard method within Karin fields', async () => {
    const { bot } = await createBot(() => ({
      group_openid: 'group-openid',
      group_name: '读书分享会',
      group_finger_memo: '每周共读一本好书',
      group_class_text: '文化',
      group_tags: ['阅读', '文学'],
      group_member_num: 256,
      union_group_openid: 'union-group',
    }))

    await expect(bot.super.groups.getGroupInfo('group-openid')).resolves.toMatchObject({
      union_group_openid: 'union-group',
      group_class_text: '文化',
      group_tags: ['阅读', '文学'],
    })
    await expect(bot.getGroupInfo('group-openid')).resolves.toEqual({
      groupId: 'group-openid',
      groupName: '读书分享会',
      groupDesc: '每周共读一本好书',
      memberCount: 256,
      owner: '',
      groupRemark: '',
      admins: [],
      maxMemberCount: 0,
      avatar: 'https://p.qlogo.cn/gh/group-openid/group-openid/100',
    })
  })

  it('keeps member union IDs in the native response and returns Karin member fields from the bot', async () => {
    const { bot } = await createBot(() => ({
      member_openid: 'member-openid',
      username: '成员昵称',
      member_role: 'admin',
      bot: false,
      joined_at: '2026-11-17T08:00:00Z',
      union_openid: 'union-member',
    }))

    await expect(bot.super.groups.getGroupMember('group-openid', 'member-openid')).resolves.toMatchObject({
      union_openid: 'union-member',
    })
    const info = await bot.getGroupMemberInfo('group-openid', 'member-openid')
    expect(info).toMatchObject({
      userId: 'member-openid',
      nick: '成员昵称',
      role: 'admin',
      joinTime: 1794902400000,
    })
    expect(info).not.toHaveProperty('unionOpenid')
    expect(info).not.toHaveProperty('avatar')
  })

  it('uses the exact Karin adapter return types without custom refinements', () => {
    expectTypeOf<ReturnType<AdapterQQBot['getStrangerInfo']>>().toEqualTypeOf<Promise<UserInfo>>()
    expectTypeOf<ReturnType<AdapterQQBot['getGroupInfo']>>().toEqualTypeOf<Promise<GroupInfo>>()
    expectTypeOf<ReturnType<AdapterQQBot['getGroupMemberInfo']>>().toEqualTypeOf<Promise<GroupMemberInfo>>()
    expectTypeOf<ReturnType<AdapterQQBot['getGroupMemberList']>>().toEqualTypeOf<Promise<GroupMemberInfo[]>>()
  })
})

const groupEvent = (data: Partial<GroupMsgEvent['d']> = {}): GroupMsgEvent =>
  ({
    op: 0,
    s: 1,
    t: EventEnum.GROUP_MESSAGE_CREATE,
    id: 'event-id',
    d: {
      id: 'message-id',
      timestamp: '2026-11-17T08:00:00Z',
      group_openid: 'group-a',
      content: '你好',
      author: {
        id: 'member-openid',
        member_openid: 'member-openid',
        username: 'QQ昵称',
        avatar: 'https://example.com/event-avatar.png',
        member_role: 'admin',
        member_nickname: '群内名片',
        union_openid: 'union-user',
        bot: false,
      },
      union_group_openid: 'union-group',
      ...data,
    },
  }) as GroupMsgEvent

describe('message profiles and group cards', () => {
  it.each(['member', 'list'] as const)(
    'does not refill a departed group profile from a pending %s query',
    async (kind) => {
      let complete!: (value: unknown) => void
      const response = new Promise<unknown>((resolve) => {
        complete = resolve
      })
      const { bot } = await createBot(() => response)
      const { cacheGroupMemberProfile, clearGroupMemberProfile, getGroupMemberProfile } =
        await import('@/core/adapter/profiles')
      cacheGroupMemberProfile(bot, 'group-a', 'member-openid', { card: '旧名片' })
      const query =
        kind === 'member' ? bot.getGroupMemberInfo('group-a', 'member-openid') : bot.getGroupMemberList('group-a')
      clearGroupMemberProfile(bot, 'group-a')
      const member = { member_openid: 'member-openid', username: '旧昵称', member_role: 'admin' }
      complete(kind === 'member' ? member : { members: [member], next_cursor: '' })
      await query
      expect(getGroupMemberProfile(bot, 'group-a', 'member-openid')).toBeUndefined()
    }
  )
  it('keeps QQ nickname and group card separate and reuses event avatars without an HTTP request', async () => {
    const { bot, requests, savedMessages } = await createBot(() => {
      throw new Error('no profile permission')
    })
    const { onGroupMsg } = await import('@/core/event/message')
    const event = groupEvent()
    const message = onGroupMsg(bot, event, { forceAtSelf: false })

    expect(message.sender).toMatchObject({
      userId: 'member-openid',
      nick: 'QQ昵称',
      name: 'QQ昵称',
      card: '群内名片',
      role: 'admin',
    })
    expect(message.rawEvent).toBe(event)
    expect(savedMessages[0]).toMatchObject({ sender: { card: '群内名片' } })
    await expect(bot.getAvatarUrl('member-openid')).resolves.toBe('https://example.com/event-avatar.png')
    expect(requests).toHaveLength(0)
    await expect(bot.getGroupMemberInfo('group-a', 'member-openid')).resolves.toMatchObject({
      nick: 'QQ昵称',
      card: '群内名片',
      role: 'unknown',
      sender: { card: '群内名片' },
    })
  })

  it('isolates a member card by group and bot instance while querying roles from the API', async () => {
    const { bot } = await createBot(() => {
      throw new Error('not permitted')
    })
    const other = await createBot(() => {
      throw new Error('not permitted')
    }, 'other-app')
    const { onGroupMsg } = await import('@/core/event/message')
    const event = groupEvent()
    onGroupMsg(bot, event, { forceAtSelf: false })
    onGroupMsg(
      bot,
      groupEvent({
        group_openid: 'group-b',
        author: { ...event.d.author, member_role: 'owner', member_nickname: '另一个群名片' },
      }),
      { forceAtSelf: false }
    )

    await expect(bot.getGroupMemberInfo('group-a', 'member-openid')).resolves.toMatchObject({
      role: 'unknown',
      card: '群内名片',
    })
    await expect(bot.getGroupMemberInfo('group-b', 'member-openid')).resolves.toMatchObject({
      role: 'unknown',
      card: '另一个群名片',
    })
    const unknown = await other.bot.getGroupMemberInfo('group-a', 'member-openid')
    expect(unknown.role).toBe('unknown')
    expect(unknown.card).toBeUndefined()
    await expect(other.bot.getAvatarUrl('member-openid')).resolves.toBe(
      'https://thirdqq.qlogo.cn/qqapp/other-app/member-openid/0'
    )
  })

  it('retains event cards while a native member query refreshes its QQ nickname and role', async () => {
    const { bot } = await createBot(() => ({
      member_openid: 'member-openid',
      username: '新QQ昵称',
      member_role: 'member',
    }))
    const { onGroupMsg } = await import('@/core/event/message')
    onGroupMsg(bot, groupEvent(), { forceAtSelf: false })

    await expect(bot.getGroupMemberInfo('group-a', 'member-openid')).resolves.toMatchObject({
      nick: '新QQ昵称',
      role: 'member',
      card: '群内名片',
      sender: { nick: '新QQ昵称', card: '群内名片' },
    })
    await expect(bot.getAvatarUrl('member-openid')).resolves.toBe('https://example.com/event-avatar.png')
  })

  it('uses group card names for mentions and retains their native QQ nicknames for profile lookup', async () => {
    const { bot } = await createBot(() => {
      throw new Error('not permitted')
    })
    const { onGroupMsg } = await import('@/core/event/message')
    const message = onGroupMsg(
      bot,
      groupEvent({
        content: '<@mentioned>',
        mentions: [
          {
            id: 'mentioned',
            member_openid: 'mentioned',
            username: '被提及QQ昵称',
            member_nickname: '被提及群名片',
            member_role: 'owner',
            bot: false,
            is_you: false,
            scope: 'single',
          },
        ],
      }),
      { forceAtSelf: false }
    )

    expect(message.elements).toContainEqual(
      expect.objectContaining({ type: 'at', targetId: 'mentioned', name: '被提及群名片' })
    )
    expect(bot.nicknameCache.get('mentioned')).toBe('被提及QQ昵称')
    await expect(bot.getGroupMemberInfo('group-a', 'mentioned')).resolves.toMatchObject({
      nick: '被提及QQ昵称',
      card: '被提及群名片',
      role: 'unknown',
    })
  })

  it('preserves omitted card fields but clears an explicitly empty card', async () => {
    const { bot } = await createBot(() => {
      throw new Error('not permitted')
    })
    const { onGroupMsg } = await import('@/core/event/message')
    onGroupMsg(bot, groupEvent(), { forceAtSelf: false })
    const legacy = groupEvent({ author: { id: 'member-openid', member_openid: 'member-openid', username: '' } })
    const message = onGroupMsg(bot, legacy, { forceAtSelf: false })
    expect(message.sender).toMatchObject({ nick: 'QQ昵称', card: '群内名片' })

    const cleared = onGroupMsg(bot, groupEvent({ author: { ...legacy.d.author, member_nickname: '' } }), {
      forceAtSelf: false,
    })
    expect(cleared.sender.card).toBe('')
    expect(cleared.sender.nick).toBe('QQ昵称')
  })

  it('caches the avatar and nickname supplied by a C2C event', async () => {
    const { bot, requests } = await createBot(() => {
      throw new Error('unexpected HTTP request')
    })
    const { onFriendMsg } = await import('@/core/event/message')
    const event: C2CMsgEvent = {
      op: 0,
      s: 1,
      t: EventEnum.C2C_MESSAGE_CREATE,
      id: 'c2c-event',
      d: {
        id: 'c2c-message',
        content: '你好',
        timestamp: '2026-11-17T08:00:00Z',
        author: {
          id: 'friend-openid',
          user_openid: 'friend-openid',
          username: '好友昵称',
          avatar: 'https://example.com/friend-avatar.png',
          bot: false,
        },
      },
    }
    const message = onFriendMsg(bot, event)

    expect(message.sender.nick).toBe('好友昵称')
    await expect(bot.getAvatarUrl('friend-openid')).resolves.toBe('https://example.com/friend-avatar.png')
    expect(requests).toHaveLength(0)
  })

  it('expires event avatars so a later lookup can obtain the updated image', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const { bot, requests } = await createBot(() => userInfo)
    const { onGroupMsg } = await import('@/core/event/message')
    onGroupMsg(bot, groupEvent(), { forceAtSelf: false })
    await expect(bot.getAvatarUrl('member-openid')).resolves.toBe('https://example.com/event-avatar.png')

    vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1)
    await expect(bot.getAvatarUrl('member-openid')).resolves.toBe('https://example.com/avatar.png?key=signed')
    expect(requests).toHaveLength(1)
  })

  it('clears only the departing member group profile while preserving another group', async () => {
    const { bot } = await createBot(() => {
      throw new Error('not permitted')
    })
    const { onGroupMsg } = await import('@/core/event/message')
    const { onGroupMemberRemove } = await import('@/core/event/notice')
    onGroupMsg(bot, groupEvent(), { forceAtSelf: false })
    onGroupMsg(bot, groupEvent({ group_openid: 'group-b' }), { forceAtSelf: false })
    onGroupMemberRemove(bot, {
      op: 0,
      s: 2,
      id: 'remove-event',
      t: EventEnum.GROUP_MEMBER_REMOVE,
      d: {
        timestamp: 1794902400,
        group_openid: 'group-a',
        member_openid: 'member-openid',
        union_group_openid: 'union-group',
      },
    })

    const removed = await bot.getGroupMemberInfo('group-a', 'member-openid')
    expect(removed.card).toBeUndefined()
    expect(removed.role).toBe('unknown')
    await expect(bot.getGroupMemberInfo('group-b', 'member-openid')).resolves.toMatchObject({
      card: '群内名片',
      role: 'unknown',
    })
  })

  it('clears the group cache on robot removal and the user avatar on friend deletion', async () => {
    const { bot } = await createBot(() => {
      throw new Error('not permitted')
    })
    const { onGroupMsg } = await import('@/core/event/message')
    const { onGroupDelRobot, onFriendDel } = await import('@/core/event/notice')
    onGroupMsg(bot, groupEvent(), { forceAtSelf: false })
    onGroupDelRobot(bot, {
      op: 0,
      s: 2,
      id: 'del-robot',
      t: EventEnum.GROUP_DEL_ROBOT,
      d: {
        timestamp: 1794902400,
        group_openid: 'group-a',
        op_member_openid: 'operator',
        union_group_openid: 'union-group',
      },
    })
    expect((await bot.getGroupMemberInfo('group-a', 'member-openid')).card).toBeUndefined()
    onFriendDel(bot, {
      op: 0,
      s: 3,
      id: 'friend-del',
      t: EventEnum.FRIEND_DEL,
      d: { timestamp: 1794902400, openid: 'member-openid' },
    })

    await expect(bot.getAvatarUrl('member-openid')).resolves.toBe(
      'https://thirdqq.qlogo.cn/qqapp/test-app/member-openid/0'
    )
    expect(bot.nicknameCache.has('member-openid')).toBe(false)
  })
})
