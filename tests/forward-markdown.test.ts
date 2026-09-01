/**
 * 合并转发拼 markdown 正文的往返。
 *
 * sendForwardMsg 只把图片的原始来源写进 markdown 图片语法，真正的上传交给发送
 * pipeline，pipeline 再用 splitMarkdownImages 把来源取回来。本地路径可能带空格、
 * base64 带 `=`、URL 带 query——这条往返一旦被正则截断，图片就会静默丢失。
 */
import { describe, expect, it } from 'vitest'
import { buildPendingMarkdownImageLine, splitMarkdownImages } from '@/core/adapter/text-to-md'

/** 走一遍"写入 markdown → pipeline 取回"，返回还原出的图片片段。 */
const roundTrip = (source: string, alt = '', size?: { width: number; height: number }) => {
  const parts = splitMarkdownImages(buildPendingMarkdownImageLine(source, alt, size))
  expect(parts).toHaveLength(1)
  const [part] = parts
  expect(part.type).toBe('image')
  if (part.type !== 'image') throw new Error('unreachable')
  return part
}

describe('来源原样往返', () => {
  it('带空格的本地路径不被贪婪正则截断', () => {
    const source = 'file://D:/My Pictures/a b.png'
    expect(roundTrip(source, '头像').source).toBe(source)
  })

  it('base64 的 = 填充与 +/ 字符不被吃掉', () => {
    const source = 'base64://aGVsbG8/d29ybGQrTw=='
    expect(roundTrip(source).source).toBe(source)
  })

  it('URL 的 query 原样保留', () => {
    const source = 'https://example.com/x.png?a=1&b=2'
    expect(roundTrip(source).source).toBe(source)
  })

  it('完整 data URL 归一为 base64://，与发送链路其余环节一致', () => {
    expect(roundTrip('data:image/png;base64,AAAA').source).toBe('base64://AAAA')
  })
})

describe('alt 与显式尺寸', () => {
  it('alt 里的 ] 会截断图片语法，先压成空格', () => {
    expect(roundTrip('/tmp/x.jpg', '坏]名字').alt).toBe('坏 名字')
  })

  it('换行同样压成空格', () => {
    expect(roundTrip('/tmp/x.jpg', '第一行\n第二行').alt).toBe('第一行 第二行')
  })

  it('空 alt 回落默认描述，不产出 ![](...)', () => {
    expect(roundTrip('/tmp/x.jpg').alt).toBe('karin')
  })

  it('消息段自带宽高时写成显式尺寸，pipeline 不再探测', () => {
    expect(roundTrip('/tmp/x.jpg', '头像', { width: 100, height: 200 }).alt).toBe('头像 #100px #200px')
  })

  it('宽高为 0 视为未知，交给 pipeline 探测', () => {
    expect(roundTrip('/tmp/x.jpg', '头像', { width: 0, height: 200 }).alt).toBe('头像')
  })
})

describe('多张图片与文本混排', () => {
  it('按原顺序还原文本与图片片段', () => {
    const md = [
      '第一段',
      buildPendingMarkdownImageLine('/tmp/a b.png', '甲'),
      '第二段',
      buildPendingMarkdownImageLine('https://example.com/c.png', '乙'),
    ].join('\n')

    const parts = splitMarkdownImages(md)
    expect(parts.map(p => p.type)).toEqual(['text', 'image', 'text', 'image'])
    expect(parts.filter(p => p.type === 'image').map(p => p.source))
      .toEqual(['/tmp/a b.png', 'https://example.com/c.png'])
  })
})
