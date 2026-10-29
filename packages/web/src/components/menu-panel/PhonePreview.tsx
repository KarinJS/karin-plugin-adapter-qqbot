import { gsap } from 'gsap'
import { MessageCircle, Users } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import frameUrl from '@/assets/mockup/iphone-18-pro-max-frame.webp'
import maskUrl from '@/assets/mockup/iphone-18-pro-max-screen-mask.png'
import { SegmentedControl, type SegmentOption } from '@/components/menu-panel/SegmentedControl'
import { FakeQQChat } from '@/components/menu-panel/phone/FakeQQChat'
import type { MenuItemDraft, PanelDraft } from '@/lib/menuPanelDraft'
import type { PanelScene } from '@/lib/menuPanelTypes'
import { prefersReducedMotion } from '@/lib/uiMotion'

const FRAME_WIDTH = 1428
const FRAME_HEIGHT = 2959
const SCREEN_LEFT = 54
const SCREEN_TOP = 46
const SCREEN_WIDTH = 1320
const SCREEN_HEIGHT = 2868
const SCREEN_POINT_WIDTH = 440
const SCREEN_POINT_HEIGHT = 956

const SCENE_OPTIONS: SegmentOption<PanelScene>[] = [
  { value: 'c2c', label: '单聊', icon: <MessageCircle className='size-3.5' aria-hidden='true' /> },
  { value: 'group', label: '群聊', icon: <Users className='size-3.5' aria-hidden='true' /> },
]

interface PhonePreviewProps {
  scene: PanelScene
  onSceneChange: (scene: PanelScene) => void
  panel: PanelDraft | null
  menuItems: MenuItemDraft[]
  /** 右侧编辑器是否停在「指令面板」页。 */
  panelsActive: boolean
  botName: string
  botAvatar?: string
}

/**
 * iPhone 18 Pro Max 样机预览。
 *
 * 硬件图来自 PSD 的 Hardware 图层，屏幕遮罩来自 Screen 图层的 alpha；
 * 中间按 440 × 956 pt 排版的真实 UI 通过 mask 裁出圆角和灵动岛。
 */
export const PhonePreview = ({
  scene,
  onSceneChange,
  panel,
  menuItems,
  panelsActive,
  botName,
  botAvatar,
}: PhonePreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const enteredRef = useRef(false)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [sheetOpen, setSheetOpen] = useState(false)

  const panelKey = panel?.key ?? null

  // 官方里指令面板和自定义菜单互斥：停在「指令面板」页时抽屉展开，
  // 切到「自定义菜单」页则收起并露出输入框上方的菜单条。
  useEffect(() => {
    setSheetOpen(panelsActive && Boolean(panelKey))
  }, [panelKey, panelsActive])

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return

    const measure = () => {
      const rect = element.getBoundingClientRect()
      const maxWidth = Math.min(rect.width, 420)
      const maxHeight = Math.max(0, rect.height)
      const width = Math.max(0, Math.min(maxWidth, maxHeight * (FRAME_WIDTH / FRAME_HEIGHT)))
      setSize((current) =>
        Math.abs(current.width - width) < 0.5 ? current : { width, height: width * (FRAME_HEIGHT / FRAME_WIDTH) }
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const stage = stageRef.current
    if (!stage || size.width <= 0 || enteredRef.current) return
    enteredRef.current = true
    if (prefersReducedMotion()) return

    gsap.fromTo(
      stage,
      { autoAlpha: 0, y: 14, scale: 0.985 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' }
    )
  }, [size.width])

  const scale = size.width > 0 ? (size.width * (SCREEN_WIDTH / FRAME_WIDTH)) / SCREEN_POINT_WIDTH : 1

  const screenStyle: CSSProperties = {
    left: `${(SCREEN_LEFT / FRAME_WIDTH) * 100}%`,
    top: `${(SCREEN_TOP / FRAME_HEIGHT) * 100}%`,
    width: `${(SCREEN_WIDTH / FRAME_WIDTH) * 100}%`,
    height: `${(SCREEN_HEIGHT / FRAME_HEIGHT) * 100}%`,
    maskImage: `url("${maskUrl}")`,
    WebkitMaskImage: `url("${maskUrl}")`,
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center',
  }

  return (
    <div className='flex h-full w-full flex-col items-center gap-3'>
      <div
        className='flex w-full max-w-[420px] items-center justify-between gap-3 px-1'
        style={size.width > 0 ? { width: size.width } : undefined}
      >
        <span className='text-[11px] font-medium tracking-[0.14em] text-muted uppercase'>实时预览</span>
      </div>

      <SegmentedControl
        value={scene}
        options={SCENE_OPTIONS}
        onChange={onSceneChange}
        ariaLabel='聊天场景'
        className='w-[220px] shrink-0'
      />

      <div ref={containerRef} className='flex min-h-0 w-full flex-1 items-center justify-center'>
        {size.width > 0 ? (
          <div
            ref={stageRef}
            role='group'
            className='relative select-none'
            style={{ width: size.width, height: size.height }}
            aria-label='QQ 聊天界面预览'
          >
            <img
              src={frameUrl}
              alt=''
              draggable={false}
              className='pointer-events-none absolute inset-0 h-full w-full'
              style={{ filter: 'drop-shadow(0 26px 55px rgb(0 0 0 / 0.28))' }}
            />

            <div className='absolute overflow-hidden' style={screenStyle}>
              <div
                style={{
                  width: SCREEN_POINT_WIDTH,
                  height: SCREEN_POINT_HEIGHT,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
                <FakeQQChat
                  scene={scene}
                  panel={panel}
                  menuItems={menuItems}
                  sheetOpen={sheetOpen}
                  onOpenSheet={() => setSheetOpen(true)}
                  onCloseSheet={() => setSheetOpen(false)}
                  scale={scale}
                  botName={botName}
                  botAvatar={botAvatar}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
