import {
  Alert,
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Skeleton,
  Spinner,
  Switch,
  TextArea,
  TextField,
  cn,
} from '@heroui/react'
import { Link2, Plus, RefreshCw, Terminal, X } from 'lucide-react'
import { useState } from 'react'
import { CharacterCount, OrderButtons, TypeToggle } from '@/components/menu-panel/EditorControls'
import { EditorSection } from '@/components/menu-panel/EditorSection'
import type { MenuPanelEditor } from '@/hooks/useMenuPanelEditor'
import { MAX_PANEL_ITEMS, MAX_PANELS, isPanelDirty, type PanelDraft, type PanelItemDraft } from '@/lib/menuPanelDraft'
import type { PanelItemType, PanelScene } from '@/lib/menuPanelTypes'

interface PanelEditorProps {
  editor: MenuPanelEditor
}

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const panelLabel = (panel: PanelDraft) =>
  panel.items[0]?.name.trim() || panel.remark.trim() || (panel.panelId ? '未命名面板' : '新面板')

const sceneLabel = (scene: PanelScene) => (scene === 'c2c' ? '单聊' : '群聊')

const OpenidEditor = ({ editor, panel }: { editor: MenuPanelEditor; panel: PanelDraft }) => {
  const [input, setInput] = useState('')
  const openids = panel.scope === 'c2c' ? panel.userOpenids : panel.groupOpenids
  const errors = editor.panelErrors

  if (panel.targetError) {
    return (
      <div className='flex flex-col gap-3'>
        <Alert status='danger'>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>读取生效对象失败</Alert.Title>
            <Alert.Description>{panel.targetError}</Alert.Description>
          </Alert.Content>
        </Alert>
        <Button variant='secondary' className='self-start' onPress={editor.retryTarget}>
          <RefreshCw className='size-4' aria-hidden='true' />
          重试
        </Button>
      </div>
    )
  }

  if (!panel.targetLoaded) {
    return (
      <div className='flex items-center gap-2 py-2 text-sm text-muted'>
        <Spinner size='sm' aria-label='正在读取生效对象' />
        正在读取生效对象…
      </div>
    )
  }

  const add = () => {
    const values = input.split(/[\s,;，；]+/).filter(Boolean)
    if (values.length === 0) return
    editor.addOpenids(values)
    setInput('')
  }

  return (
    <div className='flex flex-col gap-3'>
      <TextField fullWidth value={input} onChange={setInput}>
        <Label>批量添加 openid</Label>
        <TextArea rows={3} placeholder='每行一个，也可以用空格、逗号或分号分隔' spellCheck={false} />
        <Description>
          {panel.panelId
            ? `单个面板最多 ${editor.maxOpenids} 个 openid，每次请求最多提交 20 个。`
            : '新建面板一次最多 20 个 openid，创建后可以继续添加。'}
        </Description>
      </TextField>

      <div className='flex flex-wrap items-center gap-2'>
        <Button variant='secondary' onPress={add} isDisabled={!input.trim()}>
          <Plus className='size-4' aria-hidden='true' />
          添加
        </Button>
        {openids.length > 0 ? (
          <Button size='sm' variant='ghost' className='ml-auto' onPress={editor.clearOpenids}>
            清空
          </Button>
        ) : null}
      </div>

      {openids.length === 0 ? (
        <p className='rounded-xl bg-field/35 px-4 py-5 text-center text-xs text-muted'>
          还没有关联 openid，保存前至少添加一个。
        </p>
      ) : (
        <div
          data-lenis-prevent
          className='flex max-h-44 flex-wrap gap-1.5 overflow-y-auto overscroll-contain rounded-xl bg-field/45 p-2'
        >
          {openids.map((openid) => (
            <span
              key={openid}
              className='inline-flex max-w-full items-center gap-1 rounded-full bg-surface py-1 pr-1 pl-2.5 text-xs text-muted'
            >
              <span className='max-w-60 truncate' title={openid}>
                {openid}
              </span>
              <button
                type='button'
                aria-label={`移除 ${openid}`}
                onClick={() => editor.removeOpenid(openid)}
                className='flex size-4 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-default hover:text-foreground'
              >
                <X className='size-3' aria-hidden='true' />
              </button>
            </span>
          ))}
        </div>
      )}

      {errors.openids ? <p className='text-xs text-danger'>{errors.openids}</p> : null}
    </div>
  )
}

