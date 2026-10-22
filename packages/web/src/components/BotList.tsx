import { Button, Skeleton, cn } from '@heroui/react'
import { ChevronRight, Plus, RadioTower } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BotAvatar } from '@/components/BotAvatar'
import { StatusPill } from '@/components/StatusPill'
import { useConfigStore } from '@/hooks/useConfigStore'

interface BotListProps {
  selectedAppId?: string
  className?: string
  showAdd?: boolean
}

export const BotList = ({ selectedAppId, className, showAdd = true }: BotListProps) => {
  const { config, statuses, loading } = useConfigStore()
  const navigate = useNavigate()

  return (
    <section className={cn('flex flex-col gap-3', className)} aria-label='机器人列表'>
      <div className='flex items-center justify-between gap-3 px-1'>
        <div className='flex items-baseline gap-2'>
          <h2 className='text-heading text-base font-semibold'>机器人</h2>
          <span className='tabular text-xs text-muted'>{config.length}</span>
        </div>
        {showAdd ? (
          <Button size='sm' variant='secondary' onPress={() => navigate('/bots/new')}>
            <Plus className='size-4' aria-hidden='true' />
            添加
          </Button>
        ) : null}
      </div>

      <div className='overflow-hidden rounded-2xl border border-border/80 bg-surface'>
        {loading && config.length === 0 ? (
          <div className='flex flex-col gap-2 p-3'>
            <Skeleton className='h-16 w-full rounded-xl' />
            <Skeleton className='h-16 w-full rounded-xl' />
            <Skeleton className='h-16 w-full rounded-xl' />
          </div>
        ) : null}

        {!loading && config.length === 0 ? (
          <div className='flex flex-col items-center gap-3 px-5 py-10 text-center'>
            <div className='flex size-10 items-center justify-center rounded-full border border-border text-muted'>
              <RadioTower className='size-4' aria-hidden='true' />
            </div>
            <p className='text-sm text-muted'>还没有配置机器人</p>
            <Button size='sm' variant='secondary' onPress={() => navigate('/bots/new')}>
              扫码添加第一个
            </Button>
          </div>
        ) : null}

        {config.map((bot) => {
          const status = statuses[bot.appId]
          const selected = selectedAppId === bot.appId
          const title = status?.name || bot.appId

          return (
            <Button
              key={bot.appId}
              fullWidth
              variant={selected ? 'secondary' : 'ghost'}
              className={cn(
                'relative h-auto justify-start gap-3 overflow-hidden rounded-none border-b border-border/60 p-3.5 text-left last:border-b-0',
                selected ? 'bg-default' : 'hover:bg-default/50'
              )}
              aria-current={selected ? 'page' : undefined}
              onPress={() => navigate(`/bots/${encodeURIComponent(bot.appId)}`)}
            >
              <span
                className={cn(
                  'absolute inset-y-2 left-0 w-[3px] rounded-full bg-foreground transition-opacity duration-150',
                  selected ? 'opacity-100' : 'opacity-0'
                )}
                aria-hidden='true'
              />
              <BotAvatar name={title} avatar={status?.avatar} />
              <span className='flex min-w-0 flex-1 flex-col gap-1'>
                <span className='truncate text-sm font-medium'>{title}</span>
                <span className='truncate text-xs text-muted'>{bot.appId}</span>
                <StatusPill online={status?.online ?? false} eventType={bot.event.type} />
              </span>
              <ChevronRight className='size-4 shrink-0 text-muted' aria-hidden='true' />
            </Button>
          )
        })}
      </div>
    </section>
  )
}
