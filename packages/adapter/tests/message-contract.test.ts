import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cleanupTestSandbox, createBot } from './helpers/bot'
import { EventEnum } from '@/types/event'
import type { C2CMsgEvent, GroupMsgEvent } from '@/types/event'

let sandbox: string
let originalCwd: string

beforeAll(() => {
  originalCwd = process.cwd()
  sandbox = mkdtempSync(join(tmpdir(), 'qqbot-message-contract-'))
  process.chdir(sandbox)
})

afterAll(() => cleanupTestSandbox(sandbox, originalCwd))

const card = {
  type: 'tuwen' as const,
  content: {
    title: '活动邀请',
    description: '周末读书会',
    url: 'https://example.com/activity',
    pic_url: 'https://example.com/cover.png',
  },
}

describe('official message request contracts', () => {
  it('keeps the wakeup flag in C2C messages and strips it from group messages without changing the caller payload', async () => {
    const { bot, requests } = await createBot(() => ({ id: 'sent-message', timestamp: 1794902400 }))
    const body = { ...bot.super.qq.text('召回消息'), is_wakeup: true }

    await bot.super.messages.sendFriendMsg('user-openid', body)
    await bot.super.messages.sendGroupMsg('group-openid', body)
    expect(requests).toEqual([
      {
        method: 'post',
        url: '/v2/users/user-openid/messages',
        body: { msg_type: 0, content: '召回消息', is_wakeup: true },
      },
      { method: 'post', url: '/v2/groups/group-openid/messages', body: { msg_type: 0, content: '召回消息' } },
    ])
    expect(body.is_wakeup).toBe(true)
  })

  it.each([true, false])('preserves the nested Markdown image verification flag: %s', async (verify) => {
    const { bot, requests } = await createBot(() => ({ id: 'sent-message', timestamp: 1794902400 }))
    const body = bot.super.qq.markdown({
      content: '![封面](https://example.com/cover.png)',
      force_verify_image_resource: verify,
    })
    await bot.super.messages.sendGroupMsg('group-openid', body)
    expect(requests[0].body).toEqual({
      msg_type: 2,
      markdown: { content: '![封面](https://example.com/cover.png)', force_verify_image_resource: verify },
    })
  })
})