const PanelItemCard = ({
  editor,
  item,
  index,
  total,
  scope,
}: {
  editor: MenuPanelEditor
  item: PanelItemDraft
  index: number
  total: number
  scope: PanelScene
}) => {
  const errors = editor.panelErrors
  const nameError = errors[`items.${item.key}.name`]
  const descError = errors[`items.${item.key}.desc`]
  const linkError = errors[`items.${item.key}.link`]

  return (
    <div className='rounded-2xl bg-surface/65 p-4'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='tabular-nums flex size-6 shrink-0 items-center justify-center rounded-md bg-default text-[11px] font-medium text-muted'>
            {index + 1}
          </span>
          <TypeToggle
            value={item.type}
            compact
            label='元素类型'
            className='grid-cols-2'
            options={[
              { value: 'command', label: '指令', icon: <Terminal className='size-3.5' aria-hidden='true' /> },
              { value: 'link', label: '链接', icon: <Link2 className='size-3.5' aria-hidden='true' /> },
            ]}
            onChange={(type: PanelItemType) => editor.patchPanelItem(item.key, { type })}
          />
        </div>

        <OrderButtons
          index={index}
          total={total}
          onMove={(direction) => editor.movePanelItem(item.key, direction)}
          onRemove={() => editor.removePanelItem(item.key)}
          removeLabel='删除元素'
        />
      </div>

      <div className='mt-3 grid gap-3 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]'>
        <TextField
          fullWidth
          value={item.name}
          isInvalid={Boolean(nameError)}
          onChange={(name) => editor.patchPanelItem(item.key, { name })}
        >
          <Label>名称</Label>
          <Input placeholder='例如 查询天气' />
          <Description>
            <CharacterCount value={item.name} max={14} />
          </Description>
          <FieldError>{nameError}</FieldError>
        </TextField>

        <TextField
          fullWidth
          value={item.desc}
          isInvalid={Boolean(descError)}
          onChange={(desc) => editor.patchPanelItem(item.key, { desc })}
        >
          <Label>描述</Label>
          <Input placeholder='一句话说明这个元素的作用' />
          <Description>
            <CharacterCount value={item.desc} max={30} />
          </Description>
          <FieldError>{descError}</FieldError>
        </TextField>
      </div>

      {item.type === 'link' ? (
        <TextField
          fullWidth
          className='mt-3'
          value={item.link}
          isInvalid={Boolean(linkError)}
          onChange={(link) => editor.patchPanelItem(item.key, { link })}
        >
          <Label>链接</Label>
          <Input type='url' placeholder='https://example.com' spellCheck={false} />
          <Description>必须以 https:// 开头，用户点击后打开该地址。</Description>
          <FieldError>{linkError}</FieldError>
        </TextField>
      ) : null}

      <div className={cn('mt-3 flex items-center gap-3', scope === 'group' ? 'justify-between' : 'justify-end')}>
        {/* 管理员只存在于群聊，单聊不提供这个开关。 */}
        {scope === 'group' ? (
          <Switch isSelected={item.onlyAdmin} onChange={(onlyAdmin) => editor.patchPanelItem(item.key, { onlyAdmin })}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <span className='text-xs text-muted'>仅群管理员可点击</span>
            </Switch.Content>
          </Switch>
        ) : null}
        <span className='text-[11px] text-muted/70'>{item.type === 'link' ? '链接元素' : '指令元素'}</span>
      </div>
    </div>
  )
}

