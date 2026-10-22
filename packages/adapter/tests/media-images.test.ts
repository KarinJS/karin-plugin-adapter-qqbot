import crypto from 'node:crypto'
import axios from 'node-karin/axios'
import { describe, expect, it, vi } from 'vitest'
import { QQBotApi } from '@/core/api'
import { MediaImagesApi } from '@/core/api/media-images'
import type { AxiosInstance } from '@/core/api/http'

const createApi = (methods: Record<string, unknown>): MediaImagesApi => {
  return new MediaImagesApi(methods as unknown as AxiosInstance)
}

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlK0AAAAASUVORK5CYII=',
  'base64'
)

describe('QQBotApi material images', () => {
  it('exposes the mediaImages API module', () => {
    const api = new QQBotApi({} as AxiosInstance)
    expect(api.mediaImages).toBeDefined()
  })

  it('uses the official prepare, complete, list, and delete endpoints', async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        data: { upload_id: 'u1', presigned_url: 'https://put', expires_in: 3600 },
      })
      .mockResolvedValueOnce({
        data: { image_id: 'i1', url: 'qqbot-media://image/v1/token', ttl: 7776000 },
      })
    const get = vi.fn().mockResolvedValue({ data: { images: [], next_cursor: '', total: 0 } })
    const del = vi.fn().mockResolvedValue({ data: {} })
    const api = createApi({ post, get, delete: del })

    const prepareBody = {
      file_name: 'a.png',
      file_size: 8,
      content_type: 'image/png',
      md5: 'm',
      sha1: 's',
    }
    await expect(api.prepare(prepareBody)).resolves.toMatchObject({ upload_id: 'u1' })
    await expect(api.complete({ upload_id: 'u1', md5: 'm' })).resolves.toMatchObject({
      image_id: 'i1',
    })
    await expect(api.list({ cursor: 'next' })).resolves.toMatchObject({ total: 0 })
    await expect(api.delete('i1')).resolves.toEqual({})

    expect(post).toHaveBeenNthCalledWith(1, '/v2/media-images/prepare', prepareBody, expect.any(Object))
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/v2/media-images/complete',
      { upload_id: 'u1', md5: 'm' },
      expect.any(Object)
    )
    expect(get).toHaveBeenCalledWith('/v2/media-images', expect.objectContaining({ params: { cursor: 'next' } }))
    expect(del).toHaveBeenCalledWith('/v2/media-images/i1/delete', expect.any(Object))
  })

  it('accepts the base64:// source format used by the send pipeline', async () => {
    const post = vi.fn(async (requestPath: string, body: Record<string, unknown>) => {
      if (requestPath === '/v2/media-images/prepare') {
        expect(body).toMatchObject({ file_name: 'image.png', content_type: 'image/png' })
        return {
          data: {
            upload_id: 'u1',
            presigned_url: 'https://upload.example/image',
            expires_in: 3600,
          },
        }
      }
      if (requestPath === '/v2/media-images/complete') {
        return { data: { image_id: 'i1', url: 'qqbot-media://image/v1/token', ttl: 7776000 } }
      }
      throw new Error(`unexpected path: ${requestPath}`)
    })
    const put = vi.spyOn(axios, 'put').mockResolvedValue({} as never)
    const api = createApi({ post })

    try {
      await expect(api.upload(`base64://${PNG_1X1.toString('base64')}`)).resolves.toMatchObject({
        url: 'qqbot-media://image/v1/token',
      })
    } finally {
      put.mockRestore()
    }
  })

  it('accepts a raw base64 image source', async () => {
    const post = vi.fn(async (requestPath: string, body: Record<string, unknown>) => {
      if (requestPath === '/v2/media-images/prepare') {
        expect(body).toMatchObject({ file_name: 'image.png', content_type: 'image/png' })
        return {
          data: {
            upload_id: 'u1',
            presigned_url: 'https://upload.example/image',
            expires_in: 3600,
          },
        }
      }
      if (requestPath === '/v2/media-images/complete') {
        return { data: { image_id: 'i1', url: 'qqbot-media://image/v1/token', ttl: 7776000 } }
      }
      throw new Error(`unexpected path: ${requestPath}`)
    })
    const put = vi.spyOn(axios, 'put').mockResolvedValue({} as never)
    const api = createApi({ post })

    try {
      await expect(api.upload(PNG_1X1.toString('base64'))).resolves.toMatchObject({
        url: 'qqbot-media://image/v1/token',
      })
    } finally {
      put.mockRestore()
    }
  })

  it('reuses the uploaded material when the same image is sent again', async () => {
    const post = vi.fn(async (requestPath: string) => {
      if (requestPath === '/v2/media-images/prepare') {
        return {
          data: {
            upload_id: 'u1',
            presigned_url: 'https://upload.example/image',
            expires_in: 3600,
          },
        }
      }
      if (requestPath === '/v2/media-images/complete') {
        return { data: { image_id: 'i1', url: 'qqbot-media://image/v1/token', ttl: 7776000 } }
      }
      throw new Error(`unexpected path: ${requestPath}`)
    })
    const put = vi.spyOn(axios, 'put').mockResolvedValue({} as never)
    const api = createApi({ post })

    try {
      await api.upload(PNG_1X1)
      await api.upload(PNG_1X1)
      expect(post).toHaveBeenCalledTimes(2)
      expect(put).toHaveBeenCalledTimes(1)
    } finally {
      put.mockRestore()
    }
  })

  it('uploads an image buffer through prepare, presigned PUT, and complete', async () => {
    const post = vi.fn(async (requestPath: string, body: Record<string, unknown>) => {
      if (requestPath === '/v2/media-images/prepare') {
        expect(body).toMatchObject({
          file_name: 'image.png',
          file_size: PNG_1X1.length,
          content_type: 'image/png',
          md5: crypto.createHash('md5').update(PNG_1X1).digest('hex'),
          sha1: crypto.createHash('sha1').update(PNG_1X1).digest('hex'),
        })
        return {
          data: {
            upload_id: 'u1',
            presigned_url: 'https://upload.example/image',
            expires_in: 3600,
          },
        }
      }
      if (requestPath === '/v2/media-images/complete') {
        expect(body).toEqual({
          upload_id: 'u1',
          md5: crypto.createHash('md5').update(PNG_1X1).digest('hex'),
        })
        return { data: { image_id: 'i1', url: 'qqbot-media://image/v1/token', ttl: 7776000 } }
      }
      throw new Error(`unexpected path: ${requestPath}`)
    })
    const put = vi.spyOn(axios, 'put').mockResolvedValue({} as never)
    const api = createApi({ post })

    try {
      await expect(api.upload(PNG_1X1)).resolves.toMatchObject({
        image_id: 'i1',
        url: 'qqbot-media://image/v1/token',
      })
      expect(put).toHaveBeenCalledWith(
        'https://upload.example/image',
        PNG_1X1,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'image/png' }),
        })
      )
    } finally {
      put.mockRestore()
    }
  })
})
