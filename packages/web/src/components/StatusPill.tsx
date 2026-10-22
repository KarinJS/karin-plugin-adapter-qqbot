import { cn } from '@heroui/react'

export type EventType = 0 | 1 | 2

const eventLabels: Record<EventType, string> = {
  0: '已停用',
  1: 'Webhook',
  2: 'WebSocket',
}

export const getEventLabel = (type: EventType) => eventLabels[type]

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
  const state = !active ? 'disabled' : online ? 'online' : 'offline'
  const label = state === 'disabled' ? eventLabels[0] : state === 'online' ? '在线' : '离线'

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
      <span
        className='status-dot'
        data-online={state === 'online'}
        data-offline={state === 'offline'}
        aria-hidden='true'
      />
      <span>{label}</span>
      {active ? <span className='text-muted'>· {eventLabels[eventType]}</span> : null}
    </span>
  )
}
