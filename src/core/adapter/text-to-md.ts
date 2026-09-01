import { fileToUrl } from 'node-karin'
import { getImageSize } from '@/utils/common'
import { normalizeMediaSource } from './media-source'
import type { FileToUrlExtra } from './media-source'

const MARKDOWN_IMAGE_RE = /!\[([^\]]*)]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/g

/**
 * QQ markdown 图片语法里的显式尺寸：`#100px #100px`。
 *
 * `#` 是必需的——`100px 100px` 这种省略写法 QQ 前端不会按尺寸渲染，只能算
 * 普通描述文本。QQ 客户端按这个声明尺寸渲染而不是图片的物理分辨率——开发者
 * 显式写出尺寸是有布局意图的（比如把一张高清图当头像展示），重建时必须原样
 * 保留。
 */
const EXPLICIT_IMAGE_SIZE_RE = /#(\d+)px\s+#(\d+)px/

/** Markdown 图片拆分结果 */
export type MarkdownImagePart =
  | { type: 'text'; value: string }
  | { type: 'image'; source: string; alt: string }

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
  const result = await fileToUrl('image', normalizeMediaSource(source), 'image.jpg', extra)
  if (!result?.url) {
    throw new Error('[Handler][Error]: 没有 fileToUrl 处理器接手图片转 URL')
  }
  return result
}

/**
 * 生成一行 markdown 图片。
 *
 * alt 里带显式尺寸（`#100px #100px`）时原样保留，不探测图片真实尺寸——QQ 按
 * 声明尺寸渲染，覆盖它会破坏开发者的布局意图。没有显式尺寸时才用传入的或
 * 探测到的真实宽高补全。
 *
 * @param url 图片的最终公网 URL。
 * @param alt 原始 alt 文本，可能包含显式尺寸声明。
 * @param size 已知的图片真实尺寸；未提供且 alt 无显式尺寸时探测 URL。
 * @returns markdown 图片行。
 */
export const buildMarkdownImageLine = async (
  url: string,
  alt = '',
  size?: { width: number; height: number }
): Promise<string> => {
  const explicit = alt.match(EXPLICIT_IMAGE_SIZE_RE)
  if (explicit) {
    const desc = alt.replace(EXPLICIT_IMAGE_SIZE_RE, '').trim()
    return `![${desc} #${explicit[1]}px #${explicit[2]}px](${url})`
  }

  const desc = alt.trim() || 'karin'
  const resolved = size ?? await getImageSize(url).catch(() => ({ width: 300, height: 300 }))
  return `![${desc} #${resolved.width}px #${resolved.height}px](${url})`
}

/**
 * 生成一行"来源未解析"的 markdown 图片。
 *
 * 用于适配器自己拼 markdown 正文的场景（如合并转发）：只把原始来源写进图片语法，
 * 具体走内置图床、第三方 fileToUrl 还是降级成富媒体，留给发送 pipeline 在
 * `splitMarkdownImages` 之后统一决定，避免在 pipeline 之外重复一套上传逻辑。
 *
 * 本地路径可能带空格、`)` 等会截断图片语法的字符，因此来源统一用尖括号包住——
 * `splitMarkdownImages` 取出时会剥掉。
 *
 * @param source 原始来源：本地路径、`base64://` 或 URL。
 * @param alt 图片描述；`]` 与换行会截断语法，统一压成空格。
 * @param size 已知的真实宽高，写成显式尺寸可省掉 pipeline 的一次探测。
 * @returns markdown 图片行，来源仍是原始 file 字段。
 */
export const buildPendingMarkdownImageLine = (
  source: string,
  alt = '',
  size?: { width: number; height: number }
): string => {
  const desc = alt.replace(/[[\]\r\n]/g, ' ').trim() || 'karin'
  const explicit = size?.width && size?.height ? ` #${size.width}px #${size.height}px` : ''
  return `![${desc}${explicit}](<${normalizeMediaSource(source)}>)`
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
      return buildMarkdownImageLine(file)
    }
    const { url, width, height } = await imageToUrl(file, extra)
    return buildMarkdownImageLine(url, '', { width, height })
  }))
}

/**
 * 把一个拆分出来的 markdown 图片转成图片行，保留原始 alt 与显式尺寸。
 *
 * @param part splitMarkdownImages 拆出的图片片段。
 * @param extra 传给 fileToUrl 处理器的附加信息。
 * @returns markdown 图片行。
 */
export const markdownPartToLine = async (
  part: Extract<MarkdownImagePart, { type: 'image' }>,
  extra?: FileToUrlExtra
): Promise<string> => {
  if (part.source.startsWith('http')) {
    return buildMarkdownImageLine(part.source, part.alt)
  }
  const { url, width, height } = await imageToUrl(part.source, extra)
  return buildMarkdownImageLine(url, part.alt, { width, height })
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

    const alt = match[1] ?? ''
    const source = (match[2] || '').trim().replace(/^<|>$/g, '')
    if (source) parts.push({ type: 'image', source: normalizeMediaSource(source), alt })
    lastIndex = index + match[0].length
  }

  if (lastIndex < markdown.length) {
    const text = markdown.slice(lastIndex)
    if (text) parts.push({ type: 'text', value: text })
  }

  return parts.length ? parts : [{ type: 'text', value: markdown }]
}