const PanelBasics = ({ editor, panel }: { editor: MenuPanelEditor; panel: PanelDraft }) => {
  const errors = editor.panelErrors
  const locked = Boolean(panel.panelId)
  // 当前场景已经有别的全局面板时，新草稿只能是指定生效。
  const otherAllPanel = editor.sceneAllPanel && editor.sceneAllPanel.key !== panel.key ? editor.sceneAllPanel : null
  const openids = panel.scope === 'c2c' ? panel.userOpenids : panel.groupOpenids

  return (
    <EditorSection title='基础设置'>
      <div className='flex flex-col gap-5'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center justify-between gap-3'>
            <span className='text-sm font-medium'>生效范围</span>
            {locked ? <span className='text-xs text-muted'>创建后不可修改</span> : null}
          </div>
          <TypeToggle
            value={panel.targetType}
            isDisabled={locked || Boolean(otherAllPanel)}
            label='生效范围'
            className='grid-cols-2'
            options={[
              { value: 'all', label: '全部生效' },
              { value: 'specific', label: '指定生效' },
            ]}
            onChange={(targetType) => editor.patchPanel({ targetType })}
          />
          <p className='text-xs leading-5 text-muted'>
            {locked
              ? '如需调整，请删除面板后重建。'
              : otherAllPanel
                ? '同一场景只能有一个全局面板，请选择现有的全局面板修改。'
                : panel.targetType === 'all'
                  ? `当前场景所有${sceneLabel(panel.scope)}用户可见。`
                  : '仅下方列出的 openid 可见。'}
          </p>
        </div>

        {panel.targetType === 'specific' ? (
          <div className='flex flex-col gap-4'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='text-sm font-medium'>生效对象</p>
                <p className='mt-1 text-xs leading-5 text-muted'>
                  只有列表里的{panel.scope === 'c2c' ? '用户' : '群'} openid 能看到这个面板。
                </p>
              </div>
              <span className='tabular-nums shrink-0 text-xs text-muted'>
                {openids.length} / {editor.maxOpenids}
              </span>
            </div>
            <OpenidEditor editor={editor} panel={panel} />
          </div>
        ) : null}

        <TextField
          fullWidth
          value={panel.remark}
          isInvalid={Boolean(errors.remark)}
          onChange={(remark) => editor.patchPanel({ remark })}
        >
          <Label>备注</Label>
          <TextArea rows={2} placeholder='给面板写一段备注（可选）' />
          <Description>
            <CharacterCount value={panel.remark} max={255} suffix='仅开发者可见' />
          </Description>
          <FieldError>{errors.remark}</FieldError>
        </TextField>

        <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted'>
          <span>
            面板 ID：<span className='font-mono'>{panel.panelId ?? '保存后生成'}</span>
          </span>
          <span>版本：{panel.version ?? '—'}</span>
          {panel.updatedAt ? <span>更新于 {formatDate(panel.updatedAt)}</span> : null}
        </div>
      </div>
    </EditorSection>
  )
}

