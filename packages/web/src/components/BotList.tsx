import { Button, Skeleton, cn } from '@heroui/react'
import { ChevronRight, Plus, RadioTower } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  const listRef = useRef<HTMLDivElement>(null)
  const scrolledRef = useRef(false)
  const [scrolled, setScrolled] = useState(false)

  // 只在跨过顶部时改一次状态，滚动过程中不跟着 setState。
  const handleScroll = () => {
    const next = (listRef.current?.scrollTop ?? 0) > 1
    if (scrolledRef.current === next) return
    scrolledRef.current = next
    setScrolled(next)
  }

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    /** 找到页面真正的滚动容器：嵌入画布是页面 section，独立控制台是 main。 */
    const findPageScroller = () => {
      let node = list.parentElement
      while (node) {
        if (node.scrollHeight > node.clientHeight + 1) {
          const overflowY = window.getComputedStyle(node).overflowY
          if (overflowY === 'auto' || overflowY === 'scroll') return node
        }
        node = node.parentElement
      }
      return null
    }

    /**
     * 列表只接管指针在卡片上时的滚轮。
     *
     * 指针停在卡片之间的空白处时，滚轮交还给页面，右侧表单继续滚动；
     * 列表滚到两端后也把剩余滚动量交出去，避免指针停在卡片上时页面完全动不了。
     */
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return

      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      const target = event.target as HTMLElement | null
      const overCard = Boolean(target?.closest('[data-bot-id]'))
      const canScroll =
        delta < 0 ? list.scrollTop > 0 : list.scrollTop + list.clientHeight < list.scrollHeight - 1

      if (overCard && canScroll) return

      const page = findPageScroller()
      if (!page) return

      event.preventDefault()
      page.scrollTop += delta
    }

    list.addEventListener('wheel', handleWheel, { passive: false })
    return () => list.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <section className={cn('flex min-h-0 flex-col gap-3', className)} aria-label='机器人列表'>
      {/*
        标题悬浮在列表上方，背后用带遮罩的背景模糊做渐变，不铺实心底色。
        卡片从下面滚过时会逐渐化开，标题本身始终停在屏幕顶部。
      */}
      <div className='sticky top-0 z-20 -mx-1 px-1'>
        <div className='bot-list-header flex items-center justify-between gap-3 px-1 py-3'>
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
      </div>

      <div className='relative min-h-0 flex-1'>
        <div
          ref={listRef}
          onScroll={handleScroll}
          className='no-scrollbar h-full overflow-y-auto overscroll-contain'
        >
          {loading && config.length === 0 ? (
            <div className='flex flex-col gap-2 py-2'>
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
                data-bot-id={bot.appId}
                variant='ghost'
                className={cn(
                  'relative isolate h-auto justify-start gap-3 overflow-hidden rounded-none border-b border-border/60 p-3.5 text-left last:border-b-0',
                  selected ? 'bg-transparent' : 'hover:bg-default/50'
                )}
                aria-current={selected ? 'page' : undefined}
                onPress={() => navigate(`/bots/${encodeURIComponent(bot.appId)}`)}
              >
                {/* 选中态用内嵌的圆角块，不用左侧竖条：浅灰底 + 细描边，和列表本身保持同一层。 */}
                {selected ? (
                  <span
                    className='pointer-events-none absolute inset-1.5 -z-10 rounded-xl bg-default ring-1 ring-border/70 shadow-[0_1px_2px_rgb(0_0_0/0.04)]'
                    aria-hidden='true'
                  />
                ) : null}
                <BotAvatar name={title} avatar={status?.avatar} />
                <span className='flex min-w-0 flex-1 flex-col gap-1'>
                  <span className={cn('truncate text-sm', selected ? 'font-semibold' : 'font-medium')}>{title}</span>
                  <span className='truncate text-xs text-muted'>{bot.appId}</span>
                  <StatusPill online={status?.online ?? false} eventType={bot.event.type} />
                </span>
                <ChevronRight
                  className={cn(
                    'size-4 shrink-0 transition-colors duration-150',
                    selected ? 'text-foreground' : 'text-muted'
                  )}
                  aria-hidden='true'
                />
              </Button>
            )
          })}
        </div>

        {/* 卡片在列表内部滚动时，顶部同样渐隐，避免第一张卡被硬切。 */}
        <div
          aria-hidden='true'
          className={cn(
            'list-edge-blur pointer-events-none absolute inset-x-0 top-0 h-8 transition-opacity duration-200',
            scrolled ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
    </section>
  )
}
