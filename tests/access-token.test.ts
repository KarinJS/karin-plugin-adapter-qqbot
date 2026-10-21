import axios from 'node-karin/axios'
import { describe, expect, it, vi } from 'vitest'
import { getAccessToken } from '@/core/internal/axios'

describe('getAccessToken', () => {
  it('reports a business error returned with HTTP 200 using the QQ error code', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { code: 100007, message: 'appid invalid' },
    } as never)

    try {
      await expect(getAccessToken('app-id', 'secret')).rejects.toThrow(
        /\[HTTP 200\].*\[Code 100007\].*appid invalid/
      )
    } finally {
      post.mockRestore()
    }
  })
})
