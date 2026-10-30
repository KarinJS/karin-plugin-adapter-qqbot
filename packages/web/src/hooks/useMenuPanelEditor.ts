import { toast } from '@heroui/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SaveState } from '@/components/SaveStatus'
import { useConfigStore } from '@/hooks/useConfigStore'
import {
  createPanel as createPanelRequest,
  deletePanel as deletePanelRequest,
  fetchMenu,
  fetchPanel,
  fetchPanels,
  saveMenu as saveMenuRequest,
  updatePanel as updatePanelRequest,
  updatePanelTarget as updatePanelTargetRequest,
} from '@/lib/menuPanelApi'
import {
  MAX_CREATE_OPENIDS,
  MAX_MENU_ITEMS,
  MAX_PANEL_ITEMS,
  MAX_PANEL_OPENIDS,
  MAX_PANEL_TARGET_BATCH,
  MAX_PANELS,
  MAX_SUB_MENU_ITEMS,
  emptyMenuDraft,
  emptyMenuItem,
  emptyMenuSubItem,
  emptyPanelDraft,
  emptyPanelItem,
  findSceneAllPanel,
  isMenuDirty,
  isPanelDirty,
  menuContent,
  menuResponseToDraft,
  menuSignatureOf,
  panelContent,
  panelCreateRequest,
  panelRecordToDraft,
  panelSignatureOf,
  panelTargetDiff,
  resetMenuDraft,
  resetPanelDraft,
  validateMenuDraft,
  validatePanelDraft,
  type MenuDraft,
  type MenuItemDraft,
  type MenuSubItemDraft,
  type PanelDraft,
  type PanelItemDraft,
} from '@/lib/menuPanelDraft'
import type { PanelItemType, PanelScene, UpdatePanelTargetRequest } from '@/lib/menuPanelTypes'

export type EditorTab = 'panels' | 'menu'
export type LoadState = 'loading' | 'ready' | 'error'

const emptyLoadState = (): Record<PanelScene, LoadState> => ({ c2c: 'loading', group: 'loading' })

