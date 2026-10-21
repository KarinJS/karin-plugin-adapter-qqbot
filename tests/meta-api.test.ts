import { describe, expect, it, vi } from 'vitest'
import { MetaApi } from '@/core/api/meta'
import type { AxiosInstance } from '@/core/api/http'

const createApi = (post: ReturnType<typeof vi.fn>): MetaApi => {
  const axios = { post } as unknown as AxiosInstance
  return new MetaApi(axios)
}

describe('MetaApi.generateUrlLink', () => {
  it('normalizes the legacy url_link response to the documented data.url shape', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { url_link: 'https://qun.qq.com/qunpro/robot/qunshare?robot_appid=1' },
    })
    const api = createApi(post)

    await expect(api.generateUrlLink({ callback_data: 'source-a' })).resolves.toEqual({
      data: { url: 'https://qun.qq.com/qunpro/robot/qunshare?robot_appid=1' },
    })
    expect(post).toHaveBeenCalledWith(
      '/v2/generate_url_link',
      { callback_data: 'source-a' },
      expect.any(Object)
    )
  })
})
