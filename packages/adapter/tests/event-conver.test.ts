import { describe, expect, it } from 'vitest'
import { convertToKarin } from '@/core/event/conver'
import { EventEnum } from '@/types/event'
import type { C2CMsgEvent, GroupMsgEvent } from '@/types/event'

describe('convertToKarin group mentions', () => {
  it('restores member and all mentions from <@...> placeholders', () => {
    const event = {
      t: EventEnum.GROUP_MESSAGE_CREATE,
      id: 'event-1',
      d: {
        id: 'message-1',
        author: {
          id: 'sender-openid',
          member_openid: 'sender-openid',
          username: '发送者',
        },
        content: '你好 <@member-openid> <@all>',
        group_id: 'group-openid',
        group_openid: 'group-openid',
        timestamp: '2026-10-22T00:00:00Z',
        message_type: 0,
        mentions: [
          {
            id: 'member-openid',
            member_openid: 'member-openid',
            username: '小明',
            bot: false,
            is_you: false,
            scope: 'single',
          },
        ],
      },
    } as GroupMsgEvent

    const elements = convertToKarin('app-id', event, 'bot-sub-id')
    const mentions = elements.filter((element) => element.type === 'at')

    expect(mentions).toEqual([
      expect.objectContaining({ targetId: 'member-openid', name: '小明' }),
      expect.objectContaining({ targetId: 'all' }),
    ])
  })
})

describe('convertToKarin markdown images', () => {
  it('restores qqbot-media image references from markdown content', () => {
    const event = {
      t: EventEnum.C2C_MESSAGE_CREATE,
      id: 'event-1',
      d: {
        id: 'message-1',
        author: {
          id: 'bot-openid',
          user_openid: 'bot-openid',
          username: '机器人',
          bot: true,
        },
        content: '![素材图 #12px #12px](qqbot-media://image/v1/token)',
        timestamp: '2026-10-22T00:00:00Z',
        message_type: 103,
      },
    } as C2CMsgEvent

    const elements = convertToKarin('app-id', event, 'bot-sub-id')

    expect(elements).toContainEqual(
      expect.objectContaining({
        type: 'image',
        file: 'qqbot-media://image/v1/token',
      })
    )
  })
})
