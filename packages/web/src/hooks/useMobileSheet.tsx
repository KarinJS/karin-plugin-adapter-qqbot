import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface MobileSheetContextValue {
  activeAppId: string | null
  isOpen: boolean
  open: (appId: string) => void
  close: () => void
}

const MobileSheetContext = createContext<MobileSheetContextValue | null>(null)

/**
 * 手机端机器人配置抽屉的全局状态。
 *
 * 抽屉挂在外壳层，背景缩放的也是整个外壳；列表和概览只负责调用 open。
 */
export const MobileSheetProvider = ({ children }: { children: ReactNode }) => {
  const [activeAppId, setActiveAppId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback((appId: string) => {
    setActiveAppId(appId)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const value = useMemo<MobileSheetContextValue>(
    () => ({ activeAppId, isOpen, open, close }),
    [activeAppId, close, isOpen, open]
  )

  return <MobileSheetContext.Provider value={value}>{children}</MobileSheetContext.Provider>
}

export const useMobileSheet = () => {
  const context = useContext(MobileSheetContext)
  if (!context) throw new Error('useMobileSheet 必须在 MobileSheetProvider 内使用')
  return context
}
