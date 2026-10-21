import { describe, expect, it } from 'vitest'
import type { GroupMemberAddEvent } from '@/types/event'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
  ? true
  : false
type Expect<T extends true> = T

type GroupMemberAddHasUserOpenid = 'user_openid' extends keyof GroupMemberAddEvent['d'] ? true : false
type GroupMemberAddMatchesDocs = Expect<Equal<GroupMemberAddHasUserOpenid, false>>

describe('event types', () => {
  it('matches the documented GROUP_MEMBER_ADD payload', () => {
    const matchesDocs: GroupMemberAddMatchesDocs = true
    expect(matchesDocs).toBe(true)
  })
})
