import { useCallback, useEffect, useMemo, useState } from 'react'

const THEME_KEY = 'theme'
const THEME_EVENT = 'qqbot-theme-changed'
const KARIN_THEME_MESSAGE = 'karin-theme-change'

export type StoredTheme = 'system' | 'inverse'
export type AppliedTheme = 'light' | 'dark'

const isStoredTheme = (value: unknown): value is StoredTheme => value === 'system' || value === 'inverse'
const isAppliedTheme = (value: unknown): value is AppliedTheme => value === 'light' || value === 'dark'

const readStoredTheme = (): StoredTheme => {
  const raw = localStorage.getItem(THEME_KEY)
  if (isStoredTheme(raw)) return raw

  try {
    const parsed = JSON.parse(raw ?? '')
    if (isStoredTheme(parsed)) return parsed
  } catch {
    // Karin 主 WebUI 有时会把 theme 写成普通字符串，这里兼容非 JSON 值。
  }

  return 'system'
}

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

const resolveTheme = (theme: StoredTheme): AppliedTheme => {
  const dark = prefersDark()
  if (theme === 'system') return dark ? 'dark' : 'light'
  return dark ? 'light' : 'dark'
}

const applyTheme = (applied: AppliedTheme) => {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(applied)
  document.documentElement.dataset.theme = applied
  return applied
}

/**
 * 与 Karin 主 WebUI 共用的主题状态。
 *
 * Karin 只存 `system` / `inverse` 两种偏好，实际明暗由系统决定；
 * iframe 内还会接收父窗口的 `karin-theme-change` 消息。
 */
export const useTheme = () => {
  const [theme, setThemeState] = useState<StoredTheme>(readStoredTheme)
  const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>(() => resolveTheme(readStoredTheme()))

  const setTheme = useCallback((next: StoredTheme) => {
    localStorage.setItem(THEME_KEY, next)
    setThemeState(next)
    setAppliedTheme(applyTheme(resolveTheme(next)))
    window.dispatchEvent(new CustomEvent<StoredTheme>(THEME_EVENT, { detail: next }))
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'system' ? 'inverse' : 'system')
  }, [setTheme, theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemChange = () => {
      setAppliedTheme(applyTheme(resolveTheme(theme)))
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_KEY) return
      if (window.self !== window.top) return

      const next = readStoredTheme()
      setThemeState(next)
      setAppliedTheme(applyTheme(resolveTheme(next)))
    }

    const handleCustomEvent = (event: Event) => {
      const next = (event as CustomEvent<StoredTheme>).detail
      if (!isStoredTheme(next)) return
      setThemeState(next)
      setAppliedTheme(applyTheme(resolveTheme(next)))
    }

    const handleKarinMessage = (event: MessageEvent<unknown>) => {
      if (window.self === window.top || event.source !== window.parent) return
      if (!event.data || typeof event.data !== 'object') return
      if ((event.data as { type?: unknown }).type !== KARIN_THEME_MESSAGE) return

      const message = event.data as { theme?: unknown; appliedTheme?: unknown }
      const nextTheme = isStoredTheme(message.theme) ? message.theme : readStoredTheme()
      const nextApplied = isAppliedTheme(message.appliedTheme) ? message.appliedTheme : resolveTheme(nextTheme)

      localStorage.setItem(THEME_KEY, nextTheme)
      setThemeState(nextTheme)
      setAppliedTheme(applyTheme(nextApplied))
    }

    media.addEventListener('change', handleSystemChange)
    window.addEventListener('storage', handleStorage)
    window.addEventListener(THEME_EVENT, handleCustomEvent)
    window.addEventListener('message', handleKarinMessage)

    return () => {
      media.removeEventListener('change', handleSystemChange)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(THEME_EVENT, handleCustomEvent)
      window.removeEventListener('message', handleKarinMessage)
    }
  }, [theme])

  return useMemo(
    () => ({
      theme,
      appliedTheme,
      isDark: appliedTheme === 'dark',
      isSystem: theme === 'system',
      setTheme,
      toggleTheme,
    }),
    [appliedTheme, setTheme, theme, toggleTheme]
  )
}
