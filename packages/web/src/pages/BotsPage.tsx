import { Button, Card } from '@heroui/react'
import { Bot, Plus, QrCode } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BotList } from '@/components/BotList'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useViewport } from '@/hooks/useViewport'

export const BotsPage = () => {
  const { config, loading } = useConfigStore()
  const { isMobile } = useViewport()
  const navigate = useNavigate()

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        eyebrow='Bots'
        title='机器人'
        description='每个机器人独立配置事件通道、场景开关和消息缓存。'
        actions={
          isMobile ? (
            <Button onPress={() => navigate('/bots/new')}>
              <Plus className='size-4' aria-hidden='true' />
              添加机器人
            </Button>
          ) : undefined
        }
      />

      {!loading && config.length === 0 ? (
        <EmptyState
          icon={<QrCode className='size-5' aria-hidden='true' />}
          title='还没有机器人'
          description='扫码授权后会自动创建配置。也可以进入添加页面手动填写 AppID 和 AppSecret。'
          action={
            <Button onPress={() => navigate('/bots/new')}>
              <QrCode className='size-4' aria-hidden='true' />
              添加第一个机器人
            </Button>
          }
        />
      ) : null}

      {config.length > 0 ? (
        <div className={isMobile ? 'flex flex-col gap-5' : 'grid items-start gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]'}>
          <BotList showAdd={false} className={isMobile ? undefined : 'xl:sticky xl:top-0'} />

          {isMobile ? null : (
            <Card className='flex min-h-80 flex-col items-center justify-center border border-dashed border-border bg-transparent p-8 text-center shadow-none'>
              <span className='flex size-12 items-center justify-center rounded-full border border-border bg-surface text-muted'>
                <Bot className='size-5' aria-hidden='true' />
              </span>
              <h3 className='text-heading mt-4 text-base font-semibold'>选择一个机器人</h3>
              <p className='mt-2 max-w-sm text-sm leading-6 text-muted'>
                从左侧选择机器人查看和修改配置。保存后适配器会自动重连，不需要重启 Karin。
              </p>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  )
}
