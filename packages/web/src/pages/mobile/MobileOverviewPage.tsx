import { cn } from '@heroui/react'
import { BookOpen, Bot, Database, ExternalLink, GitFork, QrCode, RadioTower, Webhook } from 'lucide-react'
import { MobileActionRow, MobileGroup, MobilePageHeader, MobileRow } from '@/components/mobile/MobileGroup'
import { MobileBotList } from '@/components/mobile/MobileBotList'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useMobileSheet } from '@/hooks/useMobileSheet'

const DOCS_URL = 'https://karinjs.github.io/karin-plugin-adapter-qqbot/'
const GITHUB_URL = 'https://github.com/KarinJS/karin-plugin-adapter-qqbot'

type StatTone = 'default' | 'success' | 'warning'

const MobileStat = ({
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
  <div className='rounded-2xl border border-border/60 bg-surface p-3.5'>
    <div className='flex items-center justify-between'>
      <span className='text-[11px] text-muted'>{label}</span>
      <Icon
        className={cn(
          'size-3.5',
          tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-muted'
        )}
        aria-hidden='true'
      />
    </div>
    <p
      className={cn(
        'tabular-nums mt-2 text-[24px] leading-none font-semibold tracking-tight',
        tone === 'success' && 'text-success',
        tone === 'warning' && 'text-warning'
      )}
    >
      {value}
    </p>
    <p className='mt-1 truncate text-[10px] text-muted'>{hint}</p>
  </div>
)

export const MobileOverviewPage = () => {
  const { config, statuses } = useConfigStore()
  const { openAdd } = useMobileSheet()

  const onlineCount = config.filter((bot) => statuses[bot.appId]?.online).length
  const wsCount = config.filter((bot) => bot.event.type === 2).length
  const webhookCount = config.filter((bot) => bot.event.type === 1).length
  const disabledCount = config.filter((bot) => bot.event.type === 0).length
  const cacheCount = config.filter((bot) => bot.messageCache.enable).length
  const onlineTone: StatTone = config.length === 0 ? 'default' : onlineCount === config.length ? 'success' : 'warning'

  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col gap-4'>
      <MobilePageHeader title='概览' description='连接、事件通道与消息缓存的当前状态。' />

      <div className='grid grid-cols-2 gap-2.5'>
        <MobileStat
          label='机器人'
          value={String(config.length)}
          hint={config.length === 0 ? '还没有配置' : `${disabledCount} 个已停用`}
          icon={Bot}
        />
        <MobileStat
          label='在线'
          value={String(onlineCount)}
          hint={config.length === 0 ? '等待添加' : `共 ${config.length} 个机器人`}
          icon={RadioTower}
          tone={onlineTone}
        />
        <MobileStat
          label='事件通道'
          value={String(wsCount + webhookCount)}
          hint={`${wsCount} WebSocket · ${webhookCount} Webhook`}
          icon={Webhook}
        />
        <MobileStat
          label='消息缓存'
          value={String(cacheCount)}
          hint={cacheCount === 0 ? '未启用' : '已启用本地缓存'}
          icon={Database}
        />
      </div>

      <MobileBotList title='机器人' />

      <MobileGroup title='事件通道'>
        {[
          { label: 'WebSocket', count: wsCount, icon: RadioTower },
          { label: 'Webhook', count: webhookCount, icon: Webhook },
          { label: '已停用', count: disabledCount, icon: Bot },
        ].map((row) => {
          const Icon = row.icon
          return (
            <MobileRow key={row.label} className='flex items-center justify-between gap-3 py-2.5'>
              <span className='flex items-center gap-2 text-[13px] text-muted'>
                <Icon className='size-4' aria-hidden='true' />
                {row.label}
              </span>
              <span className='tabular-nums text-[13px] font-medium'>{row.count}</span>
            </MobileRow>
          )
        })}
      </MobileGroup>

      <MobileGroup title='快捷操作'>
        <MobileActionRow
          icon={<QrCode className='size-4' aria-hidden='true' />}
          label='扫码添加机器人'
          onPress={openAdd}
        />
        <MobileActionRow
          icon={<BookOpen className='size-4' aria-hidden='true' />}
          label='查看部署文档'
          trailing={<ExternalLink className='size-3.5 text-muted' aria-hidden='true' />}
          onPress={() => window.open(DOCS_URL, '_blank', 'noopener,noreferrer')}
        />
        <MobileActionRow
          icon={<GitFork className='size-4' aria-hidden='true' />}
          label='GitHub 仓库'
          trailing={<ExternalLink className='size-3.5 text-muted' aria-hidden='true' />}
          onPress={() => window.open(GITHUB_URL, '_blank', 'noopener,noreferrer')}
        />
      </MobileGroup>

      <p className='px-1 text-[10px] leading-5 text-muted'>
        配置保存后会写入 config.json，适配器自动重连受影响的机器人。
      </p>
    </div>
  )
}
