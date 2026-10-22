import { useGSAP } from '@gsap/react'
import { Button, Card, cn } from '@heroui/react'
import { gsap } from 'gsap'
import { BookOpen, Bot, Database, ExternalLink, GitFork, Plus, QrCode, RadioTower, Webhook } from 'lucide-react'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotList } from '@/components/BotList'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useEmbedded } from '@/hooks/useEmbedded'
import { useViewport } from '@/hooks/useViewport'

const DOCS_URL = 'https://karinjs.github.io/karin-plugin-adapter-qqbot/'
const GITHUB_URL = 'https://github.com/KarinJS/karin-plugin-adapter-qqbot'

type StatTone = 'default' | 'success' | 'warning'

const StatCard = ({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  hint: string
  icon: typeof Bot
  tone?: StatTone
}) => (
  <div data-stat className='rounded-2xl border border-border/80 bg-surface p-5'>
    <div className='flex items-center justify-between'>
      <span className='text-xs text-muted'>{label}</span>
      <Icon
        className={cn(
          'size-4',
          tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-muted'
        )}
        aria-hidden='true'
      />
    </div>
    <p
      className={cn(
        'tabular mt-4 text-3xl font-semibold tracking-tight',
        tone === 'success' && 'text-success',
        tone === 'warning' && 'text-warning'
      )}
    >
      {value}
    </p>
    <p className='mt-1 text-xs text-muted'>{hint}</p>
  </div>
)

export const OverviewPage = () => {
  const { config, statuses, loading } = useConfigStore()
  const { isMobile, isLandscape } = useViewport()
  const embedded = useEmbedded()
  const navigate = useNavigate()
  const statsRef = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const cards = statsRef.current?.querySelectorAll('[data-stat]')
      if (!cards?.length) return

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: reduceMotion ? 0 : 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reduceMotion ? 0.15 : 0.28,
          stagger: reduceMotion ? 0 : 0.05,
          ease: 'power3.out',
          clearProps: 'transform,visibility,opacity',
        }
      )
    },
    { scope: statsRef }
  )

  const onlineCount = config.filter((bot) => statuses[bot.appId]?.online).length
  const wsCount = config.filter((bot) => bot.event.type === 2).length
  const webhookCount = config.filter((bot) => bot.event.type === 1).length
  const disabledCount = config.filter((bot) => bot.event.type === 0).length
  const cacheCount = config.filter((bot) => bot.messageCache.enable).length
  const onlineTone: StatTone = config.length === 0 ? 'default' : onlineCount === config.length ? 'success' : 'warning'

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        eyebrow='Overview'
        title='概览'
        description='机器人连接、事件通道和消息缓存的当前状态。'
        actions={
          isMobile ? (
            <Button onPress={() => navigate('/bots/new')}>
              <Plus className='size-4' aria-hidden='true' />
              添加机器人
            </Button>
          ) : undefined
        }
      />

      <div
        ref={statsRef}
        className={cn('grid gap-3', isMobile && isLandscape ? 'grid-cols-4' : 'grid-cols-2 xl:grid-cols-4')}
      >
        <StatCard
          label='机器人'
          value={String(config.length)}
          hint={config.length === 0 ? '还没有配置' : `${disabledCount} 个已停用`}
          icon={Bot}
        />
        <StatCard
          label='在线'
          value={String(onlineCount)}
          hint={config.length === 0 ? '等待添加' : `共 ${config.length} 个机器人`}
          icon={RadioTower}
          tone={onlineTone}
        />
        <StatCard
          label='事件通道'
          value={String(wsCount + webhookCount)}
          hint={`${wsCount} WebSocket · ${webhookCount} Webhook`}
          icon={Webhook}
        />
        <StatCard
          label='消息缓存'
          value={String(cacheCount)}
          hint={cacheCount === 0 ? '未启用' : '已启用本地缓存'}
          icon={Database}
        />
      </div>

      {loading && config.length === 0 ? (
        <div className='grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]'>
          <div className='h-64 animate-pulse rounded-2xl border border-border/80 bg-surface' />
          <div className='h-64 animate-pulse rounded-2xl border border-border/80 bg-surface' />
        </div>
      ) : null}

      {!loading && config.length === 0 ? (
        <EmptyState
          icon={<QrCode className='size-5' aria-hidden='true' />}
          title='从一次扫码开始'
          description='用手机 QQ 扫码授权机器人，AppID 和 AppSecret 会自动写入配置，不需要手动复制。'
          action={
            <Button onPress={() => navigate('/bots/new')}>
              <QrCode className='size-4' aria-hidden='true' />
              扫码添加机器人
            </Button>
          }
        />
      ) : null}

      {config.length > 0 ? (
        <div
          className={cn(
            'grid items-start gap-5',
            isMobile ? 'grid-cols-1' : 'xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]'
          )}
        >
          <BotList showAdd={false} />

          <div className='flex flex-col gap-5'>
            <SectionCard title='事件通道' description='按机器人的接收方式统计。'>
              <div className='flex flex-col gap-3'>
                {[
                  { label: 'WebSocket', count: wsCount, icon: RadioTower },
                  { label: 'Webhook', count: webhookCount, icon: Webhook },
                  { label: '已停用', count: disabledCount, icon: Bot },
                ].map((row) => {
                  const Icon = row.icon
                  return (
                    <div key={row.label} className='flex items-center justify-between gap-3'>
                      <span className='flex items-center gap-2 text-sm text-muted'>
                        <Icon className='size-4' aria-hidden='true' />
                        {row.label}
                      </span>
                      <span className='tabular text-sm font-medium'>{row.count}</span>
                    </div>
                  )
                })}
              </div>
            </SectionCard>

            <SectionCard title='快捷操作'>
              <div className='flex flex-col gap-2'>
                <Button fullWidth className='justify-start' variant='secondary' onPress={() => navigate('/bots/new')}>
                  <QrCode className='size-4' aria-hidden='true' />
                  扫码添加机器人
                </Button>
                <Button
                  fullWidth
                  className='justify-start'
                  variant='ghost'
                  onPress={() => window.open(DOCS_URL, '_blank', 'noopener,noreferrer')}
                >
                  <BookOpen className='size-4' aria-hidden='true' />
                  查看部署文档
                  <ExternalLink className='ml-auto size-3.5 text-muted' aria-hidden='true' />
                </Button>
                <Button
                  fullWidth
                  className='justify-start'
                  variant='ghost'
                  onPress={() => window.open(GITHUB_URL, '_blank', 'noopener,noreferrer')}
                >
                  <GitFork className='size-4' aria-hidden='true' />
                  GitHub 仓库
                  <ExternalLink className='ml-auto size-3.5 text-muted' aria-hidden='true' />
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      <Card className='border border-dashed border-border bg-transparent shadow-none'>
        <Card.Content className='flex flex-col gap-2 p-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between'>
          <span>配置保存后会写入 config.json，适配器自动重连受影响的机器人。</span>
          {embedded ? null : (
            <Button size='sm' variant='ghost' onPress={() => navigate('/settings')}>
              查看设置
            </Button>
          )}
        </Card.Content>
      </Card>
    </div>
  )
}
