import { cn } from '@heroui/react'
import { Check } from 'lucide-react'
import type { MenuPanelEditor } from '@/hooks/useMenuPanelEditor'
import { findScrollParent } from '@/lib/scroll'

type StepState = 'done' | 'active' | 'todo'

interface GuideStep {
  title: string
  description: string
  state: StepState
  /** 点击后跳转到的区块，save 表示聚焦底部保存按钮。 */
  anchor: 'picker' | 'content' | 'save'
}

const panelName = (editor: MenuPanelEditor) => {
  const panel = editor.selectedPanel
  if (!panel) return ''
  return panel.items[0]?.name.trim() || panel.remark.trim() || (panel.panelId ? '未命名面板' : '新面板')
}

const panelSteps = (editor: MenuPanelEditor): GuideStep[] => {
  const panel = editor.selectedPanel
  const count = panel?.items.length ?? 0
  const hasPanel = Boolean(panel)
  const hasItems = count > 0
  const saved = Boolean(panel?.panelId) && !editor.panelDirty

  return [
    {
      title: '选择面板',
      description: hasPanel ? `当前：${panelName(editor)}` : '选中或新建面板',
      state: hasPanel ? 'done' : 'active',
      anchor: 'picker',
    },
    {
      title: '配置内容',
      description: !hasPanel ? '先选择面板' : hasItems ? `${count} 个元素` : '添加指令或链接',
      state: !hasPanel ? 'todo' : hasItems ? 'done' : 'active',
      anchor: 'content',
    },
    {
      title: '保存生效',
      description: !hasPanel || !hasItems ? '完成前两步' : saved ? '已同步到 QQ' : '点击底部保存',
      state: saved ? 'done' : hasPanel && hasItems ? 'active' : 'todo',
      anchor: 'save',
    },
  ]
}

const menuSteps = (editor: MenuPanelEditor): GuideStep[] => {
  const count = editor.menu?.items.length ?? 0
  const saved = Boolean(editor.menu) && count > 0 && !editor.menuDirty

  return [
    {
      title: '添加菜单项',
      description: count > 0 ? `${count} 个一级菜单` : '添加第一个菜单',
      state: count > 0 ? 'done' : 'active',
      anchor: 'content',
    },
    {
      title: '配置动作',
      description: count === 0 ? '先添加菜单项' : editor.menuDirty ? '待保存' : '内容已配置',
      state: count === 0 ? 'todo' : editor.menuDirty ? 'active' : 'done',
      anchor: 'content',
    },
    {
      title: '保存菜单',
      description: saved ? '已同步到 QQ' : count > 0 ? '点击底部保存' : '完成前两步',
      state: saved ? 'done' : count > 0 ? 'active' : 'todo',
      anchor: 'save',
    },
  ]
}

/** 滚动到对应区块；保存步骤直接聚焦底部的保存按钮。 */
const goToStep = (anchor: GuideStep['anchor']) => {
  if (anchor === 'save') {
    const scroller = findScrollParent(document.querySelector<HTMLElement>('[data-guide-anchor="content"]'))
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })

    const save = document.querySelector<HTMLButtonElement>('[data-editor-save]')
    if (!save) return
    if (!save.disabled) save.focus({ preventScroll: true })
    save.animate([{ boxShadow: '0 0 0 0 rgb(0 156 255 / 0.45)' }, { boxShadow: '0 0 0 6px rgb(0 156 255 / 0)' }], {
      duration: 700,
      easing: 'ease-out',
    })
    return
  }

  const target = document.querySelector<HTMLElement>(`[data-guide-anchor="${anchor}"]`)
  if (!target) return

  // 只滚动实际会滚的那一层，避免 CanvasPager 的 overflow-hidden 根节点跟着动。
  const scroller = findScrollParent(target)
  if (!scroller) return

  const targetRect = target.getBoundingClientRect()
  const scrollerRect = scroller.getBoundingClientRect()
  scroller.scrollTo({
    top: scroller.scrollTop + targetRect.top - scrollerRect.top - 84,
    behavior: 'smooth',
  })
}

/**
 * 配置步骤引导。
 *
 * 每一步的状态都由草稿实时推导，用户能一眼看出现在卡在哪一步、
 * 下一步该做什么；点击任意一步可以直接跳到对应区块。
 */
export const EditorGuide = ({ editor }: { editor: MenuPanelEditor }) => {
  const steps = editor.tab === 'panels' ? panelSteps(editor) : menuSteps(editor)

  return (
    <section aria-label='配置步骤'>
      <ol className='grid gap-1.5 sm:grid-cols-3'>
        {steps.map((step, index) => (
          <li key={step.title}>
            <button
              type='button'
              onClick={() => goToStep(step.anchor)}
              title={`跳到「${step.title}」`}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-colors duration-200',
                'hover:bg-surface/60 focus-visible:bg-surface',
                step.state === 'active' && 'bg-surface shadow-[var(--surface-shadow)]',
                step.state === 'done' && 'bg-surface/35',
                step.state === 'todo' && 'opacity-55'
              )}
            >
              <span
                aria-hidden='true'
                className={cn(
                  'tabular-nums flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  step.state === 'done'
                    ? 'bg-success/15 text-success'
                    : step.state === 'active'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-default text-muted'
                )}
              >
                {step.state === 'done' ? <Check className='size-3' strokeWidth={2.8} /> : index + 1}
              </span>
              <span className='min-w-0 flex-1'>
                <span className={cn('block text-xs font-medium', step.state === 'done' && 'text-muted')}>
                  {step.title}
                </span>
                <span className='mt-0.5 block truncate text-[11px] leading-4 text-muted'>{step.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
