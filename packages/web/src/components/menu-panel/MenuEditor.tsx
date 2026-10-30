import {
  Alert,
  Button,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  Skeleton,
  Switch,
  TextField,
} from '@heroui/react'
import { Info, Link2, Menu as MenuIcon, Plus, RefreshCw, Send, ToggleLeft, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CharacterCount, OrderButtons, TypeToggle } from '@/components/menu-panel/EditorControls'
import { EditorSection } from '@/components/menu-panel/EditorSection'
import { EmptyState } from '@/components/EmptyState'
import type { MenuPanelEditor } from '@/hooks/useMenuPanelEditor'
import { MAX_MENU_ITEMS, MAX_SUB_MENU_ITEMS, type MenuItemDraft, type MenuSubItemDraft } from '@/lib/menuPanelDraft'
import type { MenuItemType } from '@/lib/menuPanelTypes'

interface MenuEditorProps {
  editor: MenuPanelEditor
}

const TYPE_OPTIONS: { value: MenuItemType; label: string; icon: LucideIcon }[] = [
  { value: 'send_message', label: '发送消息', icon: Send },
  { value: 'link', label: '打开链接', icon: Link2 },
  { value: 'switch', label: '开关', icon: ToggleLeft },
  { value: 'menu', label: '子菜单', icon: MenuIcon },
]

