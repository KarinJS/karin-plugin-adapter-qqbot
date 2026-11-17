import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import axios from 'node-karin/axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediaApi } from '@/core/api/media'
import type { AxiosInstance } from '@/core/api/http'

vi.mock('@/core/api/upload-cache', () => ({
  getCachedUpload: vi.fn().mockResolvedValue(null),
  setCachedUpload: vi.fn().mockResolvedValue(undefined),
}))

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('MediaApi.uploadFallback', () => {
  it.each(['user', 'group'] as const)(
    'uses zero-based parts, string wire sizes, and nested concurrency for %s uploads',
    async (scene) => {
      const uploaded: Buffer[] = []
      let active = 0
      let maxActive = 0
      const put = vi.spyOn(axios, 'put').mockImplementation(async (_url, data) => {
        uploaded.push(Buffer.from(data as Uint8Array))
        maxActive = Math.max(maxActive, ++active)
        await Promise.resolve()
        active--
        return {} as never
      })
      const post = vi.fn(async (requestPath: string, _body?: Record<string, unknown>) => {
        if (requestPath.endsWith('/upload_prepare'))
          return {
            data: {
              upload_id: 'upload-docs',
              block_size: '4',
              parts: [
                { index: 0, block_size: '4', presigned_url: 'https://upload.example/0' },
                { index: 1, block_size: '4', presigned_url: 'https://upload.example/1' },
              ],
              upload_config: { concurrency: 2, retry_timeout: 30, retry_delay: 1 },
            },
          }
        if (requestPath.endsWith('/upload_part_finish')) return { data: {} }
        return { data: { file_uuid: 'file-docs', file_info: 'FI', ttl: 60 } }
      })
      const api = new MediaApi({ post } as unknown as AxiosInstance)
      try {
        await api.uploadFallback(scene, 'peer-openid', 'image', 'base64://iVBORw0KGgo=', false, 'image.png', true)
        expect(uploaded.map((buffer) => buffer.toString('hex'))).toEqual(['89504e47', '0d0a1a0a'])
        expect(maxActive).toBe(2)
        const prepare = post.mock.calls.find((call) => call[0].endsWith('/upload_prepare'))?.[1]
        expect(prepare).toMatchObject({
          file_size: '8',
          file_name: 'image.png',
          file_type: 1,
          md5_10m: expect.any(String),
        })
        const finished = post.mock.calls
          .filter((call) => call[0].endsWith('/upload_part_finish'))
          .map((call) => call[1])
        expect(finished).toEqual([
          expect.objectContaining({ part_index: 0, block_size: '4', md5: expect.any(String) }),
          expect.objectContaining({ part_index: 1, block_size: '4', md5: expect.any(String) }),
        ])
      } finally {
        put.mockRestore()
      }
    }
  )

  it('honors the nested upload_config retry delay for transient part completion errors', async () => {
    vi.useFakeTimers()
    const put = vi.spyOn(axios, 'put').mockResolvedValue({} as never)
    let finishes = 0
    const post = vi.fn(async (requestPath: string) => {
      if (requestPath.endsWith('/upload_prepare'))
        return {
          data: {
            upload_id: 'upload-delay',
            block_size: '8',
            parts: [{ index: 0, block_size: '8', presigned_url: 'https://upload.example/0' }],
            upload_config: { concurrency: 1, retry_timeout: 3, retry_delay: 2 },
          },
        }
      if (requestPath.endsWith('/upload_part_finish') && ++finishes <= 2)
        throw new Error('[Code 40093001] temporary transfer failure')
      return { data: { file_uuid: 'file-delay', file_info: 'FI', ttl: 60 } }
    })
    const api = new MediaApi({ post } as unknown as AxiosInstance)
    try {
      const upload = api.uploadFallback('user', 'peer', 'image', 'base64://iVBORw0KGgo=', false, 'image.png', true)
      await vi.advanceTimersByTimeAsync(0)
      expect(finishes).toBe(2)
      await vi.advanceTimersByTimeAsync(1000)
      expect(finishes).toBe(2)
      await vi.advanceTimersByTimeAsync(1000)
      await expect(upload).resolves.toMatchObject({ file_info: 'FI' })
      expect(finishes).toBe(3)
    } finally {
      put.mockRestore()
      vi.useRealTimers()
    }
  })

  it('stops part completion retries at the nested upload_config timeout', async () => {
    vi.useFakeTimers()
    const put = vi.spyOn(axios, 'put').mockResolvedValue({} as never)
    const post = vi.fn(async (requestPath: string) => {
      if (requestPath.endsWith('/upload_prepare'))
        return {
          data: {
            upload_id: 'upload-timeout',
            block_size: '8',
            parts: [{ index: 0, block_size: '8', presigned_url: 'https://upload.example/0' }],
            upload_config: { concurrency: 1, retry_timeout: 1, retry_delay: 1 },
          },
        }
      if (requestPath.endsWith('/upload_part_finish')) throw new Error('[Code 40093001] temporary transfer failure')
      return { data: { file_uuid: 'file', file_info: 'FI', ttl: 60 } }
    })
    const api = new MediaApi({ post } as unknown as AxiosInstance)
    let error: unknown
    try {
      const upload = api
        .uploadFallback('group', 'peer', 'image', 'base64://iVBORw0KGgo=', false, 'image.png', true)
        .catch((err) => {
          error = err
        })
      await vi.advanceTimersByTimeAsync(1200)
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('upload_part_finish 持续重试超时：1s')
      await upload
    } finally {
      put.mockRestore()
      vi.useRealTimers()
    }
  })
  it('includes file_name when uploading an image as binary data', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'qqbot-media-'))
    tempDirs.push(dir)
    const file = path.join(dir, 'sample.png')
    await writeFile(file, Buffer.from('89504e470d0a1a0a', 'hex'))

    const post = vi.fn().mockResolvedValue({ data: { file_info: 'FI', ttl: 60 } })
    const api = new MediaApi({ post } as unknown as AxiosInstance)

    await api.uploadFallback('user', 'peer-openid', 'image', file)

    expect(post).toHaveBeenCalledTimes(1)
    expect(post.mock.calls[0][1]).toMatchObject({
      file_type: 1,
      file_name: 'sample.png',
      file_data: expect.any(String),
    })
  })

  it('routes a local binary source through the fallback uploader', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'qqbot-media-'))
    tempDirs.push(dir)
    const file = path.join(dir, 'sample.png')
    await writeFile(file, Buffer.from('89504e470d0a1a0a', 'hex'))

    const post = vi.fn().mockResolvedValue({ data: { file_info: 'FI', ttl: 60 } })
    const api = new MediaApi({ post } as unknown as AxiosInstance)

    await api.upload('user', 'peer-openid', 'image', file)

    expect(post.mock.calls[0][1]).toMatchObject({
      file_type: 1,
      file_name: 'sample.png',
      file_data: expect.any(String),
    })
  })

  it('can force the chunked flow for small image fallbacks', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'qqbot-media-'))
    tempDirs.push(dir)
    const file = path.join(dir, 'small.png')
    await writeFile(file, Buffer.from('89504e470d0a1a0a', 'hex'))

    const put = vi.spyOn(axios, 'put').mockResolvedValue({} as never)
    const post = vi.fn(async (requestPath: string, _body?: Record<string, unknown>) => {
      if (requestPath.endsWith('/upload_prepare')) {
        return {
          data: {
            upload_id: 'upload-1',
            block_size: 1024,
            parts: [{ index: 1, presigned_url: 'https://upload.example/part-1' }],
            concurrency: 1,
          },
        }
      }
      if (requestPath.endsWith('/upload_part_finish')) return { data: {} }
      if (requestPath.endsWith('/files')) return { data: { file_info: 'FI', ttl: 0 } }
      throw new Error(`unexpected path: ${requestPath}`)
    })
    const api = new MediaApi({ post } as unknown as AxiosInstance)

    try {
      await api.uploadFallback('group', 'group-openid', 'image', file, false, undefined, true)
      expect(post.mock.calls.map((call) => call[0])).toEqual([
        '/v2/groups/group-openid/upload_prepare',
        '/v2/groups/group-openid/upload_part_finish',
        '/v2/groups/group-openid/files',
      ])
    } finally {
      put.mockRestore()
    }
  })

  it('uses the chunked flow for a binary upload larger than 5MB even when srv_send_msg is true', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'qqbot-media-'))
    tempDirs.push(dir)
    const file = path.join(dir, 'large.mp4')
    await writeFile(file, Buffer.alloc(5 * 1024 * 1024 + 1))

    const put = vi.spyOn(axios, 'put').mockResolvedValue({} as never)
    const post = vi.fn(async (requestPath: string, _body?: Record<string, unknown>) => {
      if (requestPath.endsWith('/upload_prepare')) {
        return {
          data: {
            upload_id: 'upload-1',
            block_size: 5 * 1024 * 1024,
            parts: [{ index: 1, presigned_url: 'https://upload.example/part-1' }],
            concurrency: 1,
          },
        }
      }
      if (requestPath.endsWith('/upload_part_finish')) return { data: {} }
      if (requestPath.endsWith('/files')) return { data: { file_info: 'FI', ttl: 0, id: 'MSG-1' } }
      throw new Error(`unexpected path: ${requestPath}`)
    })
    const api = new MediaApi({ post } as unknown as AxiosInstance)

    try {
      await api.uploadFallback('group', 'group-openid', 'video', file, true)

      expect(post.mock.calls.map((call) => call[0])).toEqual([
        '/v2/groups/group-openid/upload_prepare',
        '/v2/groups/group-openid/upload_part_finish',
        '/v2/groups/group-openid/files',
      ])
      expect(post.mock.calls[2][1]).toMatchObject({ upload_id: 'upload-1', srv_send_msg: true })
      expect(put).toHaveBeenCalledTimes(1)
    } finally {
      put.mockRestore()
    }
  })
})
