import { Button, Skeleton, toast } from '@heroui/react'
import { ArrowLeft, Bot, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BotForm } from '@/components/BotForm'
import { BotList } from '@/components/BotList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { SectionCard } from '@/components/SectionCard'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useViewport } from '@/hooks/useViewport'

const decodeAppId = (value: string | undefined) => {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export const BotDetailPage = () => {
  const { appId: rawAppId } = useParams<{ appId: string }>()
  const appId = decodeAppId(rawAppId)
  const { config, loading, remove, saving } = useConfigStore()
  const { isMobile } = useViewport()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const bot = config.find((item) => item.appId === appId)

  const handleRemove = async () => {
    if (!bot) return
    setRemoving(true)

    try {
      await remove(bot.appId)
      setConfirmOpen(false)
      toast.success('机器人已移除', { description: `${bot.appId} 已从配置中删除` })
      navigate('/bots', { replace: true })
    } catch {
      // ConfigProvider 已经记录错误。
    } finally {
      setRemoving(false)
    }
  }

  if (loading && !bot) {
    return (
      <div className='flex flex-col gap-4'>
        <Skeleton className='h-9 w-56 rounded-xl' />
        <Skeleton className='h-40 w-full rounded-2xl' />
        <Skeleton className='h-64 w-full rounded-2xl' />
      </div>
    )
  }

  if (!bot) {
    return (
      <EmptyState
        icon={<Bot className='size-5' aria-hidden='true' />}
        title='找不到这个机器人'
        description='它可能已经被移除，或者配置文件在另一个窗口里被修改。'
        action={
          <Button variant='secondary' onPress={() => navigate('/bots')}>
            <ArrowLeft className='size-4' aria-hidden='true' />
            返回机器人列表
          </Button>
        }
      />
    )
  }

  const dangerZone = (
    <SectionCard title='移除机器人' description='从 config.json 中删除该机器人，并断开当前连接。'>
      <Button variant='secondary' onPress={() => setConfirmOpen(true)}>
        <Trash2 className='size-4' aria-hidden='true' />
        移除 {bot.appId}
      </Button>
    </SectionCard>
  )

  return (
    <>
      <div className={isMobile ? 'flex flex-col gap-5' : 'grid items-start gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]'}>
        {isMobile ? null : <BotList selectedAppId={bot.appId} showAdd={false} className='xl:sticky xl:top-0' />}

        <div className='flex min-w-0 flex-col gap-5'>
          <BotForm bot={bot} />
          {dangerZone}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title='移除这个机器人？'
        description={
          <>
            将从配置文件中删除 <span className='font-medium text-foreground'>{bot.appId}</span>
            ，并断开它的连接。这个操作不会在 QQ 开放平台侧删除机器人。
          </>
        }
        confirmLabel='移除'
        isPending={removing || saving}
        onConfirm={handleRemove}
      />
    </>
  )
}
