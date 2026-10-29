import { cn } from '@heroui/react'
import { gsap } from 'gsap'
import { ChevronRight, Code2, ShieldCheck } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { PanelDraft } from '@/lib/menuPanelDraft'
import { prefersReducedMotion } from '@/lib/uiMotion'

interface PanelSheetProps {
  open: boolean
  panel: PanelDraft | null
  scale: number
  onClose: () => void
  /** 官方行为：点指令只把名称填进输入框，不直接发送。 */
  onPick: (text: string) => void
  onToast: (text: string) => void
}

const DISMISS_DISTANCE = 120
const DISMISS_VELOCITY = 0.45

/**
 * 手机里的快捷指令抽屉。
 *
 * 抽屉停在输入框上沿，盖住自定义菜单条，输入框和工具行保持可见；
 * 0.5s power3.out 入场；按住标题区向下拖拽时抽屉跟手移动，
 * 松手后按距离和速度决定回弹还是关闭。
 */
export const PanelSheet = ({ open, panel, scale, onClose, onPick, onToast }: PanelSheetProps) => {
  const [mounted, setMounted] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const exitTokenRef = useRef(0)
  const dragRef = useRef<{
    active: boolean
    startY: number
    startTime: number
    height: number
    delta: number
  } | null>(null)

  useEffect(() => {
    if (open) {
      exitTokenRef.current += 1
      setMounted(true)
      return
    }
    if (!mounted) return

    const sheet = sheetRef.current
    const scrim = scrimRef.current
    if (!sheet || !scrim) {
      setMounted(false)
      return
    }

    const token = ++exitTokenRef.current
    const reduce = prefersReducedMotion()
    gsap.killTweensOf([sheet, scrim])
    gsap.to(sheet, {
      y: sheet.offsetHeight || 640,
      duration: reduce ? 0.01 : 0.28,
      ease: 'power2.in',
      onComplete: () => {
        if (exitTokenRef.current === token) setMounted(false)
      },
    })
    gsap.to(scrim, { autoAlpha: 0, duration: reduce ? 0.01 : 0.2, ease: 'power2.in' })
  }, [open, mounted])

  useLayoutEffect(() => {
    if (!open || !mounted) return

    const sheet = sheetRef.current
    const scrim = scrimRef.current
    if (!sheet || !scrim) return

    exitTokenRef.current += 1
    gsap.killTweensOf([sheet, scrim])

    if (prefersReducedMotion()) {
      gsap.set(sheet, { autoAlpha: 1, y: 0 })
      gsap.set(scrim, { autoAlpha: 1 })
      return
    }

    gsap.set(sheet, { autoAlpha: 1, y: sheet.offsetHeight || 640 })
    gsap.to(sheet, { y: 0, duration: 0.5, ease: 'power3.out' })
    gsap.fromTo(scrim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' })
  }, [open, mounted])

  useEffect(() => {
    if (!open) return

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, open])

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    // 标题区整体可拖拽，但交互元素仍要能正常点击；
    // 指针捕获会把后续 click 重定向到拖拽区，所以这里直接跳过。
    if ((event.target as HTMLElement).closest('button, a, input, [role="button"]')) return

    const sheet = sheetRef.current
    if (!sheet) return

    dragRef.current = {
      active: true,
      startY: event.clientY,
      startTime: performance.now(),
      height: sheet.offsetHeight || 640,
      delta: 0,
    }
    gsap.killTweensOf([sheet, scrimRef.current])
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const sheet = sheetRef.current
    const scrim = scrimRef.current
    if (!drag?.active || !sheet || !scrim) return

    const ratio = scale || 1
    const delta = Math.max(0, Math.min(drag.height, (event.clientY - drag.startY) / ratio))
    drag.delta = delta
    gsap.set(sheet, { y: delta })
    gsap.set(scrim, { autoAlpha: Math.max(0, 1 - (delta / drag.height) * 1.25) })
  }

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const sheet = sheetRef.current
    const scrim = scrimRef.current
    dragRef.current = null
    if (!drag?.active || !sheet || !scrim) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const elapsed = Math.max(1, performance.now() - drag.startTime)
    const velocity = drag.delta / elapsed

    if (drag.delta > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) {
      onClose()
      return
    }

    gsap.to(sheet, { y: 0, duration: 0.4, ease: 'power3.out' })
    gsap.to(scrim, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' })
  }

  if (!mounted) return null

  const items = panel?.items ?? []

  return (
    <>
      <div
        ref={scrimRef}
        aria-hidden='true'
        onClick={onClose}
        style={{ visibility: 'hidden' }}
        className='absolute inset-x-0 top-0 bottom-[var(--qq-sheet-bottom)] z-[46] bg-[var(--qq-scrim)]'
      />

      <div
        ref={sheetRef}
        role='dialog'
        aria-modal='true'
        aria-label='快捷指令'
        style={{ visibility: 'hidden' }}
        className='absolute inset-x-0 bottom-[var(--qq-sheet-bottom)] z-50 flex max-h-[52%] flex-col overflow-hidden rounded-t-[18px] bg-[var(--qq-surface)] text-[var(--qq-text)] will-change-transform'
      >
        <div
          className='shrink-0 cursor-grab touch-none px-4 pt-1 pb-3 active:cursor-grabbing'
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <span className='mx-auto block h-1 w-[27px] rounded-full bg-[var(--qq-faint)]' aria-hidden='true' />

          <div className='mt-5 flex items-center gap-1 text-[var(--qq-muted)]'>
            <Code2 className='size-3' strokeWidth={2.4} aria-hidden='true' />
            <h2 className='text-[13px] leading-none font-normal'>快捷指令</h2>
          </div>
        </div>

        <div data-lenis-prevent className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-4'>
          {items.length === 0 ? (
            <div className='px-4 py-10 text-center'>
              <p className='text-[14px] font-medium'>这个面板还没有元素</p>
              <p className='mt-1 text-[12px] leading-[1.5] text-[var(--qq-muted)]'>
                在右侧添加指令或链接，这里会实时更新。
              </p>
            </div>
          ) : (
            items.map((item) => {
              const isLink = item.type === 'link'
              const name = item.name.trim()
              const desc = item.desc.trim()

              return (
                <button
                  key={item.key}
                  type='button'
                  onClick={() => {
                    if (!name) {
                      onToast('这个元素还没有名称')
                      return
                    }
                    if (isLink) {
                      let host = '外部链接'
                      try {
                        host = new URL(item.link.trim()).host || host
                      } catch {
                        // 链接还没填完整时仍然给出预览提示。
                      }
                      onToast(`预览中：将打开 ${host}`)
                      return
                    }
                    onPick(name)
                  }}
                  className={cn(
                    'flex h-[44px] w-full items-center gap-3 border-b border-[var(--qq-line)] text-left last:border-b-0',
                    'transition-colors duration-150 active:bg-[var(--qq-text)]/5'
                  )}
                >
                  <span className='flex min-w-0 flex-1 items-center gap-1.5'>
                    <span className='truncate text-[17px] leading-none'>{name || '未命名元素'}</span>
                    {item.onlyAdmin ? (
                      <span className='inline-flex shrink-0 items-center gap-0.5 rounded-[3px] bg-[var(--qq-text)]/6 px-1 py-0.5 text-[9px] leading-none text-[var(--qq-muted)]'>
                        <ShieldCheck className='size-[9px]' aria-hidden='true' />
                        管理员
                      </span>
                    ) : null}
                  </span>

                  {isLink ? (
                    <ChevronRight className='size-4 shrink-0 text-[var(--qq-muted)]/60' aria-hidden='true' />
                  ) : desc ? (
                    <span className='max-w-[52%] shrink-0 truncate text-right text-[15px] leading-none text-[var(--qq-faint)]'>
                      {desc}
                    </span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
