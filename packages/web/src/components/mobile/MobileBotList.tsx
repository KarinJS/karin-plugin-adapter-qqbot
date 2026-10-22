import { Button, Skeleton, cn } from '@heroui/react'
import { QrCode } from 'lucide-react'
import { BotAvatar } from '@/components/BotAvatar'
import { getEventLabel } from '@/components/StatusPill'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useMobileSheet } from '@/hooks/useMobileSheet'

interface MobileBotListProps {
  title?: string
  className?: string
}

/**
 * 手机端机器人列表。
 *
 * 每一行直接打开底部抽屉，不放右箭头，避免用户误以为会横向进入详情页。
 */
export const MobileBotList = ({ title, className }: MobileBotListProps) => {
  const { config, statuses, loading } = useConfigStore()
  const { activeAppId, isOpen, open, openAdd } = useMobileSheet()

  return (
    <section className={cn('flex flex-col gap-2', className)} aria-label='机器人列表'>
      {title ? (
        <div className='flex items-center justify-between px-1'>
          <h2 className='text-[13px] font-medium text-muted'>{title}</h2>
          <span className='tabular text-[11px] text-muted'>{config.length}</span>
        </div>
      ) : null}

      <div className='overflow-hidden rounded-2xl border border-border/60 bg-surface'>
        {loading && config.length === 0 ? (
          <div className='flex flex-col gap-2 p-3'>
            <Skeleton className='h-14 w-full rounded-xl' />
            <Skeleton className='h-14 w-full rounded-xl' />
            <Skeleton className='h-14 w-full rounded-xl' />
          </div>
        ) : null}

        {!loading && config.length === 0 ? (
          <div className='flex flex-col items-center gap-3 px-5 py-8 text-center'>
            <span className='flex size-10 items-center justify-center rounded-full bg-surface-secondary text-muted'>
              <QrCode className='size-4' aria-hidden='true' />
            </span>
            <div>
              <p className='text-sm font-medium'>还没有机器人</p>
              <p className='mt-1 text-[11px] leading-5 text-muted'>扫码授权后会自动创建配置。</p>
            </div>
            <Button size='sm' onPress={openAdd}>
              扫码添加
            </Button>
          </div>
        ) : null}

        {config.map((bot) => {
          const status = statuses[bot.appId]
          const active = status?.online ?? false
          const enabled = bot.event.type !== 0
          const stateLabel = !enabled ? '已停用' : active ? '在线' : '离线'
          const titleText = status?.name || bot.appId
          const selected = isOpen && activeAppId === bot.appId

          return (
            <button
              key={bot.appId}
              type='button'
              className={cn(
                'pressable flex w-full items-center gap-3 border-b border-border/50 px-3.5 py-3 text-left last:border-b-0 active:bg-default/70',
                selected && 'bg-default/70'
              )}
              aria-label={`打开 ${titleText} 的配置`}
              onClick={() => open(bot.appId)}
            >
              <BotAvatar name={titleText} avatar={status?.avatar} size='md' />
              <span className='min-w-0 flex-1'>
                <span className='flex min-w-0 items-center gap-2'>
                  <span className='truncate text-[15px] font-semibold tracking-[-0.01em]'>{titleText}</span>
                  <span
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1 text-[11px]',
                      !enabled ? 'text-muted' : active ? 'text-success' : 'text-warning'
                    )}
                  >
                    <span
                      className='status-dot'
                      data-online={active}
                      data-offline={enabled && !active}
                      aria-hidden='true'
                    />
                    {stateLabel}
                  </span>
                </span>
                <span className='mt-0.5 block truncate text-[11px] text-muted'>
                  {bot.appId}
                  {enabled ? ` · ${getEventLabel(bot.event.type)}` : ''}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
