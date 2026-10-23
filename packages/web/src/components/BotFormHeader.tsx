import { gsap } from 'gsap'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { StatusCrossfade, type EventType } from '@/components/StatusPill'
import {
  dissolveBox,
  morphText,
  snapshotBox,
  snapshotText,
  type BoxSnapshot,
  type ParticleHandle,
  type TextSnapshot,
} from '@/lib/textParticles'
import { isDesktopMotion, prefersReducedMotion, UI_MOTION_EASE } from '@/lib/uiMotion'

const STATUS_FLIP_DURATION = 0.26

interface BotFormHeaderProps {
  appId: string
  name: string
  online: boolean
  eventType: EventType
  dirty: boolean
  actions: ReactNode
}

interface HeaderLayout {
  appId: string
  name: TextSnapshot | null
  statusRect: DOMRect | null
  badge: BoxSnapshot | null
}

/**
 * 机器人表单的固定顶栏。
 *
 * 翻页时只有下方内容移动，这层始终钉在顶部；数据变化时用各自的动效衔接：
 * 名字粒子化重组、状态组整组平移并交叉淡化、未保存标记跟着平移或粒子消散。
 */
export const BotFormHeader = ({ appId, name, online, eventType, dirty, actions }: BotFormHeaderProps) => {
  const nameRef = useRef<HTMLHeadingElement>(null)
  const statusRef = useRef<HTMLSpanElement>(null)
  const badgeRef = useRef<HTMLSpanElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const previousRef = useRef<HeaderLayout | null>(null)
  const morphRef = useRef<ParticleHandle | null>(null)
  const badgeDissolveRef = useRef<ParticleHandle | null>(null)
  const statusFlipRef = useRef<gsap.core.Tween | null>(null)
  const badgeFlipRef = useRef<gsap.core.Tween | null>(null)
  const subtitleTweenRef = useRef<gsap.core.Tween | null>(null)

  useLayoutEffect(() => {
    const nameElement = nameRef.current
    const statusElement = statusRef.current
    const badgeElement = badgeRef.current
    const subtitleElement = subtitleRef.current

    const next: HeaderLayout = {
      appId,
      name: snapshotText(nameElement),
      statusRect: statusElement?.getBoundingClientRect() ?? null,
      badge: snapshotBox(badgeElement),
    }
    const previous = previousRef.current
    previousRef.current = next

    if (!previous) return

    const reduce = prefersReducedMotion()
    const desktop = isDesktopMotion()
    const switching = previous.appId !== appId

    // 名字：旧文字散成粒子，新文字从粒子中收拢；总时长和表单翻页一致。
    const previousName = previous.name
    const nextName = next.name
    if (previousName && nextName && previousName.text !== nextName.text) {
      if (desktop && !reduce && nameElement) {
        morphRef.current?.cancel()
        morphRef.current = morphText(previousName, nameElement)
      }
    }

    // 副标题换 appId 时淡入，避免文字直接跳变。
    if (switching && subtitleElement && !reduce) {
      subtitleTweenRef.current?.kill()
      subtitleTweenRef.current = gsap.fromTo(
        subtitleElement,
        { autoAlpha: 0.35 },
        { autoAlpha: 1, duration: 0.24, ease: 'power2.out', clearProps: 'opacity,visibility' }
      )
    }

    // 状态组整体横移：名字长度变化时，后面的状态沿曲线滑到新位置，不会瞬移。
    if (statusElement && previous.statusRect && next.statusRect) {
      const deltaX = previous.statusRect.left - next.statusRect.left
      if (!reduce && Math.abs(deltaX) > 0.5) {
        statusFlipRef.current?.kill()
        statusFlipRef.current = gsap.fromTo(
          statusElement,
          { x: deltaX },
          { x: 0, duration: STATUS_FLIP_DURATION, ease: UI_MOTION_EASE, clearProps: 'transform', overwrite: 'auto' }
        )
      }
    }

    // 未保存标记还在时跟着状态一起平移；换机器人消失时用粒子散掉。
    if (badgeElement && previous.badge && next.badge) {
      const deltaX = previous.badge.rect.left - next.badge.rect.left
      if (!reduce && Math.abs(deltaX) > 0.5) {
        badgeFlipRef.current?.kill()
        badgeFlipRef.current = gsap.fromTo(
          badgeElement,
          { x: deltaX },
          { x: 0, duration: STATUS_FLIP_DURATION, ease: UI_MOTION_EASE, clearProps: 'transform', overwrite: 'auto' }
        )
      }
    } else if (!badgeElement && previous.badge && switching && desktop && !reduce) {
      badgeDissolveRef.current?.cancel()
      badgeDissolveRef.current = dissolveBox(previous.badge)
    }
  }, [appId, name, online, eventType, dirty])

  useEffect(
    () => () => {
      morphRef.current?.cancel()
      badgeDissolveRef.current?.cancel()
      statusFlipRef.current?.kill()
      badgeFlipRef.current?.kill()
      subtitleTweenRef.current?.kill()
    },
    []
  )

  return (
    <div data-form-header='' className='xl:sticky xl:top-0 xl:z-20 xl:h-21'>
      <div aria-hidden='true' className='edge-blur edge-blur--top edge-blur--header hidden xl:block'>
        <div className='edge-blur__layer edge-blur__layer--strong' />
        <div className='edge-blur__layer edge-blur__layer--medium' />
        <div className='edge-blur__layer edge-blur__layer--soft' />
      </div>

      {/* 标题顶边和左侧列表标题对齐：84px 高、20px 字、顶部 30.5px。 */}
      <div className='relative z-20 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between xl:pt-[30.5px] xl:pb-2'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 xl:flex-nowrap'>
            <h2 ref={nameRef} className='text-heading min-w-0 truncate text-xl font-semibold'>
              {name}
            </h2>
            <span ref={statusRef} className='inline-flex shrink-0'>
              <StatusCrossfade online={online} eventType={eventType} />
            </span>
            {dirty ? (
              <span
                ref={badgeRef}
                className='unsaved-badge shrink-0 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[0.6875rem] text-warning'
              >
                未保存
              </span>
            ) : null}
          </div>
          <p ref={subtitleRef} className='mt-1 text-xs text-muted'>
            {appId} · 保存后适配器会销毁旧连接并重新初始化
          </p>
        </div>
        {actions}
      </div>
    </div>
  )
}
