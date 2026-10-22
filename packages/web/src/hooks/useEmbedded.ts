/**
 * 判断当前页面是否运行在 Karin 的 iframe 里。
 *
 * 嵌入时使用精简外壳，独立打开时保留完整控制台。
 */
export const useEmbedded = () => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}
