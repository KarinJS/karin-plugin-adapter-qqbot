/**
 * 判断当前页面是否运行在 Karin 的 iframe 里。
 *
 * 嵌入时左侧换成图标栏，独立打开时保留完整侧边栏；
 * 右侧内容区共用同一张常驻画布。
 */
export const useEmbedded = () => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
}
