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
