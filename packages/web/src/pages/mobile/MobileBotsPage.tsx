import { Button } from '@heroui/react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MobileBotList } from '@/components/mobile/MobileBotList'
import { MobilePageHeader } from '@/components/mobile/MobileGroup'
import { useConfigStore } from '@/hooks/useConfigStore'

export const MobileBotsPage = () => {
  const { config, statuses, loading } = useConfigStore()
  const navigate = useNavigate()
  const onlineCount = config.filter((bot) => statuses[bot.appId]?.online).length

  const description =
    loading && config.length === 0
      ? '正在读取配置'
      : config.length === 0
        ? '扫码或手动添加第一个机器人'
        : `${config.length} 个机器人 · ${onlineCount} 个在线`

  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col gap-4'>
      <MobilePageHeader
        title='机器人'
        description={description}
        action={
          <Button
            isIconOnly
            size='sm'
            variant='secondary'
            aria-label='添加机器人'
            onPress={() => navigate('/bots/new')}
          >
            <Plus className='size-4' aria-hidden='true' />
          </Button>
        }
      />

      <MobileBotList title='全部机器人' />
    </div>
  )
}
