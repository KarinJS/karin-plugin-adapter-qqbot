import { Alert, Button, Label, ListBox, Select, cn } from '@heroui/react'
import { PanelTop, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EdgeBlur } from '@/components/EdgeBlur'
import { EmptyState } from '@/components/EmptyState'
import { EditorFooter } from '@/components/menu-panel/EditorFooter'
import { EditorGuide } from '@/components/menu-panel/EditorGuide'
import { MenuEditor } from '@/components/menu-panel/MenuEditor'
import { PanelEditor } from '@/components/menu-panel/PanelEditor'
import { PhonePreview } from '@/components/menu-panel/PhonePreview'
import { SegmentedControl, type SegmentOption } from '@/components/menu-panel/SegmentedControl'
import { PageHeader } from '@/components/PageHeader'
import { SaveStatus } from '@/components/SaveStatus'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useMenuPanelEditor, type EditorTab } from '@/hooks/useMenuPanelEditor'
import { prefersReducedMotion } from '@/lib/uiMotion'

const PageSkeleton = () => (
  <div className='flex h-full min-h-[60vh] items-center justify-center px-6'>
    <div className='flex w-full max-w-md flex-col items-center gap-3 text-center'>
      <span className='flex size-11 items-center justify-center rounded-full border border-border bg-surface text-muted'>
        <PanelTop className='size-5' aria-hidden='true' />
      </span>
      <p className='text-sm font-medium'>正在读取机器人配置…</p>
      <p className='text-xs leading-5 text-muted'>读取完成后会自动加载指令面板和自定义菜单。</p>
    </div>
  </div>
)

/**
 * PC 端的指令面板 / 自定义菜单工作区。
 *
 * 左侧是 iPhone 18 Pro Max 样机，右侧是实时编辑区；
 * 手机端不提供这个页面，移动外壳会把未知路由送回机器人列表。
 */