const PanelItems = ({ editor, panel }: { editor: MenuPanelEditor; panel: PanelDraft }) => {
  const errors = editor.panelErrors
  const empty = panel.items.length === 0

  return (
    <EditorSection
      title='面板元素'
      description={panel.scope === 'c2c' ? '单聊没有管理员角色，元素对所有用户可用。' : undefined}
      actions={
        <span className='tabular-nums text-xs text-muted'>
          {panel.items.length} / {MAX_PANEL_ITEMS}
        </span>
      }
      contentClassName='gap-3'
    >
      <div className='flex flex-col gap-3'>
        {errors.items ? <p className='text-xs text-danger'>{errors.items}</p> : null}

        {empty ? (
          <div className='rounded-2xl bg-surface/55 px-5 py-8 text-center'>
            <span className='mx-auto flex size-11 items-center justify-center rounded-2xl bg-default text-muted'>
              <Terminal className='size-5' aria-hidden='true' />
            </span>
            <p className='mt-3 text-sm font-medium'>还没有面板元素</p>
            <p className='mt-1 text-xs leading-5 text-muted'>先添加一个指令或链接，左侧样机会实时展示。</p>
            <div className='mt-4 flex flex-wrap justify-center gap-2'>
              <Button onPress={() => editor.addPanelItem('command')}>
                <Terminal className='size-4' aria-hidden='true' />
                添加指令
              </Button>
              <Button variant='secondary' onPress={() => editor.addPanelItem('link')}>
                <Link2 className='size-4' aria-hidden='true' />
                添加链接
              </Button>
            </div>
          </div>
        ) : (
          <>
            {panel.items.map((item, index) => (
              <PanelItemCard
                key={item.key}
                editor={editor}
                item={item}
                index={index}
                total={panel.items.length}
                scope={panel.scope}
              />
            ))}

            <div className='flex flex-wrap gap-2 pt-1'>
              <Button
                variant='secondary'
                isDisabled={panel.items.length >= MAX_PANEL_ITEMS}
                onPress={() => editor.addPanelItem('command')}
              >
                <Terminal className='size-4' aria-hidden='true' />
                添加指令
              </Button>
              <Button
                variant='secondary'
                isDisabled={panel.items.length >= MAX_PANEL_ITEMS}
                onPress={() => editor.addPanelItem('link')}
              >
                <Link2 className='size-4' aria-hidden='true' />
                添加链接
              </Button>
            </div>
          </>
        )}
      </div>
    </EditorSection>
  )
}

const PanelPicker = ({
  editor,
  panels,
  panel,
}: {
  editor: MenuPanelEditor
  panels: PanelDraft[]
  panel: PanelDraft | null
}) => {
  const atLimit = editor.panels.length >= MAX_PANELS
  const allPanels = panels.filter((item) => item.targetType === 'all')

  return (
    <EditorSection
      title='选择面板'
      description='同一场景只能有一个全局面板，指定生效可以多个。'
      actions={
        <span className='tabular-nums shrink-0 text-xs text-muted'>
          本场景 {panels.length} 个 · 全部 {editor.panels.length} / {MAX_PANELS}
        </span>
      }
      contentClassName='gap-2.5'
    >
      <div className='flex flex-wrap gap-2'>
        {panels.map((item) => {
          const active = item.key === panel?.key
          const dirty = isPanelDirty(item)

          return (
            <button
              key={item.key}
              type='button'
              aria-current={active ? 'true' : undefined}
              onClick={() => editor.selectPanel(item.key)}
              className={cn(
                'flex min-w-38 max-w-60 flex-col gap-1 rounded-2xl px-3 py-2.5 text-left transition-[background-color,color,scale] duration-150 active:scale-[0.99]',
                active ? 'bg-accent text-accent-foreground' : 'bg-surface text-foreground hover:bg-default/60'
              )}
            >
              <span className='flex min-w-0 items-center gap-1.5'>
                <span className='truncate text-sm font-medium'>{panelLabel(item)}</span>
                {dirty ? (
                  <span
                    aria-label='有未保存的修改'
                    className={cn('size-1.5 shrink-0 rounded-full', active ? 'bg-accent-foreground/80' : 'bg-warning')}
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1.5 text-[11px]',
                  active ? 'text-accent-foreground/70' : 'text-muted'
                )}
              >
                <span>{item.targetType === 'all' ? '全部生效' : '指定生效'}</span>
                <span aria-hidden='true'>·</span>
                <span>{item.items.length} 个元素</span>
              </span>
            </button>
          )
        })}

        <button
          type='button'
          onClick={editor.createPanel}
          disabled={atLimit}
          className='flex min-w-34 flex-col items-center justify-center gap-1 rounded-2xl bg-surface/50 px-3 py-2.5 text-xs text-muted transition-colors duration-150 hover:bg-surface/75 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
        >
          <span className='flex items-center gap-1.5'>
            <Plus className='size-4' aria-hidden='true' />
            {editor.sceneAllPanel ? '新建指定生效面板' : '新建面板'}
          </span>
          <span className='text-[11px]'>
            {atLimit ? '已达到上限' : editor.sceneAllPanel ? '全局面板已存在' : `最多 ${MAX_PANELS} 个`}
          </span>
        </button>
      </div>

      {allPanels.length > 1 ? (
        <p className='text-xs leading-5 text-warning'>
          当前场景有 {allPanels.length} 个全局面板，平台只会生效其中一个；建议删除多余的全局面板。
        </p>
      ) : null}
    </EditorSection>
  )
}

