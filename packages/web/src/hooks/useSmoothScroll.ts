import { useEffect, type RefObject } from 'react'
import { attachSmoothScroll, detachSmoothScroll } from '@/lib/smoothScroll'

/**
 * 给一个滚动容器挂上 Lenis。
 * content 用来监听内容高度变化；不传时退化为容器本身。
 */
export const useSmoothScroll = <T extends HTMLElement>(
  wrapperRef: RefObject<T | null>,
  contentRef?: RefObject<HTMLElement | null>,
  { manual = false, enabled = true }: { manual?: boolean; enabled?: boolean } = {}
) => {
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper || !enabled) return

    attachSmoothScroll(wrapper, { content: contentRef?.current ?? null, manual })
    return () => detachSmoothScroll(wrapper)
  }, [wrapperRef, contentRef, manual, enabled])
}
