import { cn } from '@heroui/react'
import { gsap } from 'gsap'
import { useLayoutEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '@/lib/uiMotion'

export type EventType = 0 | 1 | 2

const eventLabels: Record<EventType, string> = {
  0: '已停用',
  1: 'Webhook',
  2: 'WebSocket',
}

export const getEventLabel = (type: EventType) => eventLabels[type]

export const getStatusState = (online: boolean, eventType: EventType) => {
  if (eventType === 0) return 'disabled'
  return online ? 'online' : 'offline'
}

export const getStatusLabel = (online: boolean, eventType: EventType) => {
  const state = getStatusState(online, eventType)
  return state === 'disabled' ? eventLabels[0] : state === 'online' ? '在线' : '离线'
}

interface StatusDotProps {
  online: boolean
  eventType: EventType
  /** 在线状态刚变化时让圆点轻微弹一下。 */
  pulse?: boolean
  className?: string
}

/**
 * 只显示状态圆点，供名册列表这类紧凑布局使用。
 */
export const StatusDot = ({ online, eventType, pulse = false, className }: StatusDotProps) => {
  const state = getStatusState(online, eventType)

  return (
    <span
      className={cn(
        'status-dot',
        state === 'online' && 'text-success',
        state === 'offline' && 'text-warning',
        state === 'disabled' && 'text-muted',
        pulse && 'status-dot--pulse',
        className
      )}
      data-online={state === 'online'}
      data-offline={state === 'offline'}
      aria-hidden='true'
    />
  )
}

interface StatusPillProps {
  online: boolean
  eventType: EventType
  pulse?: boolean
  className?: string
}

/**
 * 在线用绿色、离线用琥珀色、停用保持灰色，状态在列表里一眼可辨。
 */
export const StatusPill = ({ online, eventType, pulse = false, className }: StatusPillProps) => {
  const active = eventType !== 0
  const state = getStatusState(online, eventType)
  const label = getStatusLabel(online, eventType)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-xs',
        state === 'online' && 'text-success',
        state === 'offline' && 'text-warning',
        state === 'disabled' && 'text-muted',
        className
      )}
    >
      <StatusDot online={online} eventType={eventType} pulse={pulse} />
      <span>{label}</span>
      {active ? <span className='text-muted'>· {eventLabels[eventType]}</span> : null}
    </span>
  )
}

interface LeavingStatus {
  online: boolean
  eventType: EventType
}

interface StatusCrossfadeProps {
  online: boolean
  eventType: EventType
}

/**
 * 状态组换值时新旧两枚状态叠在一起交叉淡化。
 *
 * 整组横移交给顶栏做 FLIP，这里只负责颜色、文字和连接方式一起换，
 * 在线圆点在在线状态真正变化时轻弹一下，作为状态切换的落点。
 */
export const StatusCrossfade = ({ online, eventType }: StatusCrossfadeProps) => {
  const previous = useRef<LeavingStatus>({ online, eventType })
  const [leaving, setLeaving] = useState<LeavingStatus | null>(null)
  const currentRef = useRef<HTMLSpanElement>(null)
  const leavingRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const last = previous.current
    if (last.online === online && last.eventType === eventType) return
    previous.current = { online, eventType }
    setLeaving(last)
  }, [online, eventType])

  useLayoutEffect(() => {
    if (!leaving) return

    const current = currentRef.current
    const outgoing = leavingRef.current
    if (!current || !outgoing) {
      setLeaving(null)
      return
    }

    const reduce = prefersReducedMotion()
    const timeline = gsap.timeline({ onComplete: () => setLeaving(null) })
    timeline.fromTo(
      current,
      { autoAlpha: 0, y: reduce ? 0 : 2 },
      {
        autoAlpha: 1,
        y: 0,
        duration: reduce ? 0.12 : 0.18,
        ease: 'power2.out',
        clearProps: 'opacity,visibility,transform',
      },
      0
    )
    timeline.to(outgoing, { autoAlpha: 0, y: reduce ? 0 : -2, duration: reduce ? 0.12 : 0.16, ease: 'power2.out' }, 0)
    // 让圆点脉冲播完再卸载旧状态，避免新旧文字重叠时被突然抽走。
    timeline.to({}, { duration: reduce ? 0 : 0.06 })

    return () => {
      timeline.kill()
    }
  }, [leaving])

  const pulse = leaving !== null && leaving.online !== online

  return (
    <span className='relative inline-flex'>
      <span ref={currentRef} className='inline-flex'>
        <StatusPill online={online} eventType={eventType} pulse={pulse} />
      </span>
      {leaving ? (
        <span ref={leavingRef} aria-hidden='true' className='pointer-events-none absolute top-0 left-0 inline-flex'>
          <StatusPill online={leaving.online} eventType={leaving.eventType} />
        </span>
      ) : null}
    </span>
  )
}
