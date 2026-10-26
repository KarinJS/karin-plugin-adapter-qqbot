const EXPANDED_HEADER_PADDING = 'max(0.5rem, env(safe-area-inset-top))'

/**
 * 顶栏在全屏时让开刘海。
 *
 * 顶栏底色和顶部模糊层不跟着拖动 / 吸附 / 进出场切换：
 * 这些手势里抽屉都是整块平移，模糊层和它下面的内容相对静止，
 * 重新取样没有意义；中途改 display 或底色反而会在安卓上闪一下，
 * 拖动高度时还会把模糊渐变变成一块半透明白底。
 */
export const syncSheetChrome = (dialog: HTMLElement | null | undefined) => {
  if (!dialog) return

  const expanded = dialog.dataset.sheetExpanded === 'true'
  const header = dialog.querySelector<HTMLElement>('[data-sheet-header]')
  if (header) header.style.paddingTop = expanded ? EXPANDED_HEADER_PADDING : ''
}