const SubMenuEditor = ({ editor, item }: { editor: MenuPanelEditor; item: MenuItemDraft }) => {
  const errors = editor.menuErrors
  const listError = errors[`items.${item.key}.subItems`]

  return (
    <div className='mt-4 rounded-2xl bg-field/35 p-3.5'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-baseline gap-2'>
          <span className='text-xs font-medium'>子菜单项</span>
          <span className='tabular-nums text-[11px] text-muted'>
            {item.subItems.length} / {MAX_SUB_MENU_ITEMS}
          </span>
        </div>
        <Button
          size='sm'
          variant='ghost'
          isDisabled={item.subItems.length >= MAX_SUB_MENU_ITEMS}
          onPress={() => editor.addSubItem(item.key)}
        >
          <Plus className='size-3.5' aria-hidden='true' />
          添加
        </Button>
      </div>

      {listError ? <p className='mt-1 text-xs text-danger'>{listError}</p> : null}

      {item.subItems.length === 0 ? (
        <p className='mt-3 rounded-xl bg-surface/40 px-3 py-4 text-center text-xs text-muted'>至少添加一个子菜单项</p>
      ) : (
        <div className='mt-3 flex flex-col gap-2.5'>
          {item.subItems.map((sub, index) => {
            const base = `items.${item.key}.sub.${sub.key}`
            const nameError = errors[`${base}.name`]
            const messageError = errors[`${base}.sendMessage`]
            const linkError = errors[`${base}.link`]

            return (
              <div key={sub.key} className='rounded-xl p-3'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex min-w-0 items-center gap-2'>
                    <span className='tabular-nums text-[11px] text-muted'>{index + 1}</span>
                    <TypeToggle
                      value={sub.type}
                      compact
                      label='子菜单类型'
                      className='grid-cols-2'
                      options={[
                        { value: 'send_message', label: '发送消息' },
                        { value: 'link', label: '打开链接' },
                      ]}
                      onChange={(type: MenuSubItemDraft['type']) => editor.patchSubItem(item.key, sub.key, { type })}
                    />
                  </div>
                  <Button
                    isIconOnly
                    size='sm'
                    variant='ghost'
                    aria-label='删除子菜单项'
                    className='text-muted hover:text-danger'
                    onPress={() => editor.removeSubItem(item.key, sub.key)}
                  >
                    <X className='size-3.5' aria-hidden='true' />
                  </Button>
                </div>

                <div className='mt-2 grid gap-2 sm:grid-cols-2'>
                  <TextField
                    fullWidth
                    value={sub.name}
                    isInvalid={Boolean(nameError)}
                    onChange={(name) => editor.patchSubItem(item.key, sub.key, { name })}
                  >
                    <Label>名称</Label>
                    <Input placeholder='例如 帮助' />
                    <Description>
                      <CharacterCount value={sub.name} max={14} />
                    </Description>
                    <FieldError>{nameError}</FieldError>
                  </TextField>

                  {sub.type === 'link' ? (
                    <TextField
                      fullWidth
                      value={sub.link}
                      isInvalid={Boolean(linkError)}
                      onChange={(link) => editor.patchSubItem(item.key, sub.key, { link })}
                    >
                      <Label>链接</Label>
                      <Input type='url' placeholder='https://example.com' spellCheck={false} />
                      <FieldError>{linkError}</FieldError>
                    </TextField>
                  ) : (
                    <TextField
                      fullWidth
                      value={sub.sendMessage}
                      isInvalid={Boolean(messageError)}
                      onChange={(sendMessage) => editor.patchSubItem(item.key, sub.key, { sendMessage })}
                    >
                      <Label>发送内容</Label>
                      <Input placeholder='例如 /help' />
                      <FieldError>{messageError}</FieldError>
                    </TextField>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const MenuItemCard = ({
  editor,
  item,
  index,
  total,
}: {
  editor: MenuPanelEditor
  item: MenuItemDraft
  index: number
  total: number
}) => {
  const errors = editor.menuErrors
  const nameError = errors[`items.${item.key}.name`]
  const switchError = errors[`items.${item.key}.switchId`]
  const messageError = errors[`items.${item.key}.sendMessage`]
  const linkError = errors[`items.${item.key}.link`]

  return (
    <div className='rounded-2xl bg-surface/65 p-4'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='tabular-nums flex size-6 shrink-0 items-center justify-center rounded-md bg-default text-[11px] font-medium text-muted'>
            {index + 1}
          </span>
          <Select
            className='w-[8.5rem]'
            value={item.type}
            onChange={(next) => {
              if (typeof next !== 'string') return
              const option = TYPE_OPTIONS.find((entry) => entry.value === next)
              if (option) editor.patchMenuItem(item.key, { type: option.value })
            }}
          >
            <Label className='sr-only'>菜单类型</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {TYPE_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                      <div className='flex items-center gap-2'>
                        <Icon className='size-4 text-muted' aria-hidden='true' />
                        <span>{option.label}</span>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  )
                })}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <OrderButtons
          index={index}
          total={total}
          onMove={(direction) => editor.moveMenuItem(item.key, direction)}
          onRemove={() => editor.removeMenuItem(item.key)}
          removeLabel='删除菜单项'
        />
      </div>

      <TextField
        fullWidth
        className='mt-3'
        value={item.name}
        isInvalid={Boolean(nameError)}
        onChange={(name) => editor.patchMenuItem(item.key, { name })}
      >
        <Label>菜单名称</Label>
        <Input placeholder='例如 帮助' />
        <Description>
          <CharacterCount value={item.name} max={10} />
        </Description>
        <FieldError>{nameError}</FieldError>
      </TextField>

      {item.type === 'send_message' ? (
        <TextField
          fullWidth
          className='mt-3'
          value={item.sendMessage}
          isInvalid={Boolean(messageError)}
          onChange={(sendMessage) => editor.patchMenuItem(item.key, { sendMessage })}
        >
          <Label>发送内容</Label>
          <Input placeholder='例如 /help' />
          <Description>
            <CharacterCount value={item.sendMessage} max={512} suffix='用户点击后直接发送' />
          </Description>
          <FieldError>{messageError}</FieldError>
        </TextField>
      ) : null}

      {item.type === 'link' ? (
        <TextField
          fullWidth
          className='mt-3'
          value={item.link}
          isInvalid={Boolean(linkError)}
          onChange={(link) => editor.patchMenuItem(item.key, { link })}
        >
          <Label>链接</Label>
          <Input type='url' placeholder='https://example.com' spellCheck={false} />
          <Description>必须以 https:// 开头，用户点击后跳转。</Description>
          <FieldError>{linkError}</FieldError>
        </TextField>
      ) : null}

      {item.type === 'switch' ? (
        <div className='mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end'>
          <TextField
            fullWidth
            value={item.switchId}
            isInvalid={Boolean(switchError)}
            onChange={(switchId) => editor.patchMenuItem(item.key, { switchId })}
          >
            <Label>开关标识</Label>
            <Input placeholder='例如 search' spellCheck={false} />
            <Description>用户切换时会在消息 ext 中携带这个标识。</Description>
            <FieldError>{switchError}</FieldError>
          </TextField>

          <div className='flex h-9 items-center'>
            <Switch
              isSelected={item.switchDefault}
              onChange={(switchDefault) => editor.patchMenuItem(item.key, { switchDefault })}
            >
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <span className='text-xs text-muted'>默认开启</span>
              </Switch.Content>
            </Switch>
          </div>
        </div>
      ) : null}

      {item.type === 'menu' ? <SubMenuEditor editor={editor} item={item} /> : null}
    </div>
  )
}

/**
 * 自定义菜单编辑区。
 *
 * 菜单只在单聊生效，保存会覆盖整个菜单；一级菜单最多 10 个，
 * 子菜单项最多 5 个。
 */
export const MenuEditor = ({ editor }: MenuEditorProps) => {
  const { menu, menuLoad, loading, menuErrors } = editor

  if (menuLoad === 'error') {
    return (
      <div className='flex flex-col gap-3'>
        <Alert status='danger'>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>自定义菜单加载失败</Alert.Title>
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

  if (loading && !menu) {
    return (
      <div className='flex flex-col gap-4'>
        <Skeleton className='h-20 w-full rounded-2xl' />
        <Skeleton className='h-44 w-full rounded-2xl' />
      </div>
    )
  }

  if (!menu) {
    return (
      <EmptyState
        icon={<MenuIcon className='size-5' aria-hidden='true' />}
        title='菜单数据还没有加载'
        description='点击刷新重新读取自定义菜单。'
        action={
          <Button variant='secondary' onPress={() => void editor.reload()}>
            <RefreshCw className='size-4' aria-hidden='true' />
            刷新
          </Button>
        }
      />
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-start gap-3 rounded-2xl bg-surface/55 p-4'>
        <Info className='mt-0.5 size-4 shrink-0 text-muted' aria-hidden='true' />
        <p className='text-xs leading-5 text-muted'>
          自定义菜单只在单聊会话中显示。保存时会覆盖整个菜单，留空保存等同于清空。 最多 {MAX_MENU_ITEMS}{' '}
          个一级菜单，每个一级菜单最多 {MAX_SUB_MENU_ITEMS} 个子菜单项。
        </p>
      </div>

      <EditorSection
        title='菜单项'
        description='按顺序展示在聊天输入框上方。'
        actions={
          <span className='tabular-nums text-xs text-muted'>
            {menu.items.length} / {MAX_MENU_ITEMS}
          </span>
        }
        contentClassName='gap-3'
      >
        <div className='flex flex-col gap-3'>
          {menuErrors.items ? <p className='text-xs text-danger'>{menuErrors.items}</p> : null}

          {menu.items.length === 0 ? (
            <div className='rounded-2xl bg-surface/55 px-5 py-8 text-center'>
              <span className='mx-auto flex size-11 items-center justify-center rounded-2xl bg-default text-muted'>
                <MenuIcon className='size-5' aria-hidden='true' />
              </span>
              <p className='mt-3 text-sm font-medium'>还没有自定义菜单</p>
              <p className='mt-1 text-xs leading-5 text-muted'>添加一个菜单项，左侧单聊样机会实时出现菜单条。</p>
              <Button className='mt-4' onPress={editor.addMenuItem}>
                <Plus className='size-4' aria-hidden='true' />
                添加第一个菜单项
              </Button>
            </div>
          ) : (
            menu.items.map((item, index) => (
              <MenuItemCard key={item.key} editor={editor} item={item} index={index} total={menu.items.length} />
            ))
          )}

          {menu.items.length > 0 ? (
            <div className='flex flex-wrap items-center gap-2 pt-1'>
              <Button variant='secondary' isDisabled={menu.items.length >= MAX_MENU_ITEMS} onPress={editor.addMenuItem}>
                <Plus className='size-4' aria-hidden='true' />
                添加菜单项
              </Button>
              <span className='text-[11px] text-muted'>当前版本：{menu.version ?? '—'}</span>
            </div>
          ) : null}
        </div>
      </EditorSection>

      <div className='rounded-2xl bg-surface/50 p-4 text-xs leading-5 text-muted'>
        保存后，QQ 客户端里的菜单会立即更新。
      </div>
    </div>
  )
}
