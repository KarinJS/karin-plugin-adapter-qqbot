/**
 * 找到元素实际会滚动的祖先。
 *
 * 页面里嵌套了多层 [data-lenis-prevent]：宽屏时右侧编辑区自己滚，
 * 窄屏时内层只是普通容器、由整页滚。只按属性取最近的祖先会拿错层，
 * 所以还要看计算后的 overflow-y。
 */
export const findScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  let node = element?.parentElement ?? null

  while (node) {
    if (node.hasAttribute('data-lenis-prevent')) {
      const overflowY = getComputedStyle(node).overflowY
      if (overflowY === 'auto' || overflowY === 'scroll') return node
    }
    node = node.parentElement
  }

  return null
}
