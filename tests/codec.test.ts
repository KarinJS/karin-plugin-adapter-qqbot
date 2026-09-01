/**
 * 消息段编解码、存储分级过滤、媒体相对路径与 ID hash。
 */
import { describe, expect, it } from 'vitest'
import { decodeElements, encodeElements, filterElementsByLevel } from '@/core/storage/message-store/codec'
import { hashId } from '@/core/storage/message-store/hash'
import { fromStoredFilePath, toStoredFilePath } from '@/core/storage/message-store/media'
import type { ElementTypes } from 'node-karin'

/** 覆盖全部可缓存类型，外加一个不支持的 keyboard 用来验证跳过。 */
const elements = [
  { type: 'text', text: '你好 world' },
  { type: 'at', targetId: 'U123' },
  { type: 'reply', messageId: 'REFIDX_abc' },
  { type: 'face', id: 5 },
  { type: 'image', file: 'https://example.com/a.jpg', subType: 'jpeg', width: 100, height: 200 },
  { type: 'video', file: 'https://example.com/v.mp4' },
  { type: 'record', file: 'https://example.com/r.mp3', magic: false },
  { type: 'file', file: 'https://example.com/f.bin', name: 'doc.pdf' },
  { type: 'markdown', markdown: '# title' },
  { type: 'keyboard', rows: [] },
] as unknown as ElementTypes[]

describe('编解码往返', () => {
  const encoded = encodeElements(elements)
  const decoded = decodeElements(encoded.json)

  it('reply 段被提取为 replyTo，供引用链解析', () => {
    expect(encoded.replyTo).toBe('REFIDX_abc')
  })

  it('跳过不支持的消息段', () => {
    expect(decoded).toHaveLength(9)
    expect(decoded.some(e => e.type === 'keyboard')).toBe(false)
  })

  it('文本、图片、文件名、markdown 原样还原', () => {
    expect(decoded[0]).toMatchObject({ type: 'text', text: '你好 world' })
    expect(decoded[4]).toMatchObject({
      type: 'image',
      file: 'https://example.com/a.jpg',
      subType: 'jpeg',
      width: 100,
      height: 200,
    })
    expect(decoded[7]).toMatchObject({ type: 'file', name: 'doc.pdf' })
    expect(decoded[8]).toMatchObject({ type: 'markdown', markdown: '# title' })
  })

  it('record 的 magic 变声标记两个取值都能往返', () => {
    expect(decoded[6]).toMatchObject({ magic: false })
    const magic = decodeElements(encodeElements([
      { type: 'record', file: 'https://x/r.mp3', magic: true },
    ] as unknown as ElementTypes[]).json)
    expect(magic[0]).toMatchObject({ magic: true })
  })

  it('超长文本截断到 4096 字符', () => {
    const long = decodeElements(encodeElements([
      { type: 'text', text: 'x'.repeat(10000) },
    ] as unknown as ElementTypes[]).json)
    expect(long[0]).toMatchObject({ type: 'text' })
    expect((long[0] as { text: string }).text).toHaveLength(4096)
  })

  it('非法 JSON 与非数组都容错为空', () => {
    expect(decodeElements('not json')).toHaveLength(0)
    expect(decodeElements('{"a":1}')).toHaveLength(0)
  })
})

describe('媒体相对路径', () => {
  it('media:// 与绝对路径互转', () => {
    const abs = fromStoredFilePath('media://image/abc.jpg')
    expect(abs).not.toMatch(/^media:\/\//)
    expect(abs.endsWith('abc.jpg')).toBe(true)
    expect(toStoredFilePath(abs)).toBe('media://image/abc.jpg')
  })

  it('http 地址两个方向都原样透传', () => {
    expect(toStoredFilePath('https://x/y.jpg')).toBe('https://x/y.jpg')
    expect(fromStoredFilePath('https://x/y.jpg')).toBe('https://x/y.jpg')
  })
})

describe('存储分级过滤', () => {
  it('full 保留全部消息段', () => {
    expect(filterElementsByLevel(elements, 'full')).toHaveLength(10)
  })

  it('standard 丢弃 markdown 原文', () => {
    const std = filterElementsByLevel(elements, 'standard')
    expect(std).toHaveLength(8)
    expect(std.some(e => e.type === 'markdown')).toBe(false)
  })

  it('minimal 只保留 reply，撤回与引用解析仍可用', () => {
    const min = filterElementsByLevel(elements, 'minimal')
    expect(min).toHaveLength(1)
    expect(min[0].type).toBe('reply')
  })

  it('缺省分级等价于 standard', () => {
    expect(filterElementsByLevel(elements)).toHaveLength(8)
  })
})

describe('ID hash', () => {
  it('同输入稳定、异输入敏感', () => {
    expect(hashId('REFIDX_abc')).toBe(hashId('REFIDX_abc'))
    expect(hashId('REFIDX_abc')).not.toBe(hashId('REFIDX_abd'))
  })

  it('长输入仍落在安全整数范围内', () => {
    expect(Number.isSafeInteger(hashId('x'.repeat(200)))).toBe(true)
  })

  it('10 万个真实形态消息 ID 无碰撞', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 100_000; i++) seen.add(hashId(`ROBOT1.0_${i}`))
    expect(seen.size).toBe(100_000)
  })
})
