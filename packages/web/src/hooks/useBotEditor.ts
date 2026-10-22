import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useConfigStore } from '@/hooks/useConfigStore'
import type { SaveState } from '@/components/SaveStatus'
import type { BotConfig } from '@/lib/types'

const cloneBot = (bot: BotConfig): BotConfig => structuredClone(bot)

/**
 * 服务端会重新格式化配置，对象键顺序可能变化；比较草稿时忽略顺序。
 */
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .toSorted()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export interface BotEditor {
  draft: BotConfig
  errors: Record<string, string>
  dirty: boolean
  saving: boolean
  error: string
  saveState: SaveState
  patch: (next: Partial<BotConfig>) => void
  reset: () => void
  submit: (event?: FormEvent<HTMLFormElement>) => Promise<BotConfig | null>
  clearError: () => void
}

/**
 * 机器人配置草稿、校验和保存逻辑。
 *
 * 桌面表单、手机底部抽屉和手机详情页共用这一份状态，避免三处保存行为分叉。
 */
export const useBotEditor = (bot: BotConfig): BotEditor => {
  const { config, save, saving, error, clearError } = useConfigStore()
  const [draft, setDraft] = useState<BotConfig>(() => cloneBot(bot))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    setDraft(cloneBot(bot))
    setErrors({})
  }, [bot])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const showSaveState = (next: SaveState, hideAfter?: number) => {
    window.clearTimeout(timerRef.current)
    setSaveState(next)
    if (hideAfter) {
      timerRef.current = window.setTimeout(() => setSaveState('idle'), hideAfter)
    }
  }

  const otherAppIds = config.filter((item) => item.appId !== bot.appId).map((item) => item.appId)
  const dirty = stableStringify(draft) !== stableStringify(bot)

  const patch = (next: Partial<BotConfig>) => {
    setDraft((current) => ({ ...current, ...next }))
    clearError()
  }

  const reset = () => {
    setDraft(cloneBot(bot))
    setErrors({})
    clearError()
    window.clearTimeout(timerRef.current)
    setSaveState('idle')
  }

  const validate = (value: BotConfig) => {
    const next: Record<string, string> = {}
    const appId = value.appId.trim()

    if (!appId) next.appId = '请填写 AppID'
    else if (/\s/.test(appId)) next.appId = 'AppID 不能包含空格'
    else if (otherAppIds.includes(appId)) next.appId = '这个 AppID 已经存在'

    if (value.event.type !== 0 && !value.secret.trim()) {
      next.secret = '连接机器人需要 AppSecret，扫码授权会自动填写'
    }

    return next
  }

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()

    const nextErrors = validate(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return null

    const normalized: BotConfig = {
      ...draft,
      appId: draft.appId.trim(),
      secret: draft.secret.trim(),
      regex: draft.regex.map((rule) => ({ reg: rule.reg.trim(), rep: rule.rep })).filter((rule) => rule.reg.length > 0),
    }

    const nextConfig = config.map((item) => (item.appId === bot.appId ? normalized : item))

    showSaveState('saving')

    try {
      await save(nextConfig)
      setDraft(cloneBot(normalized))
      showSaveState('saved', 1600)
      return normalized
    } catch {
      showSaveState('error', 3200)
      return null
    }
  }

  return {
    draft,
    errors,
    dirty,
    saving,
    error,
    saveState,
    patch,
    reset,
    submit,
    clearError,
  }
}
