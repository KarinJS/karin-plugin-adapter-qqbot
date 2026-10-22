import { describe, expect, it } from 'vitest'
import { shouldHandleBuiltinFileToUrl } from '@/apps/qqbot-file-to-url'

describe('built-in QQBot fileToUrl handler', () => {
  it('skips images while the user fileToUrl stage is being tried', () => {
    expect(
      shouldHandleBuiltinFileToUrl({
        type: 'image',
        purpose: 'markdown',
        selfId: 'bot-1',
        origin: { scene: 'group', peer: 'group-1' },
        allowBuiltinFileToUrl: false,
      })
    ).toBe(false)
  })

  it('handles images after material management has failed', () => {
    expect(
      shouldHandleBuiltinFileToUrl({
        type: 'image',
        purpose: 'markdown',
        selfId: 'bot-1',
        origin: { scene: 'group', peer: 'group-1' },
        allowBuiltinFileToUrl: true,
      })
    ).toBe(true)
  })

  it('still handles non-image markdown media', () => {
    expect(
      shouldHandleBuiltinFileToUrl({
        type: 'video',
        purpose: 'markdown',
        selfId: 'bot-1',
        origin: { scene: 'group', peer: 'group-1' },
        allowBuiltinFileToUrl: true,
      })
    ).toBe(true)
  })
})