export const MenuPanelPage = () => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const active = pathname.startsWith('/menu-panel')
  const editor = useMenuPanelEditor(active)
  const { statuses } = useConfigStore()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const editorScrollRef = useRef<HTMLDivElement>(null)

  // 切换机器人 / 场景 / 页签后内容整块换掉，滚动位置留在旧页面会很错位；
  // xl 滚右侧编辑区，窄屏滚整页，所以按实际可滚动的那一层处理。
  const resetEditorScroll = useCallback(() => {
    const inner = editorScrollRef.current
    const outer = rootRef.current
    if (!inner || !outer) return

    const behavior = prefersReducedMotion() ? 'auto' : 'smooth'
    if (getComputedStyle(inner).overflowY === 'auto') {
      inner.scrollTo({ top: 0, behavior })
      return
    }

    // 窄屏是整页滚动：回到右侧编辑区顶部，而不是把样机也滚回来。
    const innerRect = inner.getBoundingClientRect()
    const outerRect = outer.getBoundingClientRect()
    outer.scrollTo({ top: outer.scrollTop + innerRect.top - outerRect.top - 16, behavior })
  }, [])

  const status = editor.appId ? statuses[editor.appId] : undefined
  const botName = status?.name || editor.appId || 'Karin'
  const botAvatar = status?.avatar

  if (editor.configLoading) return <PageSkeleton />

  if (editor.config.length === 0) {
    return (
      <div className='flex h-full min-h-[60vh] items-center justify-center px-6'>
        <EmptyState
          icon={<PanelTop className='size-5' aria-hidden='true' />}
          title='还没有可配置的机器人'
          description='指令面板和自定义菜单需要绑定到机器人。先添加一个机器人，再回到这里配置。'
          action={
            <Button onPress={() => navigate('/bots/new')}>
              <Plus className='size-4' aria-hidden='true' />
              添加机器人
            </Button>
          }
        />
      </div>
    )
  }

  const tabOptions: SegmentOption<EditorTab>[] = [
    { value: 'panels', label: '指令面板' },
    { value: 'menu', label: '自定义菜单', disabled: editor.scene === 'group' },
  ]

  const selectedPanel = editor.selectedPanel
  const panelName =
    selectedPanel?.items[0]?.name.trim() || selectedPanel?.remark.trim() || selectedPanel?.panelId || '这个面板'

  const handleDeletePanel = async () => {
    await editor.deletePanel()
    setDeleteOpen(false)
  }

  const handleClearMenu = async () => {
    await editor.clearMenu()
    setClearOpen(false)
  }

  return (
    <>
      <SaveStatus state={editor.saveState} />

      <div
        ref={rootRef}
        data-lenis-prevent
        className='mx-auto flex h-full min-h-0 w-full max-w-312 flex-col overflow-y-auto overscroll-contain xl:flex-row xl:overflow-visible'
      >
        <section className='flex h-[min(80vh,820px)] min-h-140 shrink-0 flex-col px-6 pt-6 xl:h-full xl:min-h-0 xl:w-[min(42%,34rem)] xl:justify-center xl:border-r xl:border-border/60 xl:px-8 xl:py-6 xl:pr-8 xl:pl-16'>
          <PhonePreview
            scene={editor.scene}
            onSceneChange={(next) => {
              editor.changeScene(next)
              resetEditorScroll()
            }}
            panel={editor.selectedPanel}
            menuItems={editor.menu?.items ?? []}
            panelsActive={editor.tab === 'panels'}
            botName={botName}
            botAvatar={botAvatar}
          />
        </section>

        <section className='flex min-w-0 flex-1 flex-col xl:h-full xl:min-h-0'>
          <div
            ref={editorScrollRef}
            data-lenis-prevent
            className='flex min-h-0 flex-col xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:[scrollbar-width:thin]'
          >
            <div className='mx-auto flex w-full max-w-208 flex-col gap-6 px-6 py-6 xl:px-10'>
              <PageHeader
                eyebrow='Menu & Panels'
                title='指令面板'
                description='在左侧样机里预览单聊 / 群聊效果，右侧实时编辑指令面板与自定义菜单。'
                className='xl:flex-col xl:items-start 2xl:flex-row 2xl:items-end 2xl:justify-between'
                actions={
                  <>
                    <Select
                      className='w-58'
                      value={editor.appId}
                      isDisabled={editor.anyDirty || editor.savingPanel || editor.savingMenu || editor.deleting}
                      onChange={(next) => {
                        if (typeof next !== 'string') return
                        editor.changeAppId(next)
                        resetEditorScroll()
                      }}
                    >
                      <Label className='sr-only'>机器人</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {editor.config.map((bot) => {
                            const botStatus = statuses[bot.appId]
                            return (
                              <ListBox.Item key={bot.appId} id={bot.appId} textValue={botStatus?.name || bot.appId}>
                                <div className='flex min-w-0 items-center gap-2'>
                                  <span
                                    aria-hidden='true'
                                    className={cn(
                                      'size-1.5 shrink-0 rounded-full',
                                      botStatus?.online ? 'bg-success' : 'bg-muted/50'
                                    )}
                                  />
                                  <div className='flex min-w-0 flex-col'>
                                    <span className='truncate text-sm'>{botStatus?.name || bot.appId}</span>
                                    <span className='truncate text-[10px] text-muted'>{bot.appId}</span>
                                  </div>
                                </div>
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            )
                          })}
                        </ListBox>
                      </Select.Popover>
                    </Select>

                    <Button
                      variant='secondary'
                      isDisabled={editor.loading || editor.anyDirty}
                      onPress={() => {
                        resetEditorScroll()
                        void editor.reload()
                      }}
                    >
                      <RefreshCw
                        className={cn('size-4', editor.loading && 'animate-spin motion-reduce:animate-none')}
                        aria-hidden='true'
                      />
                      刷新
                    </Button>
                  </>
                }
              />

              <div className='z-30 -mx-6 xl:sticky xl:top-0 xl:-mx-10 xl:bg-background/95'>
                <EdgeBlur edge='top' tone='background' height='header' className='hidden xl:block' />
                <div className='relative z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-3 backdrop-blur-xl xl:px-10'>
                  <SegmentedControl
                    value={editor.tab}
                    options={tabOptions}
                    onChange={(next) => {
                      editor.changeTab(next)
                      resetEditorScroll()
                    }}
                    ariaLabel='编辑内容'
                    className='w-70 max-w-full'
                  />
                  <div className='flex items-center gap-2'>
                    <span className='inline-flex items-center gap-1.5 rounded-full bg-surface/60 px-2.5 py-1 text-[11px] text-muted'>
                      <span
                        aria-hidden='true'
                        className={cn('size-1.5 rounded-full', editor.anyDirty ? 'bg-warning' : 'bg-success')}
                      />
                      {editor.anyDirty ? '有未保存的修改' : '已同步'}
                    </span>
                    {editor.scene === 'group' ? (
                      <span className='text-[11px] text-muted'>自定义菜单仅单聊生效</span>
                    ) : null}
                  </div>
                </div>
                <div
                  aria-hidden='true'
                  className='pointer-events-none absolute inset-x-0 top-full hidden h-4 bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--background)_95%,transparent)_0%,transparent_100%)] xl:block'
                />
              </div>

              <EditorGuide editor={editor} />

              {editor.anyDirty ? (
                <p className='text-[11px] leading-5 text-muted'>
                  切换机器人或刷新前，请先保存或撤销修改，避免覆盖草稿。
                </p>
              ) : null}

              {editor.error ? (
                <Alert status='danger'>
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>操作失败</Alert.Title>
                    <Alert.Description>{editor.error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}

              {editor.tab === 'panels' ? <PanelEditor editor={editor} /> : <MenuEditor editor={editor} />}

              <EditorFooter
                editor={editor}
                onDeletePanel={() => setDeleteOpen(true)}
                onClearMenu={() => setClearOpen(true)}
              />
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title='删除这个面板？'
        description={
          <>
            将从 QQ 开放平台删除 <span className='font-medium text-foreground'>{panelName}</span>
            ，该操作不可撤销。面板元素和已关联的 openid 会一起删除。
          </>
        }
        confirmLabel='删除面板'
        isPending={editor.deleting}
        onConfirm={handleDeletePanel}
      />

      <ConfirmDialog
        isOpen={clearOpen}
        onOpenChange={setClearOpen}
        title='清空自定义菜单？'
        description={
          <>
            将清空 <span className='font-medium text-foreground'>{botName}</span> 的整个自定义菜单，
            该操作不可撤销。用户端菜单会立即消失。
          </>
        }
        confirmLabel='清空菜单'
        isPending={editor.savingMenu}
        onConfirm={handleClearMenu}
      />
    </>
  )
}
