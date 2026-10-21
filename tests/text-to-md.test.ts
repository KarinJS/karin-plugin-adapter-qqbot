import { describe, expect, it } from 'vitest'
import { markdownPartToLine } from '@/core/adapter/text-to-md'

describe('markdownPartToLine', () => {
  it('keeps an existing qqbot-media image source instead of trying to upload it again', async () => {
    const line = await markdownPartToLine({
      type: 'image',
      source: 'qqbot-media://image/v1/token',
      alt: '素材图 #12px #12px',
    })

    expect(line).toContain('](qqbot-media://image/v1/token)')
  })

  it('adds a usable fallback size when a qqbot-media URL has no explicit dimensions', async () => {
    const line = await markdownPartToLine({
      type: 'image',
      source: 'qqbot-media://image/v1/token',
      alt: '素材图',
    })

    expect(line).toBe('![素材图 #300px #300px](qqbot-media://image/v1/token)')
  })
})
