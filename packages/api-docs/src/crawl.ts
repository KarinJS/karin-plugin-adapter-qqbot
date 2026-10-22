import * as cheerio from 'cheerio'
import fs from 'fs-extra'
import { dirname, join } from 'node:path'
import { htmlDir } from './paths'

const BASE_URL = 'https://bot.q.qq.com'
const START_PATH = '/wiki/develop/api-v2/'
const DELAY = 500

const crawled = new Set<string>()
const queue: string[] = [START_PATH]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 只保留 api-v2 文档路径，并归一化为本地文件路径。 */
const normalizePath = (input?: string): string | null => {
  if (!input) return null

  let urlPath = input
  if (urlPath.startsWith(BASE_URL)) urlPath = urlPath.slice(BASE_URL.length)

  if (!urlPath.startsWith('/wiki/develop/api-v2/')) return null

  const hashIndex = urlPath.indexOf('#')
  if (hashIndex !== -1) urlPath = urlPath.slice(0, hashIndex)

  if (urlPath.endsWith('/')) urlPath += 'index.html'
  return urlPath
}

const getFilePath = (urlPath: string) => join(htmlDir, urlPath.replace(/^\//, ''))

const crawlPage = async (urlPath: string): Promise<void> => {
  const normalizedPath = normalizePath(urlPath)
  if (!normalizedPath || crawled.has(normalizedPath)) return

  crawled.add(normalizedPath)
  const url = BASE_URL + normalizedPath

  try {
    console.log(`[GET] ${url}`)
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    })

    if (!response.ok) {
      console.warn(`[WARN] HTTP ${response.status}: ${url}`)
      return
    }

    const html = await response.text()
    const filePath = getFilePath(normalizedPath)
    await fs.ensureDir(dirname(filePath))
    await fs.writeFile(filePath, html, 'utf-8')
    console.log(`[SAVE] ${filePath} (${html.length} bytes)`)

    const $ = cheerio.load(html)
    const links = new Set<string>()

    $('a[href]').each((_, el) => {
      const normalized = normalizePath($(el).attr('href'))
      if (normalized && !crawled.has(normalized)) links.add(normalized)
    })

    for (const link of links) queue.push(link)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[ERROR] ${url}: ${message}`)
  }
}

const main = async (): Promise<void> => {
  await fs.ensureDir(htmlDir)

  while (queue.length > 0) {
    const batch = queue.splice(0, 3)
    await Promise.all(batch.map((urlPath) => crawlPage(urlPath)))
    await sleep(DELAY)
  }

  console.log(`\n完成！共爬取 ${crawled.size} 个页面，保存在 ${htmlDir}/ 目录下。`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