describe('standard bot card messages', () => {
  it.each(['friend', 'group'] as const)('sends an official card through Karin JSON in %s', async (scene) => {
    const { bot, requests } = await createBot(() => ({ id: 'sent-card', timestamp: 1794902400 }))
    const { karin, segment } = await import('node-karin')
    const contact = scene === 'friend' ? karin.contactFriend('user-openid') : karin.contactGroup('group-openid')
    const result = await bot.sendMsg(contact, [segment.json(JSON.stringify({ msg_type: 8, card }))])

    expect(result.messageId).toBe('sent-card')
    expect(requests).toEqual([
      {
        method: 'post',
        url: scene === 'friend' ? '/v2/users/user-openid/messages' : '/v2/groups/group-openid/messages',
        body: { msg_type: 8, card },
      },
    ])
  })

  it('also accepts the documented MessageCard object as the JSON payload', async () => {
    const { bot, requests } = await createBot(() => ({ id: 'sent-card', timestamp: 1794902400 }))
    const { karin, segment } = await import('node-karin')
    await bot.sendMsg(karin.contactFriend('user-openid'), [segment.json(JSON.stringify(card))])
    expect(requests[0].body).toEqual({ msg_type: 8, card })
  })

  it('sends card buttons separately instead of attaching the rejected keyboard field to msg_type=8', async () => {
    const { bot, requests } = await createBot(() => ({ id: 'sent-card', timestamp: 1794902400 }))
    const { karin, segment } = await import('node-karin')
    await bot.sendMsg(karin.contactGroup('group-openid'), [
      segment.json(JSON.stringify({ msg_type: 8, card })),
      segment.button([{ text: '帮助', data: '帮助' }]),
    ])
    const bodies = requests.map((request) => request.body)
    expect(bodies).toHaveLength(2)
    expect(bodies).toContainEqual({ msg_type: 8, card })
    expect(bodies).toContainEqual(expect.objectContaining({ msg_type: 2, keyboard: expect.any(Object) }))
  })

  it('caches its sent JSON content when full message caching is enabled', async () => {
    const { bot, savedMessages } = await createBot(() => ({ id: 'sent-card', timestamp: 1794902400 }))
    const { karin, segment } = await import('node-karin')
    const json = JSON.stringify({ msg_type: 8, card })
    await bot.sendMsg(karin.contactGroup('group-openid'), [segment.json(json)])
    expect(savedMessages).toContainEqual(
      expect.objectContaining({
        messageId: 'sent-card',
        elements: [expect.objectContaining({ type: 'json', data: json })],
      })
    )
  })

  it('rejects a recognizable card with invalid content before making an HTTP request', async () => {
    const { bot, requests } = await createBot(() => ({ id: 'sent-card', timestamp: 1794902400 }))
    const { karin, segment } = await import('node-karin')
    await expect(
      bot.sendMsg(karin.contactGroup('group-openid'), [
        segment.json(JSON.stringify({ msg_type: 8, card: { type: 'tuwen', content: { title: 1 } } })),
      ])
    ).rejects.toThrow('图文卡片')
    expect(requests).toHaveLength(0)
  })

  it.each([
    ['friend', 4],
    ['group', 5],
  ] as const)('limits one batch of %s passive replies to %i messages', async (scene, limit) => {
    const { bot, requests } = await createBot(() => ({ id: 'sent-card', timestamp: 1794902400 }))
    const { karin, segment } = await import('node-karin')
    const contact = scene === 'friend' ? karin.contactFriend('user-openid') : karin.contactGroup('group-openid')
    await bot.sendMsg(contact, [
      ...Array.from({ length: 6 }, () => segment.json(JSON.stringify({ msg_type: 8, card }))),
      segment.pasmsg('source-message'),
    ])
    expect(requests).toHaveLength(limit)
    expect(requests.map((request) => request.body)).toEqual(
      Array.from({ length: limit }, () =>
        expect.objectContaining({ msg_type: 8, msg_id: 'source-message', msg_seq: expect.any(Number) })
      )
    )
  })

  it('allows the same number of active group cards without imposing the passive reply limit', async () => {
    const { bot, requests } = await createBot(() => ({ id: 'sent-card', timestamp: 1794902400 }))
    const { karin, segment } = await import('node-karin')
    await bot.sendMsg(
      karin.contactGroup('group-openid'),
      Array.from({ length: 6 }, () => segment.json(JSON.stringify({ msg_type: 8, card })))
    )
    expect(requests).toHaveLength(6)
  })
})

describe('received structured cards', () => {
  it.each([EventEnum.C2C_MESSAGE_CREATE, EventEnum.GROUP_MESSAGE_CREATE] as const)(
    'preserves ARK data as a Karin JSON element in %s',
    async (type) => {
      const { bot } = await createBot(() => ({}))
      const { convertToKarin } = await import('@/core/event/conver')
      const ark = {
        ark_type: 'tuwen',
        prompt: '活动邀请',
        fields: {
          title: '活动邀请',
          desc: '周末读书会',
          jump_url: 'https://example.com/activity',
          preview: 'https://example.com/cover.png',
        },
      }
      const event = {
        op: 0,
        s: 1,
        t: type,
        id: 'event',
        d: {
          id: 'message',
          author: { id: 'sender', bot: false },
          timestamp: '2026-11-17T08:00:00Z',
          group_openid: 'group-openid',
          content: '',
          message_type: 3,
          ark_data: ark,
        },
      } as C2CMsgEvent | GroupMsgEvent
      expect(convertToKarin(bot.selfId, event, 'bot-user-id')).toEqual([
        expect.objectContaining({ type: 'json', data: JSON.stringify(ark) }),
      ])
    }
  )

  it('uses the reference card data rather than the current message card', async () => {
    const { convertReferenceToKarin } = await import('@/core/event/conver')
    const quoted = { ark_type: 'feed', fields: { title: '引用的卡片' } }
    const event: C2CMsgEvent = {
      op: 0,
      s: 1,
      t: EventEnum.C2C_MESSAGE_CREATE,
      id: 'event',
      d: {
        id: 'message',
        timestamp: '2026-11-17T08:00:00Z',
        author: { id: 'sender' },
        content: '',
        message_type: 3,
        ark_data: { ark_type: 'feed', fields: { title: '当前卡片' } },
      },
    }
    expect(
      convertReferenceToKarin('app', event, 'bot', {
        msg_idx: 'REFIDX_quoted',
        content: '',
        message_type: 3,
        ark_data: quoted,
      })
    ).toEqual([expect.objectContaining({ type: 'json', data: JSON.stringify(quoted) })])
  })
})
