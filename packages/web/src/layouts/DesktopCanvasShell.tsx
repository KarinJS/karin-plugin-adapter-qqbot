import type { ReactNode } from 'react'
import { CanvasPager, type CanvasPage } from '@/components/desktop/CanvasPager'

interface DesktopCanvasShellProps {
  sidebar: ReactNode
  pages: CanvasPage[]
  activeKey: string
}

/**
 * 桌面端画布外壳。
 *
 * 嵌入 Karin 和独立打开时共用同一块内容区：右侧是常驻的纵向画布，
 * 切页动画、滚动和表单翻页完全一致；两侧唯一的区别是左侧导航的形态。
 */
export const DesktopCanvasShell = ({ sidebar, pages, activeKey }: DesktopCanvasShellProps) => (
  <div className='flex h-dvh overflow-hidden bg-background'>
    {sidebar}
    <main className='min-w-0 flex-1'>
      <CanvasPager pages={pages} activeKey={activeKey} />
    </main>
  </div>
)
