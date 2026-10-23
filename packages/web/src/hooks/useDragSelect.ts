import { useEffect, useRef, type RefObject } from 'react'

interface DragSelectOptions {
  containerRef: RefObject<HTMLElement | null>
  /** 可被选中的元素；按 DOM 顺序对应选项顺序。 */
  itemSelector: string
  onSelectIndex: (index: number) => void
  disabled?: boolean
}

const AXIS_LOCK = 6
const CLICK_SUPPRESS = 200

/**
 * 横向拖拽选择。
 *
 * 手机上按住分段标签横向移动时，按手指的横向位置选最近的标签，选中始终跟随手指。
 * 只有横向位移明显大于纵向时才接管手势，纵向仍然交给抽屉的滚动逻辑。
 * 拖拽结束后会拦掉尾随的 click / press，避免把选择改回按下的那个标签。
 */
export const useDragSelect = ({ containerRef, itemSelector, onSelectIndex, disabled }: DragSelectOptions) => {
  const onSelectRef = useRef(onSelectIndex)
  const disabledRef = useRef(disabled)

  useEffect(() => {
    onSelectRef.current = onSelectIndex
  }, [onSelectIndex])

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let touchId: number | null = null
    let startX = 0
    let startY = 0
    let engaged = false
    let lastIndex = -1
    let suppressClickUntil = 0

    const reset = () => {
      touchId = null
      engaged = false
      lastIndex = -1
    }

    /**
     * 按手指的横向位置选最近的标签，不要求手指正好落在标签矩形内。
     * 手指在标签间隙、或者上下稍微漂移时，选中仍然跟着手指走。
     */
    const selectAt = (x: number) => {
      const tabs = Array.from(container.querySelectorAll<HTMLElement>(itemSelector))
      if (tabs.length === 0) return

      let index = -1
      let distance = Infinity

      tabs.forEach((tab, i) => {
        if (tab.getAttribute('aria-disabled') === 'true' || tab.hasAttribute('data-disabled')) return

        const rect = tab.getBoundingClientRect()
        const next = Math.abs(x - (rect.left + rect.width / 2))
        if (next < distance) {
          distance = next
          index = i
        }
      })

      if (index < 0 || index === lastIndex) return

      lastIndex = index
      onSelectRef.current(index)
    }

    const onTouchStart = (event: TouchEvent) => {
      if (disabledRef.current || event.touches.length !== 1) {
        reset()
        return
      }

      const touch = event.touches[0]
      if (!touch) return

      touchId = touch.identifier
      startX = touch.clientX
      startY = touch.clientY
      engaged = false
      lastIndex = -1
    }

    const onTouchMove = (event: TouchEvent) => {
      if (touchId === null) return

      if (event.touches.length !== 1) {
        reset()
        return
      }

      const touch = event.touches[0]
      if (!touch) return

      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      if (!engaged) {
        if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return

        if (Math.abs(dx) <= Math.abs(dy) * 1.2) {
          // 纵向手势交给抽屉：收起、展开或滚动内容。
          if (Math.abs(dy) > Math.abs(dx) * 1.2) reset()
          return
        }

        engaged = true
        suppressClickUntil = performance.now() + CLICK_SUPPRESS
      }

      event.preventDefault()
      selectAt(touch.clientX)
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (touchId === null) return

      if (engaged) {
        // 拖拽已经改变了选择，不要再补发一次点击。
        event.preventDefault()
        suppressClickUntil = performance.now() + CLICK_SUPPRESS
      }

      reset()
    }

    const onTouchCancel = () => reset()

    // React Aria 的 Tab 在 pointerup 时会触发 press，可能把拖拽选中的标签改回按下的那个。
    // 拖拽期间在捕获阶段截住 pointerup，点击（轻点）不受影响。
    const onPointerUpCapture = (event: PointerEvent) => {
      if (!engaged) return
      event.preventDefault()
      event.stopPropagation()
    }

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil) {
        event.preventDefault()
        event.stopPropagation()
        suppressClickUntil = 0
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd, { passive: false })
    container.addEventListener('touchcancel', onTouchCancel)
    container.addEventListener('pointerup', onPointerUpCapture, true)
    container.addEventListener('click', onClickCapture, true)

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchCancel)
      container.removeEventListener('pointerup', onPointerUpCapture, true)
      container.removeEventListener('click', onClickCapture, true)
    }
  }, [containerRef, itemSelector])
}
