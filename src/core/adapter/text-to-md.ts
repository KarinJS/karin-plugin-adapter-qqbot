import { segment, fileToUrl } from 'node-karin'
import { getImageSize } from '@/utils/common'
import type { MarkdownElement } from 'node-karin'

const MARKDOWN_IMAGE_RE = /!\[[^\]]*]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/g

/** Markdown 图片拆分结果 */
export type MarkdownImagePart =
  | { type: 'text'; value: string }
  | { type: 'image'; source: string }

/**
 * 将图片列表合并到一段 markdown 文本内（每张图占一行）
 */
export const imagesToMarkdown = async (urls: string[]): Promise<string[]> => {
  return Promise.all(urls.map(async (file) => {
    if (file.startsWith('http')) {
      const { width, height } = await getImageSize(file)
      return `![karin #${width}px #${height}px](${file})`
    }
    const { url, width, height } = await fileToUrl('image', file, 'image.jpg')
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
export const base64ImageToMarkdown = async (src: string): Promise<string> => {
  const { url, width, height } = await fileToUrl('image', src, 'image.jpg')
  return `![karin #${width}px #${height}px](${url})`
}

/** 构造 markdown element */
export const composeMarkdown = (content: string): MarkdownElement => {
  return segment.markdown(content)
}
