import { Button, Spinner, cn } from '@heroui/react'
import { AlertCircle, Save, Trash2, Undo2 } from 'lucide-react'
import { EdgeBlur } from '@/components/EdgeBlur'
import type { MenuPanelEditor } from '@/hooks/useMenuPanelEditor'
import { findScrollParent } from '@/lib/scroll'

interface EditorFooterProps {
  editor: MenuPanelEditor
  onDeletePanel: () => void
  onClearMenu: () => void
}

const DirtyStatus = ({ dirty, loading, empty }: { dirty: boolean; loading?: boolean; empty?: boolean }) => (
  <span className='inline-flex items-center gap-1.5 text-xs text-muted' aria-live='polite'>
    {loading ? (
      <Spinner size='sm' aria-label='正在读取生效对象' />
    ) : (
      <span
        aria-hidden='true'
        className={cn('size-1.5 rounded-full', dirty ? 'bg-warning' : empty ? 'bg-muted/50' : 'bg-success')}
      />
    )}
    {loading ? '正在读取生效对象…' : dirty ? '有未保存的修改' : empty ? '尚未创建' : '已同步'}
  </span>
)

/** 保存被禁用时把原因说清楚，避免用户只看到灰按钮不知道下一步做什么。 */
const SaveHint = ({ children }: { children?: string }) =>
  children ? <span className='text-[11px] leading-4 text-muted'>{children}</span> : null

const focusFirstInvalid = () => {
  const field = document.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!field) return

  // 只滚动字段实际所在的滚动区。CanvasPager 的根节点是 overflow-hidden，
  // 直接 scrollIntoView 会连它一起滚动，把画布翻到相邻页面。
  const scroller = findScrollParent(field)
  if (scroller) {
    const fieldRect = field.getBoundingClientRect()
    const scrollerRect = scroller.getBoundingClientRect()
    scroller.scrollTo({
      top: scroller.scrollTop + fieldRect.top - scrollerRect.top - 96,
      behavior: 'smooth',
    })
  }
  window.setTimeout(() => field.focus({ preventScroll: true }), 260)
}

const ValidationHint = ({ errors }: { errors: Record<string, string> }) => {
  const entries = Object.entries(errors)
  if (entries.length === 0) return null

  return (
    <button
      type='button'
      onClick={focusFirstInvalid}
      className='flex w-full items-start gap-1.5 text-left text-[11px] leading-5 text-danger transition-opacity duration-150 hover:opacity-80'
    >
      <AlertCircle className='mt-0.5 size-3.5 shrink-0' aria-hidden='true' />
      <span>
        还有 {entries.length} 处需要完善：{entries[0][1]}
        <span className='ml-1 underline underline-offset-2'>查看问题</span>
      </span>
    </button>
  )
}

/**
 * 编辑器底部固定操作栏。
 *
 * 保存按钮只提交当前页：面板页保存选中的面板，菜单页保存整个自定义菜单。
 * 其他草稿的未保存状态会保留，不会被顺手提交。
 */
