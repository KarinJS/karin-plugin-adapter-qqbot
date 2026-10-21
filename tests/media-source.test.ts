import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolvePreferredMediaSource } from '@/core/adapter/media-source'
import type { AdapterQQBot } from '@/core/adapter/base'

const mocks = vi.hoisted(() => ({
  hasHandler: false,
  fileToUrl: vi.fn(),
}))

vi.mock('node-karin', async () => {
  const actual = await vi.importActual<typeof import('node-karin')>('node-karin')
  return {
    ...actual,
    fileToUrl: mocks.fileToUrl,
    handler: {
      ...actual.handler,
      has: vi.fn(() => mocks.hasHandler),
    },
  }
})

vi.mock('@/utils/common', () => ({
  getImageSize: vi.fn().mockResolvedValue({ width: 1, height: 1 }),
}))

const createContext = (upload: ReturnType<typeof vi.fn>, logger = vi.fn()): AdapterQQBot => ({
  selfId: 'bot-1',
  logger,
  super: { mediaImages: { upload } },
} as unknown as AdapterQQBot)

beforeEach(() => {
  mocks.hasHandler = false
  mocks.fileToUrl.mockReset()
})

describe('resolvePreferredMediaSource', () => {
  it('uses qqbot-media for a local markdown image when no fileToUrl handler exists', async () => {
    const upload = vi.fn().mockResolvedValue({
      image_id: 'image-1',
      url: 'qqbot-media://image/v1/token',
      ttl: 7776000,
    })
    const logger = vi.fn()

    await expect(resolvePreferredMediaSource(
      createContext(upload, logger),
      'image',
      'base64://iVBORw0KGgo=',
      undefined,
      { scene: 'user', peer: 'peer-1' },
      'markdown'
    )).resolves.toEqual({
      source: 'qqbot-media://image/v1/token',
      via: 'qqbot-media',
      size: { width: 1, height: 1 },
    })

    expect(upload).toHaveBeenCalledWith('base64://iVBORw0KGgo=', undefined)
    expect(logger).toHaveBeenCalledWith('debug', expect.stringContaining('素材管理上传成功'))
  })

  it('keeps the user fileToUrl handler ahead of material management', async () => {
    mocks.hasHandler = true
    mocks.fileToUrl.mockResolvedValue({ url: 'https://user.example/image', width: 2, height: 3 })
    const upload = vi.fn()

    await expect(resolvePreferredMediaSource(
      createContext(upload),
      'image',
      'base64://iVBORw0KGgo=',
      undefined,
      { scene: 'group', peer: 'group-1' },
      'markdown'
    )).resolves.toEqual({
      source: 'https://user.example/image',
      via: 'file-to-url',
      size: { width: 2, height: 3 },
    })

    expect(upload).not.toHaveBeenCalled()
    expect(mocks.fileToUrl).toHaveBeenCalledTimes(1)
    expect(mocks.fileToUrl.mock.calls[0][3]).toMatchObject({ allowBuiltinFileToUrl: false })
  })

  it('tries the built-in fileToUrl after material management fails', async () => {
    mocks.hasHandler = true
    mocks.fileToUrl.mockImplementation(async (
      _type: string,
      _source: string,
      _filename: string,
      extra: { allowBuiltinFileToUrl?: boolean }
    ) => {
      if (extra.allowBuiltinFileToUrl) {
        return { url: 'https://builtin.example/image', width: 4, height: 5 }
      }
      return undefined
    })
    const upload = vi.fn().mockRejectedValue(new Error('quota exceeded'))

    await expect(resolvePreferredMediaSource(
      createContext(upload),
      'image',
      'base64://iVBORw0KGgo=',
      undefined,
      { scene: 'group', peer: 'group-1' },
      'markdown'
    )).resolves.toEqual({
      source: 'https://builtin.example/image',
      via: 'file-to-url',
      size: { width: 4, height: 5 },
    })

    expect(upload).toHaveBeenCalledTimes(1)
    expect(mocks.fileToUrl).toHaveBeenCalledTimes(2)
    expect(mocks.fileToUrl.mock.calls[0][3]).toMatchObject({ allowBuiltinFileToUrl: false })
    expect(mocks.fileToUrl.mock.calls[1][3]).toMatchObject({ allowBuiltinFileToUrl: true })
  })

  it('keeps the rich-media fallback when every markdown source fails', async () => {
    const upload = vi.fn().mockRejectedValue(new Error('quota exceeded'))

    await expect(resolvePreferredMediaSource(
      createContext(upload),
      'image',
      'base64://iVBORw0KGgo=',
      undefined,
      { scene: 'group', peer: 'group-1' },
      'markdown'
    )).resolves.toEqual({
      source: 'base64://iVBORw0KGgo=',
      via: 'fallback',
    })
  })
})
