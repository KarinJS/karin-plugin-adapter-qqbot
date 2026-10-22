import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ApiError, fetchConfig, fetchStatus, saveConfig as saveConfigRequest } from '@/lib/api'
import type { BotConfig, BotStatus } from '@/lib/types'

interface ConfigContextValue {
  config: BotConfig[]
  defaults: BotConfig | null
  version: string
  statuses: Record<string, BotStatus>
  loading: boolean
  saving: boolean
  error: string
  reload: () => Promise<void>
  save: (config: BotConfig[]) => Promise<void>
  remove: (appId: string) => Promise<void>
  clearError: () => void
}

const ConfigContext = createContext<ConfigContextValue | null>(null)

const toStatusMap = (bots: BotStatus[]) => Object.fromEntries(bots.map((bot) => [bot.appId, bot]))

export const ConfigProvider = ({ children, onAuthExpired }: { children: ReactNode; onAuthExpired: () => void }) => {
  const [config, setConfig] = useState<BotConfig[]>([])
  const [defaults, setDefaults] = useState<BotConfig | null>(null)
  const [version, setVersion] = useState('')
  const [statuses, setStatuses] = useState<Record<string, BotStatus>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const mounted = useRef(true)

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.authExpired) {
        onAuthExpired()
        return
      }
      setError(err instanceof Error ? err.message : '操作失败')
    },
    [onAuthExpired]
  )

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [configData, statusData] = await Promise.all([fetchConfig(), fetchStatus()])
      if (!mounted.current) return
      setConfig(configData.config)
      setDefaults(configData.defaults)
      setVersion(configData.version)
      setStatuses(toStatusMap(statusData.bots))
    } catch (err) {
      if (mounted.current) handleError(err)
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [handleError])

  useEffect(() => {
    mounted.current = true
    void reload()
    return () => {
      mounted.current = false
    }
  }, [reload])

  // 运行状态会随适配器重连变化，低频轮询即可，不需要用户手动刷新。
  useEffect(() => {
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return

      try {
        const data = await fetchStatus()
        if (mounted.current) setStatuses(toStatusMap(data.bots))
      } catch {
        // 状态轮询失败不打扰用户，下一次继续。
      }
    }

    const timer = setInterval(() => {
      void refresh()
    }, 30_000)

    return () => clearInterval(timer)
  }, [])

  const save = useCallback(
    async (next: BotConfig[]) => {
      setSaving(true)
      setError('')

      try {
        const data = await saveConfigRequest(next)
        if (!mounted.current) return
        setConfig(data.config)
        const statusData = await fetchStatus()
        if (mounted.current) setStatuses(toStatusMap(statusData.bots))
      } catch (err) {
        if (mounted.current) handleError(err)
        throw err
      } finally {
        if (mounted.current) setSaving(false)
      }
    },
    [handleError]
  )

  const remove = useCallback(
    async (appId: string) => {
      await save(config.filter((item) => item.appId !== appId))
    },
    [config, save]
  )

  const clearError = useCallback(() => setError(''), [])

  const value = useMemo<ConfigContextValue>(
    () => ({
      config,
      defaults,
      version,
      statuses,
      loading,
      saving,
      error,
      reload,
      save,
      remove,
      clearError,
    }),
    [clearError, config, defaults, error, loading, reload, remove, save, saving, statuses, version]
  )

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export const useConfigStore = () => {
  const context = useContext(ConfigContext)
  if (!context) throw new Error('useConfigStore 必须在 ConfigProvider 内使用')
  return context
}
