import { cn } from '@heroui/react'
import { ArrowUpRight, LayoutGrid, Link2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { MenuItemDraft } from '@/lib/menuPanelDraft'

interface MenuBarProps {
  items: MenuItemDraft[]
  /** 官方行为：发送消息 / 子菜单只把内容填进输入框，不直接发送。 */
  onFill: (text: string) => void
  onToast: (text: string) => void
}

const linkHost = (link: string) => {
  try {
    return new URL(link).host || '外部链接'
  } catch {
    return '外部链接'
  }
}

/**
 * 单聊输入框上方的自定义菜单条。
 *
 * 官方 QQ 的菜单块：29pt 高、全圆角、白底 1px 描边，图标 + 13pt 文字。
 * 开关项没有左侧图标，开启时换成低饱和藏青底，并在尾部点亮蓝点；
 * 菜单项左侧是宫格图标，点开后在上方弹出子菜单。
 */
export const MenuBar = ({ items, onFill, onToast }: MenuBarProps) => {
  const [switches, setSwitches] = useState<Record<string, boolean>>({})
  const [submenuKey, setSubmenuKey] = useState<string | null>(null)
  const [submenuOpen, setSubmenuOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const submenuItem = submenuKey ? (items.find((item) => item.key === submenuKey) ?? null) : null

  useEffect(() => {
    if (!submenuOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && barRef.current?.contains(target)) return
      setSubmenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [submenuOpen])

  useEffect(() => {
    if (submenuKey && !items.some((item) => item.key === submenuKey)) {
      setSubmenuOpen(false)
      setSubmenuKey(null)
    }
  }, [items, submenuKey])

  if (items.length === 0) return null

  const closeSubmenu = () => setSubmenuOpen(false)

  const handleItem = (item: MenuItemDraft) => {
    if (item.type === 'menu') {
      if (item.subItems.length === 0) {
        onToast('这个菜单还没有子菜单项')
        return
      }
      if (submenuOpen && submenuKey === item.key) {
        setSubmenuOpen(false)
        return
      }
      setSubmenuKey(item.key)
      setSubmenuOpen(true)
      return
    }

    closeSubmenu()

    if (item.type === 'switch') {
      const next = !(switches[item.key] ?? item.switchDefault)
      setSwitches((current) => ({ ...current, [item.key]: next }))
      onToast(`已${next ? '开启' : '关闭'}「${item.name.trim() || '未命名菜单'}」`)
      return
    }

    if (item.type === 'link') {
      const link = item.link.trim()
      if (!link) {
        onToast('这个菜单还没有配置链接')
        return
      }
      onToast(`预览中：将打开 ${linkHost(link)}`)
      return
    }

    const message = item.sendMessage.trim()
    if (!message) {
      onToast('这个菜单还没有发送内容')
      return
    }
    onFill(message)
  }

  const handleSubItem = (name: string, type: 'send_message' | 'link', value: string) => {
    const content = value.trim()
    if (!content) {
      onToast(type === 'link' ? '这个子菜单还没有配置链接' : '这个子菜单还没有发送内容')
      return
    }
    if (type === 'link') {
      onToast(`预览中：将打开 ${linkHost(content)}`)
    } else {
      onFill(content)
    }
    closeSubmenu()
  }

  return (
    <div ref={barRef} className='relative'>
      <div
        data-lenis-prevent
        className='[scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex items-center gap-2 overflow-x-auto px-2.5 pt-2'
      >
        {items.map((item) => {
          const on = switches[item.key] ?? item.switchDefault
          const expanded = item.type === 'menu' && submenuOpen && submenuKey === item.key

          return (
            <button
              key={item.key}
              type='button'
              onClick={() => handleItem(item)}
              aria-pressed={item.type === 'switch' ? on : undefined}
              aria-expanded={item.type === 'menu' ? expanded : undefined}
              className={cn(
                'flex h-7.25 shrink-0 items-center gap-1.5 rounded-full border border-(--qq-pill-border) bg-(--qq-pill-bg) px-2.5 text-[13px] leading-none font-normal whitespace-nowrap text-(--qq-text)',
                'transition-[background-color,color,border-color,scale] duration-150 active:scale-[0.96]',
                item.type === 'switch' && on && 'border-transparent bg-(--qq-switch-bg) text-(--qq-switch-text)',
                expanded && 'bg-(--qq-fill)'
              )}
            >
              {item.type === 'send_message' ? (
                <ArrowUpRight className='size-3.75' strokeWidth={2} aria-hidden='true' />
              ) : null}
              {item.type === 'link' ? <Link2 className='size-3.75' strokeWidth={2} aria-hidden='true' /> : null}
              {item.type === 'menu' ? <LayoutGrid className='size-3.75' strokeWidth={2} aria-hidden='true' /> : null}

              <span className='max-w-[7.5em] truncate'>{item.name.trim() || '未命名菜单'}</span>

              {item.type === 'switch' ? (
                <span
                  aria-hidden='true'
                  className={cn(
                    'size-1.5 shrink-0 rounded-full transition-colors duration-200',
                    on ? 'bg-(--qq-switch-dot)' : 'bg-(--qq-text)/20'
                  )}
                />
              ) : null}
            </button>
          )
        })}
      </div>

      <div
        data-open={submenuOpen && Boolean(submenuItem)}
        aria-hidden={!submenuOpen || !submenuItem}
        className={cn(
          'absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-59 origin-bottom -translate-x-1/2 overflow-hidden rounded-[18px] border border-(--qq-line) bg-(--qq-surface) text-(--qq-text)',
          'transition-[opacity,transform] duration-200 ease-out data-[open=true]:duration-280',
          submenuOpen && submenuItem
            ? 'translate-y-0 scale-100 opacity-100'
            : 'pointer-events-none translate-y-2 scale-95 opacity-0'
        )}
      >
        {submenuItem ? (
          <>
            <div className='flex items-center justify-between gap-3 px-4 pt-3 pb-2'>
              <span className='truncate text-[12px] font-medium text-(--qq-muted)'>
                {submenuItem.name.trim() || '未命名菜单'}
              </span>
              <span className='text-[10.5px] text-(--qq-muted)/70'>{submenuItem.subItems.length} 项</span>
            </div>
            <div className='h-px bg-(--qq-line)' aria-hidden='true' />
            <div data-lenis-prevent className='max-h-65 overflow-y-auto overscroll-contain py-1'>
              {submenuItem.subItems.length === 0 ? (
                <p className='px-4 py-4 text-center text-[12px] text-(--qq-muted)'>还没有子菜单项</p>
              ) : (
                submenuItem.subItems.map((sub) => (
                  <button
                    key={sub.key}
                    type='button'
                    onClick={() => handleSubItem(sub.name, sub.type, sub.type === 'link' ? sub.link : sub.sendMessage)}
                    className='flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] transition-colors duration-150 active:bg-(--qq-fill)'
                  >
                    <span className='flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-(--qq-fill) text-(--qq-muted)'>
                      {sub.type === 'link' ? (
                        <Link2 className='size-3' aria-hidden='true' />
                      ) : (
                        <ArrowUpRight className='size-3' aria-hidden='true' />
                      )}
                    </span>
                    <span className='truncate'>{sub.name.trim() || '未命名子菜单'}</span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