export const EditorFooter = ({ editor, onDeletePanel, onClearMenu }: EditorFooterProps) => {
  const {
    tab,
    selectedPanel,
    menu,
    panelDirty,
    menuDirty,
    panelErrors,
    menuErrors,
    savingPanel,
    savingMenu,
    deleting,
    canSavePanel,
    canSaveMenu,
  } = editor

  // 只在右侧编辑区独立滚动时吸底；窄屏整页滚动时保持文档流，避免盖住上方内容。
  // 底栏不再画一条硬分隔线，改用和手机抽屉同款的三层边缘模糊。
  const wrapperClass =
    'relative z-20 -mx-6 mt-2 flex flex-col gap-2 bg-background/95 px-6 py-3 xl:sticky xl:bottom-0 xl:-mx-10 xl:px-10'

  if (tab === 'panels') {
    const pending = savingPanel
    const label = selectedPanel?.panelId ? '保存面板' : '创建面板'
    const hint = !selectedPanel
      ? '先在下方选择一个面板'
      : !selectedPanel.targetLoaded
        ? '正在读取生效对象，读取完成后才能保存'
        : selectedPanel.targetError
          ? '生效对象读取失败，请先重试'
          : selectedPanel.items.length === 0
            ? '至少添加一个面板元素后才能保存'
            : !panelDirty && selectedPanel.panelId
              ? '没有需要保存的修改'
              : ''

    const handleSave = async () => {
      const ok = await editor.savePanel()
      if (!ok) window.setTimeout(focusFirstInvalid, 120)
    }

    return (
      <div className={wrapperClass}>
        <EdgeBlur edge='bottom' tone='background' className='z-0' />
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-x-0 bottom-full h-4 bg-[linear-gradient(to_top,color-mix(in_oklab,var(--background)_95%,transparent)_0%,transparent_100%)]'
        />
        <div className='relative z-10 flex flex-col gap-2 backdrop-blur-xl'>
          <ValidationHint errors={panelErrors} />
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex min-w-0 items-center gap-2'>
              {selectedPanel?.panelId ? (
                <Button size='sm' variant='danger-soft' isDisabled={pending || deleting} onPress={onDeletePanel}>
                  <Trash2 className='size-4' aria-hidden='true' />
                  删除
                </Button>
              ) : null}
              <div className='flex min-w-0 flex-col gap-0.5'>
                <DirtyStatus
                  dirty={panelDirty}
                  loading={selectedPanel ? !selectedPanel.targetLoaded : false}
                  empty={!selectedPanel?.panelId}
                />
                {!pending ? <SaveHint>{hint}</SaveHint> : null}
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant='secondary'
                isDisabled={!panelDirty || pending || deleting}
                onPress={editor.discardPanel}
              >
                <Undo2 className='size-4' aria-hidden='true' />
                撤销
              </Button>
              <Button
                size='sm'
                data-editor-save
                isPending={pending}
                isDisabled={!canSavePanel || deleting}
                onPress={() => void handleSave()}
              >
                {({ isPending }) => (
                  <>
                    {isPending ? null : <Save className='size-4' aria-hidden='true' />}
                    <span>{isPending ? '保存中' : label}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pending = savingMenu
  const emptyMenu = (menu?.items.length ?? 0) === 0
  const label = emptyMenu ? '保存并清空' : '保存菜单'
  const hint = !menu
    ? '菜单还没有加载'
    : emptyMenu
      ? '菜单为空，保存会清空现有菜单'
      : !menuDirty
        ? '没有需要保存的修改'
        : ''

  const handleSave = async () => {
    const ok = await editor.saveMenu()
    if (!ok) window.setTimeout(focusFirstInvalid, 120)
  }

  return (
    <div className={wrapperClass}>
      <EdgeBlur edge='bottom' tone='background' className='z-0' />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-x-0 bottom-full h-4 bg-[linear-gradient(to_top,color-mix(in_oklab,var(--background)_95%,transparent)_0%,transparent_100%)]'
      />
      <div className='relative z-10 flex flex-col gap-2 backdrop-blur-xl'>
        <ValidationHint errors={menuErrors} />
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-2'>
            <Button size='sm' variant='danger-soft' isDisabled={!menu || pending} onPress={onClearMenu}>
              <Trash2 className='size-4' aria-hidden='true' />
              清空菜单
            </Button>
            <div className='flex min-w-0 flex-col gap-0.5'>
              <DirtyStatus dirty={menuDirty} empty={emptyMenu && !menuDirty} />
              {!pending ? <SaveHint>{hint}</SaveHint> : null}
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Button size='sm' variant='secondary' isDisabled={!menuDirty || pending} onPress={editor.discardMenu}>
              <Undo2 className='size-4' aria-hidden='true' />
              撤销
            </Button>
            <Button
              size='sm'
              data-editor-save
              isPending={pending}
              isDisabled={!canSaveMenu}
              onPress={() => void handleSave()}
            >
              {({ isPending }) => (
                <>
                  {isPending ? null : <Save className='size-4' aria-hidden='true' />}
                  <span>{isPending ? '保存中' : label}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
