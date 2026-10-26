import { useEffect, useState } from 'react'

export interface Viewport {
  width: number
  height: number
}

const readViewport = (): Viewport => ({
  width: document.documentElement.clientWidth || window.innerWidth,
  height: window.innerHeight,
})

/**
 * 布局按实际宽度分叉，而不是只靠 CSS 断点。
 *
 * PC 和手机需要不同的导航结构、表单密度与操作位置，这里把判断结果交给 React。
 */
export const useViewport = () => {
  const [viewport, setViewport] = useState<Viewport>(readViewport)

  useEffect(() => {
    let frame = 0

    const sync = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = readViewport()
        setViewport((current) => {
          if (current.width === next.width && current.height === next.height) return current
          return next
        })
      })
    }

    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    window.visualViewport?.addEventListener('resize', sync)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      window.visualViewport?.removeEventListener('resize', sync)
    }
  }, [])

  return {
    ...viewport,
    isMobile: viewport.width < 900,
    isShort: viewport.height < 700,
    isTiny: viewport.width < 380,
    isLandscape: viewport.width > viewport.height,
  }
}