const PanelEmpty = ({ editor, scene }: { editor: MenuPanelEditor; scene: PanelScene }) => (
  <div className='rounded-2xl bg-surface/65 p-6'>
    <div className='flex items-start gap-3'>
      <span className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-default text-foreground'>
        <Terminal className='size-5' aria-hidden='true' />
      </span>
      <div className='min-w-0'>
        <h2 className='text-base font-semibold'>还没有{sceneLabel(scene)}指令面板</h2>
        <p className='mt-1 text-sm leading-6 text-muted'>指令面板会出现在聊天输入框上方，用户点一下就能发送指令。</p>
      </div>
    </div>

    <ol className='mt-5 flex flex-col gap-2.5'>
      {['新建一个面板', '添加指令或链接', '保存后在 QQ 中生效'].map((text, index) => (
        <li key={text} className='flex items-center gap-2.5 text-sm'>
          <span className='tabular-nums flex size-6 shrink-0 items-center justify-center rounded-full bg-default text-[11px] font-semibold text-muted'>
            {index + 1}
          </span>
          <span className='text-muted'>{text}</span>
        </li>
      ))}
    </ol>

    <Button className='mt-5' onPress={editor.createPanel}>
      <Plus className='size-4' aria-hidden='true' />
      新建第一个面板
    </Button>
  </div>
)

/**
 * 指令面板编辑区。
 *
 * 顶部是当前场景的面板选择器，下面是选中面板的基础设置和元素编辑器。
 * 所有改动只进草稿，由底部保存栏统一提交。
 */
export const PanelEditor = ({ editor }: PanelEditorProps) => {
  const { selectedPanel: panel, scenePanels, panelLoad, scene, loading } = editor

  if (panelLoad[scene] === 'error') {
    return (
      <div className='flex flex-col gap-3'>
        <Alert status='danger'>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>面板列表加载失败</Alert.Title>
            <Alert.Description>可能是 AppSecret 或网络问题。修正后点击重试，或使用页面右上角的刷新。</Alert.Description>
          </Alert.Content>
        </Alert>
        <Button variant='secondary' className='self-start' onPress={() => void editor.reload()}>
          <RefreshCw className='size-4' aria-hidden='true' />
          重试
        </Button>
      </div>
    )
  }

  if (loading && scenePanels.length === 0) {
    return (
      <div className='flex flex-col gap-4'>
        <Skeleton className='h-9 w-full rounded-xl' />
        <Skeleton className='h-44 w-full rounded-2xl' />
        <Skeleton className='h-64 w-full rounded-2xl' />
      </div>
    )
  }

  if (scenePanels.length === 0) {
    return <PanelEmpty editor={editor} scene={scene} />
  }

  return (
    <div className='flex flex-col gap-6'>
      <PanelPicker editor={editor} panels={scenePanels} panel={panel} />

      {panel ? (
        <div key={panel.key} className='flex flex-col gap-6'>
          <PanelBasics editor={editor} panel={panel} />
          <PanelItems editor={editor} panel={panel} />
        </div>
      ) : (
        <div className='rounded-2xl bg-surface/55 px-5 py-8 text-center text-sm text-muted'>
          从上方选择一个面板开始编辑。
        </div>
      )}
    </div>
  )
}
