import { segment, fileToUrl } from 'node-karin'
import { getImageSize } from '@/utils/common'
import type { FileToUrlExtra } from './media-source'
import type { MarkdownElement } from 'node-karin'

const MARKDOWN_IMAGE_RE = /!\[[^\]]*]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/g

/** Markdown 图片拆分结果 */
export type MarkdownImagePart =
  | { type: 'text'; value: string }
  | { type: 'image'; source: string }

/**
 * 调用 fileToUrl 并确认真的拿到了 URL。
 *
 * Karin 的 handler 链允许每个处理器调用 next() 放行，全部放行时 fileToUrl 会
 * 返回 undefined 而不是抛错。这里统一转成明确的错误信息，避免调用方拿到
 * undefined 后在解构处报出难以定位的 TypeError。
 *
 * @param source 图片来源。
 * @param extra 传给处理器的附加信息，至少标明执行发送的 bot。
 * @returns fileToUrl 的图片结果。
 */
const imageToUrl = async (
  source: string,
  extra?: FileToUrlExtra
): Promise<{ url: string; width: number; height: number }> => {
  const result = await fileToUrl('image', source, 'image.jpg', extra)
  if (!result?.url) {
    throw new Error('[Handler][Error]: 没有 fileToUrl 处理器接手图片转 URL')
  }
  return result
}

/**
 * 将图片列表合并到一段 markdown 文本内（每张图占一行）
 *
 * @param urls 图片来源列表。
 * @param extra 传给 fileToUrl 处理器的附加信息。
 * @returns markdown 图片行。
 */
export const imagesToMarkdown = async (
  urls: string[],
  extra?: FileToUrlExtra
): Promise<string[]> => {
  return Promise.all(urls.map(async (file) => {
    if (file.startsWith('http')) {
      const { width, height } = await getImageSize(file)
      return `![karin #${width}px #${height}px](${file})`
    }
    const { url, width, height } = await imageToUrl(file, extra)
    return `![karin #${width}px #${height}px](${url})`
  }))
}

/**
 * 将 markdown 文本拆为普通文本片段与图片来源。
 */
export const splitMarkdownImages = (markdown: string): MarkdownImagePart[] => {
  const parts: MarkdownImagePart[] = []
  let lastIndex = 0

  for (const match of markdown.matchAll(MARKDOWN_IMAGE_RE)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      const text = markdown.slice(lastIndex, index)
      if (text) parts.push({ type: 'text', value: text })
    }

    const source = (match[1] || '').trim().replace(/^<|>$/g, '')
    if (source) parts.push({ type: 'image', source })
    lastIndex = index + match[0].length
  }

  if (lastIndex < markdown.length) {
    const text = markdown.slice(lastIndex)
    if (text) parts.push({ type: 'text', value: text })
  }

  return parts.length ? parts : [{ type: 'text', value: markdown }]
}

/**
 * 把一段 base64 / 本地图片转 url 后嵌入 markdown
 */
export const base64ImageToMarkdown = async (src: string, extra?: FileToUrlExtra): Promise<string> => {
  const { url, width, height } = await imageToUrl(src, extra)
  return `![karin #${width}px #${height}px](${url})`
}

/** 构造 markdown element */
export const composeMarkdown = (content: string): MarkdownElement => {
  return segment.markdown(content)
}
