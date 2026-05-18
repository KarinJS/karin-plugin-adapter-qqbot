import { segment, fileToUrl } from 'node-karin'
import { handleUrl, getImageSize } from '@/utils/common'
import type { ButtonElement, MarkdownElement } from 'node-karin'

const MAX_BUTTONS = 5

/**
 * 提取文本中的 URL，将其替换为 `[按钮 N]` 占位文本并返回 button 列表
 *
 * @param text 文本
 * @param friendly 是否为单聊（true 时清除残余的 at 标签）
 */
export const extractUrlButtons = (
  text: string,
  friendly = false
): { text: string; buttons: ButtonElement[] } => {
  let str = text.replace(/@everyone/g, 'everyone').replace(/\n/g, '\r')
  if (friendly) {
    str = str
      .replace(/<qqbot-at-user id="[^"]+"\s*\/?>/g, '')
      .replace(/<@!\d+>/g, '')
  }

  const urls = handleUrl(str)
  if (urls.length === 0) return { text: str, buttons: [] }

  const buttons: ButtonElement[] = []
  urls.forEach((url, i) => {
    str = str.replace(new RegExp(url, 'g'), `[请点击 按钮${i} 查看]`)
    buttons.push(segment.button({ text: `${i}. ${url}`, link: url }))
  })

  return { text: str, buttons: buttons.slice(0, MAX_BUTTONS) }
}

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
