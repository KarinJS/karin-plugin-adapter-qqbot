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
 * 在线状态只用实心/空心圆点区分，保持黑白灰配色。
 */
export const StatusPill = ({ online, eventType, className }: StatusPillProps) => {
  const active = eventType !== 0
  const label = !active ? eventLabels[0] : online ? '在线' : '离线'

  return (
    <span className={cn('inline-flex items-center gap-2 text-xs text-muted', className)}>
      <span className='status-dot' data-online={active && online} aria-hidden='true' />
      <span>{label}</span>
      {active ? <span className='text-muted/70'>· {eventLabels[eventType]}</span> : null}
    </span>
  )
}
