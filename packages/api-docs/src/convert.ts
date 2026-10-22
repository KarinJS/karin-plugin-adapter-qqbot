import * as cheerio from 'cheerio'
import fs from 'fs-extra'
import html2md from 'html-to-md'
import { dirname, join, parse, relative } from 'node:path'
import { htmlDir, wikiDir } from './paths'

/** 从完整页面中提取正文，尽量避开导航、侧栏和页脚。 */
const extractMainContent = (html: string): string => {
  const $ = cheerio.load(html)

  $('script, style, nav, header, footer, .sidebar, aside, .ads, .comments').remove()

  let content = $(
    '.doc-content, .content, .markdown-body, .main-content, article, .article, #content, .post-content, .documentation, .doc, .wiki-content, [role="main"]'
  )

  if (content.length === 0) content = $('body')

  return content.html() || ''
}

const getMdPath = (htmlPath: string): string => {
  const relativePath = relative(htmlDir, htmlPath)
  const parsed = parse(relativePath)
  const mdFile = parsed.name === 'index' ? 'index.md' : `${parsed.name}.md`
  return join(wikiDir, parsed.dir, mdFile)
}

const convertFile = async (htmlPath: string): Promise<void> => {
  try {
    const html = await fs.readFile(htmlPath, 'utf-8')
    const mainContent = extractMainContent(html)

    if (!mainContent.trim()) {
      console.warn(`[WARN] 提取内容为空: ${htmlPath}`)
      return
    }

    const markdown = html2md(mainContent, {
      skipTags: ['script', 'style', 'noscript', 'iframe', 'canvas'],
      emptyTags: [],
      aliasTags: {
        figure: 'p',
        figcaption: 'p',
      },
    })

    const mdPath = getMdPath(htmlPath)
    await fs.ensureDir(dirname(mdPath))
    await fs.writeFile(mdPath, markdown, 'utf-8')
    console.log(`[CONVERT] ${htmlPath} -> ${mdPath}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[ERROR] 转换失败 ${htmlPath}: ${message}`)
  }
}

const walk = async (dir: string, files: string[]): Promise<void> => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(fullPath, files)
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath)
    }
  }
}

const main = async (): Promise<void> => {
  await fs.ensureDir(wikiDir)

  const files: string[] = []
  await walk(htmlDir, files)
  console.log(`发现 ${files.length} 个 HTML 文件，开始转换...\n`)

  for (const file of files) await convertFile(file)

  console.log(`\n完成！共转换 ${files.length} 个文件，保存在 ${wikiDir}/ 目录下。`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
