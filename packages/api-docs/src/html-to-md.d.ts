declare module 'html-to-md' {
  export interface HtmlToMdOptions {
    skipTags?: string[]
    emptyTags?: string[]
    aliasTags?: Record<string, string>
    [key: string]: unknown
  }

  const html2md: (html: string, options?: HtmlToMdOptions) => string
  export default html2md
}