const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const move = <T>(list: T[], from: number, to: number): T[] => {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/**
 * 指令面板 / 自定义菜单的编辑状态。
 *
 * 所有修改先落在草稿里，只有点保存才写回 QQ 开放平台；
 * 保存期间继续编辑的内容不会被当成已保存，基线按实际发出的请求体计算。
 *
 * `active` 用于常驻画布：页面在后台时不请求 QQ 接口，也不在切回时
 * 丢掉还没保存的草稿。
 */
export const useMenuPanelEditor = (active = true) => {
  const { config, statuses, loading: configLoading } = useConfigStore()

  const [appId, setAppId] = useState('')
  const [scene, setScene] = useState<PanelScene>('c2c')
  const [tab, setTab] = useState<EditorTab>('panels')
  const [panels, setPanels] = useState<PanelDraft[]>([])
  const [menu, setMenu] = useState<MenuDraft | null>(null)
  const [selectedPanelKey, setSelectedPanelKey] = useState<string | null>(null)
  const [panelLoad, setPanelLoad] = useState<Record<PanelScene, LoadState>>(emptyLoadState)
  const [menuLoad, setMenuLoad] = useState<LoadState>('loading')
  const [error, setError] = useState('')
  const [panelErrors, setPanelErrors] = useState<Record<string, string>>({})
  const [menuErrors, setMenuErrors] = useState<Record<string, string>>({})
  const [savingPanel, setSavingPanel] = useState(false)
  const [savingMenu, setSavingMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const loadIdRef = useRef(0)
  const loadedAppIdRef = useRef<string | null>(null)
  const hasLoadedRef = useRef(false)
  const saveTimerRef = useRef<number | undefined>(undefined)
  const targetLoadingRef = useRef(new Set<string>())
  const panelsRef = useRef<PanelDraft[]>([])
  const sceneRef = useRef(scene)
  panelsRef.current = panels
  sceneRef.current = scene

  // 默认选中第一个在线的机器人；配置还没加载完时留空。
  useEffect(() => {
    if (appId && config.some((bot) => bot.appId === appId)) return
    const preferred = config.find((bot) => statuses[bot.appId]?.online) ?? config[0]
    setAppId(preferred?.appId ?? '')
  }, [appId, config, statuses])

  const showSaveState = useCallback((next: SaveState, hideAfter?: number) => {
    window.clearTimeout(saveTimerRef.current)
    setSaveState(next)
    if (hideAfter) {
      saveTimerRef.current = window.setTimeout(() => setSaveState('idle'), hideAfter)
    }
  }, [])

  useEffect(() => () => window.clearTimeout(saveTimerRef.current), [])

  const reload = useCallback(async () => {
    const requestId = ++loadIdRef.current
    setError('')

    if (!appId) {
      setPanels([])
      setMenu(null)
      setSelectedPanelKey(null)
      setPanelLoad({ c2c: 'ready', group: 'ready' })
      setMenuLoad('ready')
      loadedAppIdRef.current = ''
      hasLoadedRef.current = true
      return
    }

    setPanelLoad(emptyLoadState())
    setMenuLoad('loading')

    const [menuResult, c2cResult, groupResult] = await Promise.allSettled([
      fetchMenu(appId),
      fetchPanels(appId, 'c2c'),
      fetchPanels(appId, 'group'),
    ])
    if (loadIdRef.current !== requestId) return

    const nextPanels: PanelDraft[] = []
    const nextLoad: Record<PanelScene, LoadState> = { c2c: 'ready', group: 'ready' }
    const failures: string[] = []

    for (const [key, result] of [
      ['c2c', c2cResult],
      ['group', groupResult],
    ] as const) {
      if (result.status === 'rejected') {
        nextLoad[key] = 'error'
        failures.push(key === 'c2c' ? '单聊面板' : '群聊面板')
        // 单个场景请求失败时保留本地已有面板，避免一次刷新把整屏清空。
        nextPanels.push(...panelsRef.current.filter((panel) => panel.scope === key))
        continue
      }
      for (const record of result.value.records ?? []) {
        if (record.scope !== key) continue
        nextPanels.push(panelRecordToDraft(record))
      }
    }

    let nextMenu: MenuDraft | null = null
    if (menuResult.status === 'fulfilled') {
      nextMenu = menuResponseToDraft(menuResult.value)
      setMenuLoad('ready')
    } else {
      setMenuLoad('error')
      failures.push('自定义菜单')
    }

    setPanels(nextPanels)
    setMenu(nextMenu)
    setPanelLoad(nextLoad)
    setPanelErrors({})
    setMenuErrors({})
    setSelectedPanelKey((current) => {
      if (current && nextPanels.some((panel) => panel.key === current && panel.scope === sceneRef.current)) {
        return current
      }
      return nextPanels.find((panel) => panel.scope === sceneRef.current)?.key ?? null
    })

    if (failures.length > 0) {
      setError(`以下数据加载失败：${failures.join('、')}。请检查机器人配置后刷新重试。`)
    }

    loadedAppIdRef.current = appId
    hasLoadedRef.current =
      menuResult.status === 'fulfilled' || c2cResult.status === 'fulfilled' || groupResult.status === 'fulfilled'
  }, [appId])

  useEffect(() => {
    if (!active) return
    if (hasLoadedRef.current && loadedAppIdRef.current === appId) return

    void reload()
    return () => {
      // 机器人切换后丢弃上一轮请求的结果。
      loadIdRef.current += 1
    }
  }, [active, appId, reload])

  // 当前场景没有可用选中项时自动落到第一个面板。
  useEffect(() => {
    const list = panels.filter((panel) => panel.scope === scene)
    setSelectedPanelKey((current) => {
      if (current && list.some((panel) => panel.key === current)) return current
      return list[0]?.key ?? null
    })
  }, [panels, scene])

  // 自定义菜单只在单聊生效，切到群聊时回到面板页。
  useEffect(() => {
    if (scene === 'group' && tab === 'menu') setTab('panels')
  }, [scene, tab])

  const selectedPanel = useMemo(
    () => panels.find((panel) => panel.key === selectedPanelKey) ?? null,
    [panels, selectedPanelKey]
  )

  const scenePanels = useMemo(() => panels.filter((panel) => panel.scope === scene), [panels, scene])

  /** 当前场景已有的全局面板；同一场景只允许存在一个。 */
  const sceneAllPanel = useMemo(() => findSceneAllPanel(panels, scene), [panels, scene])

  // 指定生效的面板列表里不带 openid，选中后补一次详情请求。
  const targetKey = selectedPanel?.key
  const targetPanelId = selectedPanel?.panelId
  const targetType = selectedPanel?.targetType
  const targetLoaded = selectedPanel?.targetLoaded

  useEffect(() => {
    if (!appId || !targetKey || !targetPanelId || targetType !== 'specific' || targetLoaded) return
    if (targetLoadingRef.current.has(targetPanelId)) return
    targetLoadingRef.current.add(targetPanelId)

    let cancelled = false
    const loadTarget = async () => {
      try {
        const detail = await fetchPanel(appId, targetPanelId)
        if (cancelled) return

        const userOpenids = detail.user_openids ?? []
        const groupOpenids = detail.group_openids ?? []

        setPanels((current) =>
          current.map((panel) => {
            if (panel.key !== targetKey) return panel
            const saved = panel.saved
              ? {
                  ...panel.saved,
                  userOpenids: [...userOpenids],
                  groupOpenids: [...groupOpenids],
                  version: detail.version ?? panel.saved.version,
                }
              : null
            const next: PanelDraft = {
              ...panel,
              userOpenids,
              groupOpenids,
              targetLoaded: true,
              targetError: null,
              version: detail.version ?? panel.version,
              saved,
            }
            // 详情回来前用户可能已经改过内容，基线要用服务端保存的内容，
            // 这样这些编辑仍然保持 dirty。
            next.baseline = saved
              ? panelSignatureOf({
                  scope: panel.scope,
                  targetType: panel.targetType,
                  panel: saved.panel,
                  userOpenids,
                  groupOpenids,
                })
              : panelSignatureOf({
                  scope: panel.scope,
                  targetType: panel.targetType,
                  panel: panelContent(panel),
                  userOpenids,
                  groupOpenids,
                })
            return next
          })
        )
      } catch (err) {
        if (cancelled) return
        const message = messageOf(err, '读取面板生效对象失败')
        setPanels((current) =>
          current.map((panel) =>
            panel.key === targetKey ? { ...panel, targetLoaded: true, targetError: message } : panel
          )
        )
        setError(message)
        toast.danger('读取生效对象失败', { description: message })
      } finally {
        targetLoadingRef.current.delete(targetPanelId)
      }
    }

    void loadTarget()
    return () => {
      cancelled = true
    }
  }, [appId, targetKey, targetPanelId, targetType, targetLoaded])

  const retrySelectedTarget = useCallback(() => {
    if (!selectedPanel || selectedPanel.targetType !== 'specific' || !selectedPanel.targetError) return
    setPanels((current) =>
      current.map((panel) =>
        panel.key === selectedPanel.key ? { ...panel, targetLoaded: false, targetError: null } : panel
      )
    )
    setError('')
  }, [selectedPanel])

  const updateSelectedPanel = useCallback(
    (updater: (panel: PanelDraft) => PanelDraft) => {
      if (!selectedPanelKey) return
      setPanels((current) => current.map((panel) => (panel.key === selectedPanelKey ? updater(panel) : panel)))
      setPanelErrors({})
    },
    [selectedPanelKey]
  )

  const updateMenu = useCallback((updater: (draft: MenuDraft) => MenuDraft) => {
    setMenu((current) => (current ? updater(current) : current))
    setMenuErrors({})
  }, [])

  const changeAppId = useCallback(
    (next: string) => {
      if (next === appId) return
      hasLoadedRef.current = false
      setAppId(next)
      setPanels([])
      setMenu(null)
      setSelectedPanelKey(null)
      setPanelErrors({})
      setMenuErrors({})
      setError('')
    },
    [appId]
  )

  const changeScene = useCallback((next: PanelScene) => {
    setScene(next)
    if (next === 'group') setTab('panels')
  }, [])

  const changeTab = useCallback((next: EditorTab) => {
    if (next === 'menu' && sceneRef.current === 'group') return
    setTab(next)
  }, [])

  const createDraftPanel = useCallback(() => {
    if (panels.length >= MAX_PANELS && panelLoad.c2c === 'ready' && panelLoad.group === 'ready') {
      toast.warning(`一个机器人最多创建 ${MAX_PANELS} 个指令面板`)
      return
    }

    const currentScene = sceneRef.current
    const existingAll = findSceneAllPanel(panelsRef.current, currentScene)
    // 平台会把同场景的第二个 all 面板当成替换：再 POST 一个会顶掉旧的。
    // 所以全局面板已存在时，新建的只能是指定生效面板。
    const draft = emptyPanelDraft(currentScene, existingAll ? 'specific' : 'all')
    setPanels((current) => [...current, draft])
    setSelectedPanelKey(draft.key)
    setTab('panels')
    setPanelErrors({})

    if (existingAll) {
      toast.warning('同一场景只能有一个全局面板', {
        description: '已为你新建指定生效面板；如需修改全局面板，请直接选择现有的全局面板。',
      })
    }
  }, [panels.length, panelLoad])

  const discardSelectedPanel = useCallback(() => {
    if (!selectedPanel) return
    if (!selectedPanel.saved) {
      setPanels((current) => current.filter((panel) => panel.key !== selectedPanel.key))
      setSelectedPanelKey(null)
      return
    }
    const reset = resetPanelDraft(selectedPanel)
    if (!reset) return
    setPanels((current) => current.map((panel) => (panel.key === reset.key ? reset : panel)))
    setPanelErrors({})
  }, [selectedPanel])

  const saveSelectedPanel = useCallback(async (): Promise<boolean> => {
    const draft = selectedPanel
    if (!draft || savingPanel) return false
    if (draft.targetType === 'specific' && !draft.targetLoaded) {
      toast.warning('正在读取生效对象，请稍候再保存')
      return false
    }

    // 双保险：即使草稿是通过旧状态或并发操作进来的，也不允许再 POST 一个
    // 同场景的 all 面板——平台会用新面板替换旧面板。
    if (!draft.panelId && draft.targetType === 'all') {
      const existingAll = findSceneAllPanel(panelsRef.current, draft.scope, draft.key)
      if (existingAll) {
        const message = '同一场景只能有一个全局面板，请直接编辑现有的全局面板，或改用指定生效。'
        setError(message)
        toast.warning('无法创建全局面板', { description: message })
        return false
      }
    }

    const errors = validatePanelDraft(draft)
    setPanelErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.danger('请先修正面板中的问题')
      return false
    }

    const payload = panelContent(draft)
    const userOpenids = draft.scope === 'c2c' ? [...draft.userOpenids] : []
    const groupOpenids = draft.scope === 'group' ? [...draft.groupOpenids] : []
    const signature = panelSignatureOf({
      scope: draft.scope,
      targetType: draft.targetType,
      panel: payload,
      userOpenids,
      groupOpenids,
    })

    setSavingPanel(true)
    setError('')
    showSaveState('saving')

    try {
      let panelId = draft.panelId
      let version = draft.version
      // 更新时带上读取到的版本号，让平台有机会发现并发修改；
      // 创建接口不接收版本号，新面板的 version 等下次刷新再补。
      const updatePayload = draft.version === null ? payload : { ...payload, version: draft.version }

      if (!panelId) {
        const created = await createPanelRequest(appId, panelCreateRequest(draft))
        panelId = created.panel_id
      } else {
        const updated = await updatePanelRequest(appId, panelId, updatePayload)
        version = updated.version
      }

      if (draft.targetType === 'specific') {
        const diff = panelTargetDiff(draft)
        const field = draft.scope === 'c2c' ? 'user_openids' : 'group_openids'
        for (const [op, ids] of [
          ['add', diff.added],
          ['del', diff.removed],
        ] as const) {
          for (let index = 0; index < ids.length; index += MAX_PANEL_TARGET_BATCH) {
            const chunk = ids.slice(index, index + MAX_PANEL_TARGET_BATCH)
            const body: UpdatePanelTargetRequest = { op }
            if (field === 'user_openids') body.user_openids = chunk
            else body.group_openids = chunk
            await updatePanelTargetRequest(appId, panelId, body)
          }
        }
      }

      setPanels((current) =>
        current.map((panel) => {
          if (panel.key !== draft.key) return panel
          const saved = {
            panel: structuredClone(payload),
            userOpenids: [...userOpenids],
            groupOpenids: [...groupOpenids],
            version,
          }
          return {
            ...panel,
            panelId,
            version,
            targetLoaded: true,
            targetError: null,
            saved,
            baseline: signature,
          }
        })
      )
      showSaveState('saved', 1600)
      toast.success(draft.panelId ? '面板已保存' : '面板已创建')
      return true
    } catch (err) {
      const message = messageOf(err, '保存面板失败')
      setError(message)
      showSaveState('error', 3200)
      toast.danger('保存面板失败', { description: message })
      return false
    } finally {
      setSavingPanel(false)
    }
  }, [appId, savingPanel, selectedPanel, showSaveState])

  const removeSelectedPanel = useCallback(
    async (key?: string): Promise<boolean> => {
      if (deleting) return false

      // 确认框打开期间可能发生 reload，列表会换成新的 key；
      // 调用方传 key 时按打开确认框时的目标删除，避免删错面板。
      const draft = key ? (panelsRef.current.find((panel) => panel.key === key) ?? null) : selectedPanel
      if (!draft) {
        if (key) toast.warning('面板已不存在，请刷新后重试')
        return false
      }

      if (!draft.panelId) {
        setPanels((current) => current.filter((panel) => panel.key !== draft.key))
        setSelectedPanelKey(null)
        toast.success('已丢弃未保存的面板')
        return true
      }

      setDeleting(true)
      setError('')

      try {
        await deletePanelRequest(appId, draft.panelId)
        setPanels((current) => current.filter((panel) => panel.key !== draft.key))
        setSelectedPanelKey(null)
        toast.success('面板已删除')
        return true
      } catch (err) {
        const message = messageOf(err, '删除面板失败')
        setError(message)
        toast.danger('删除面板失败', { description: message })
        return false
      } finally {
        setDeleting(false)
      }
    },
    [appId, deleting, selectedPanel]
  )

  const saveMenuDraft = useCallback(async (): Promise<boolean> => {
    if (!menu || savingMenu) return false

    const errors = validateMenuDraft(menu)
    setMenuErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.danger('请先修正自定义菜单中的问题')
      return false
    }

    const payload = menuContent(menu)
    const clear = (payload.items ?? []).length === 0

    setSavingMenu(true)
    setError('')
    showSaveState('saving')

    try {
      const response = await saveMenuRequest(appId, clear ? undefined : payload)
      setMenu((current) =>
        current
          ? {
              ...current,
              savedItems: menuResponseToDraft({ version: response.version, menu: clear ? undefined : payload })
                .savedItems,
              version: response.version,
              baseline: menuSignatureOf(clear ? {} : payload),
            }
          : current
      )
      showSaveState('saved', 1600)
      toast.success(clear ? '自定义菜单已清空' : '自定义菜单已保存')
      return true
    } catch (err) {
      const message = messageOf(err, '保存自定义菜单失败')
      setError(message)
      showSaveState('error', 3200)
      toast.danger('保存自定义菜单失败', { description: message })
      return false
    } finally {
      setSavingMenu(false)
    }
  }, [appId, menu, savingMenu, showSaveState])

  const clearMenu = useCallback(async (): Promise<boolean> => {
    if (savingMenu) return false

    setSavingMenu(true)
    setError('')
    showSaveState('saving')

    try {
      const response = await saveMenuRequest(appId, undefined)
      const empty = emptyMenuDraft()
      setMenu({ ...empty, version: response.version })
      setMenuErrors({})
      showSaveState('saved', 1600)
      toast.success('自定义菜单已清空')
      return true
    } catch (err) {
      const message = messageOf(err, '清空自定义菜单失败')
      setError(message)
      showSaveState('error', 3200)
      toast.danger('清空自定义菜单失败', { description: message })
      return false
    } finally {
      setSavingMenu(false)
    }
  }, [appId, savingMenu, showSaveState])

  const discardMenu = useCallback(() => {
    setMenu((current) => (current ? resetMenuDraft(current) : current))
    setMenuErrors({})
  }, [])

  const patchPanel = useCallback(
    (patch: Partial<PanelDraft>) => {
      updateSelectedPanel((panel) => ({ ...panel, ...patch }))
    },
    [updateSelectedPanel]
  )

  const patchPanelItem = useCallback(
    (key: string, patch: Partial<PanelItemDraft>) => {
      updateSelectedPanel((panel) => ({
        ...panel,
        items: panel.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
      }))
    },
    [updateSelectedPanel]
  )

  const addPanelItem = useCallback(
    (type: PanelItemType) => {
      if (selectedPanel && selectedPanel.items.length >= MAX_PANEL_ITEMS) {
        toast.warning(`一个面板最多 ${MAX_PANEL_ITEMS} 个元素`)
        return
      }
      updateSelectedPanel((panel) => ({ ...panel, items: [...panel.items, emptyPanelItem(type)] }))
    },
    [selectedPanel, updateSelectedPanel]
  )

  const removePanelItem = useCallback(
    (key: string) => {
      updateSelectedPanel((panel) => ({
        ...panel,
        items: panel.items.filter((item) => item.key !== key),
      }))
    },
    [updateSelectedPanel]
  )

  const movePanelItem = useCallback(
    (key: string, direction: -1 | 1) => {
      updateSelectedPanel((panel) => {
        const index = panel.items.findIndex((item) => item.key === key)
        return { ...panel, items: move(panel.items, index, index + direction) }
      })
    },
    [updateSelectedPanel]
  )

  const addOpenids = useCallback(
    (values: string[]) => {
      updateSelectedPanel((panel) => {
        const list = panel.scope === 'c2c' ? panel.userOpenids : panel.groupOpenids
        const seen = new Set(list)
        const next = [...list]
        for (const value of values) {
          const openid = value.trim()
          if (!openid || seen.has(openid)) continue
          seen.add(openid)
          next.push(openid)
        }
        if (next.length === list.length) return panel
        return panel.scope === 'c2c' ? { ...panel, userOpenids: next } : { ...panel, groupOpenids: next }
      })
    },
    [updateSelectedPanel]
  )

  const removeOpenid = useCallback(
    (openid: string) => {
      updateSelectedPanel((panel) =>
        panel.scope === 'c2c'
          ? { ...panel, userOpenids: panel.userOpenids.filter((item) => item !== openid) }
          : { ...panel, groupOpenids: panel.groupOpenids.filter((item) => item !== openid) }
      )
    },
    [updateSelectedPanel]
  )

  const clearOpenids = useCallback(() => {
    updateSelectedPanel((panel) =>
      panel.scope === 'c2c' ? { ...panel, userOpenids: [] } : { ...panel, groupOpenids: [] }
    )
  }, [updateSelectedPanel])

  const patchMenu = useCallback(
    (patch: Partial<MenuDraft>) => {
      updateMenu((draft) => ({ ...draft, ...patch }))
    },
    [updateMenu]
  )

  const patchMenuItem = useCallback(
    (key: string, patch: Partial<MenuItemDraft>) => {
      updateMenu((draft) => ({
        ...draft,
        items: draft.items.map((item) => {
          if (item.key !== key) return item
          const next = { ...item, ...patch }
          if (patch.type === 'menu' && next.subItems.length === 0) {
            next.subItems = [emptyMenuSubItem()]
          }
          return next
        }),
      }))
    },
    [updateMenu]
  )

  const addMenuItem = useCallback(() => {
    if (menu && menu.items.length >= MAX_MENU_ITEMS) {
      toast.warning(`自定义菜单最多 ${MAX_MENU_ITEMS} 个一级菜单`)
      return
    }
    updateMenu((draft) => ({ ...draft, items: [...draft.items, emptyMenuItem()] }))
  }, [menu, updateMenu])

  const removeMenuItem = useCallback(
    (key: string) => {
      updateMenu((draft) => ({ ...draft, items: draft.items.filter((item) => item.key !== key) }))
    },
    [updateMenu]
  )

  const moveMenuItem = useCallback(
    (key: string, direction: -1 | 1) => {
      updateMenu((draft) => {
        const index = draft.items.findIndex((item) => item.key === key)
        return { ...draft, items: move(draft.items, index, index + direction) }
      })
    },
    [updateMenu]
  )

  const addSubItem = useCallback(
    (menuKey: string) => {
      const target = menu?.items.find((item) => item.key === menuKey)
      if (target && target.subItems.length >= MAX_SUB_MENU_ITEMS) {
        toast.warning(`一个一级菜单最多 ${MAX_SUB_MENU_ITEMS} 个子菜单项`)
        return
      }
      updateMenu((draft) => ({
        ...draft,
        items: draft.items.map((item) =>
          item.key === menuKey ? { ...item, subItems: [...item.subItems, emptyMenuSubItem()] } : item
        ),
      }))
    },
    [menu, updateMenu]
  )

  const patchSubItem = useCallback(
    (menuKey: string, subKey: string, patch: Partial<MenuSubItemDraft>) => {
      updateMenu((draft) => ({
        ...draft,
        items: draft.items.map((item) =>
          item.key === menuKey
            ? {
                ...item,
                subItems: item.subItems.map((sub) => (sub.key === subKey ? { ...sub, ...patch } : sub)),
              }
            : item
        ),
      }))
    },
    [updateMenu]
  )

  const removeSubItem = useCallback(
    (menuKey: string, subKey: string) => {
      updateMenu((draft) => ({
        ...draft,
        items: draft.items.map((item) =>
          item.key === menuKey ? { ...item, subItems: item.subItems.filter((sub) => sub.key !== subKey) } : item
        ),
      }))
    },
    [updateMenu]
  )

  const panelDirty = selectedPanel ? isPanelDirty(selectedPanel) : false
  const menuDirty = menu ? isMenuDirty(menu) : false
  const anyDirty = menuDirty || panels.some((panel) => isPanelDirty(panel))
  const loading = panelLoad.c2c === 'loading' || panelLoad.group === 'loading' || menuLoad === 'loading'
  const canSavePanel = Boolean(
    selectedPanel &&
    !savingPanel &&
    selectedPanel.targetLoaded &&
    !selectedPanel.targetError &&
    selectedPanel.items.length > 0 &&
    (panelDirty || selectedPanel.panelId === null)
  )
  const canSaveMenu = Boolean(menu && !savingMenu && menuDirty)
  const maxOpenids = selectedPanel?.panelId ? MAX_PANEL_OPENIDS : MAX_CREATE_OPENIDS

  return {
    appId,
    config,
    configLoading,
    changeAppId,
    scene,
    changeScene,
    tab,
    changeTab,
    panels,
    scenePanels,
    sceneAllPanel,
    selectedPanel,
    selectPanel: setSelectedPanelKey,
    menu,
    panelLoad,
    menuLoad,
    loading,
    error,
    reload,
    panelErrors,
    menuErrors,
    panelDirty,
    menuDirty,
    anyDirty,
    savingPanel,
    savingMenu,
    deleting,
    saveState,
    canSavePanel,
    canSaveMenu,
    maxOpenids,
    createPanel: createDraftPanel,
    savePanel: saveSelectedPanel,
    deletePanel: removeSelectedPanel,
    discardPanel: discardSelectedPanel,
    retryTarget: retrySelectedTarget,
    saveMenu: saveMenuDraft,
    clearMenu,
    discardMenu,
    patchPanel,
    patchPanelItem,
    addPanelItem,
    removePanelItem,
    movePanelItem,
    addOpenids,
    removeOpenid,
    clearOpenids,
    patchMenu,
    patchMenuItem,
    addMenuItem,
    removeMenuItem,
    moveMenuItem,
    addSubItem,
    patchSubItem,
    removeSubItem,
  }
}

export type MenuPanelEditor = ReturnType<typeof useMenuPanelEditor>
