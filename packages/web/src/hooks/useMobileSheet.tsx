import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface MobileSheetContextValue {
  activeAppId: string | null
  isOpen: boolean
  open: (appId: string) => void
  close: () => void
  isAddOpen: boolean
  openAdd: () => void
  closeAdd: () => void
}

const MobileSheetContext = createContext<MobileSheetContextValue | null>(null)

/**
 * 手机端底部抽屉的全局状态。
 *
 * 机器人配置和添加机器人共用一层外壳：抽屉挂在外壳之外，
 * 打开时由外壳负责压暗和缩放，列表与概览只负责调用 open / openAdd。
 */
export const MobileSheetProvider = ({ children }: { children: ReactNode }) => {
  const [activeAppId, setActiveAppId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)

  const open = useCallback((appId: string) => {
    setActiveAppId(appId)
    setIsAddOpen(false)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])
  const openAdd = useCallback(() => {
    setIsOpen(false)
    setIsAddOpen(true)
  }, [])
  const closeAdd = useCallback(() => setIsAddOpen(false), [])

  const value = useMemo<MobileSheetContextValue>(
    () => ({ activeAppId, isOpen, open, close, isAddOpen, openAdd, closeAdd }),
    [activeAppId, close, closeAdd, isAddOpen, isOpen, open, openAdd]
  )

  return <MobileSheetContext.Provider value={value}>{children}</MobileSheetContext.Provider>
}

export const useMobileSheet = () => {
  const context = useContext(MobileSheetContext)
  if (!context) throw new Error('useMobileSheet 必须在 MobileSheetProvider 内使用')
  return context
}
