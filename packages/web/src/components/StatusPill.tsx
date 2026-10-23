import { cn } from '@heroui/react'

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
  className?: string
}

/**
 * 只显示状态圆点，供名册列表这类紧凑布局使用。
 */
export const StatusDot = ({ online, eventType, className }: StatusDotProps) => {
  const state = getStatusState(online, eventType)

  return (
    <span
      className={cn(
        'status-dot',
        state === 'online' && 'text-success',
        state === 'offline' && 'text-warning',
        state === 'disabled' && 'text-muted',
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
  className?: string
}

/**
 * 在线用绿色、离线用琥珀色、停用保持灰色，状态在列表里一眼可辨。
 */
export const StatusPill = ({ online, eventType, className }: StatusPillProps) => {
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
      <StatusDot online={online} eventType={eventType} />
      <span>{label}</span>
      {active ? <span className='text-muted'>· {eventLabels[eventType]}</span> : null}
    </span>
  )
}
