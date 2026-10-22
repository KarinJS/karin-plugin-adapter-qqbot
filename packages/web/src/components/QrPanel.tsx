import { Alert, Button, Card, Spinner, cn, toast } from '@heroui/react'
import { CheckCircle2, Clock3, ExternalLink, QrCode, RefreshCw, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BotAvatar } from '@/components/BotAvatar'
import { SectionCard } from '@/components/SectionCard'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useViewport } from '@/hooks/useViewport'
import { ApiError, cancelLogin, fetchLoginStatus, startLogin } from '@/lib/api'
import type { LoginSnapshot, LoginStartResponse } from '@/lib/types'

const formatRemaining = (seconds: number) => {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const rest = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export const QrPanel = () => {
  const { reload } = useConfigStore()
  const { isMobile, isShort } = useViewport()
  const navigate = useNavigate()
  const compact = isMobile
  const qrBox = compact ? (isShort ? 'size-40' : 'size-52') : isShort ? 'size-40' : 'size-64'
  const qrPixels = compact ? (isShort ? 160 : 208) : isShort ? 160 : 256

  const [session, setSession] = useState<LoginStartResponse | null>(null)
  const [status, setStatus] = useState<LoginSnapshot | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(0)

  const start = useCallback(async () => {
    if (session?.status === 'pending') {
      await cancelLogin(session.taskId).catch(() => {})
    }

    setStarting(true)
    setError('')

    try {
      const data = await startLogin()
      setSession(data)
      setStatus(data)
      setRemaining(Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成二维码失败')
    } finally {
      setStarting(false)
    }
  }, [session])

  const cancel = useCallback(async () => {
    if (!session) return
    await cancelLogin(session.taskId).catch(() => {})
    setSession(null)
    setStatus(null)
    setError('')
  }, [session])

  useEffect(() => {
    if (!session || status?.status !== 'pending') return

    let cancelled = false

    const poll = async () => {
      try {
        const next = await fetchLoginStatus(session.taskId)
        if (cancelled) return

        setStatus(next)

        if (next.status === 'completed') {
          await reload()
          const label = next.name ? `${next.name}（${next.appId}）` : next.appId
          toast.success('授权成功', {
            description: next.updated ? `已更新 ${label} 的 AppSecret` : `已添加机器人 ${label}`,
          })
        } else if (next.status === 'expired' || next.status === 'failed') {
          setError(next.message || '授权未完成，请重新生成二维码')
        }
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setError('授权会话已结束，请重新生成二维码')
        }
      }
    }

    const timer = setInterval(() => {
      void poll()
    }, 1500)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [reload, session, status?.status])

  useEffect(() => {
    if (!session || status?.status !== 'pending') return

    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000)))
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [session, status?.status])

  const isPending = status?.status === 'pending'
  const isCompleted = status?.status === 'completed'

  const qrArea = (
    <div className={compact ? 'flex w-full flex-col items-center gap-3' : 'flex flex-col items-center gap-4'}>
      {starting ? (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl border border-border bg-surface-secondary',
            qrBox
          )}
        >
          <Spinner size='lg' aria-label='正在生成二维码' />
        </div>
      ) : null}

      {!starting && isPending && session ? (
        <div className='rounded-2xl bg-white p-3 shadow-sm'>
          <img
            src={session.qrCode}
            alt='QQ 扫码授权二维码'
            width={qrPixels}
            height={qrPixels}
            className={cn('rounded-lg', qrBox)}
            decoding='async'
          />
        </div>
      ) : null}

      {!starting && isCompleted ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-4 rounded-2xl border border-success/30 bg-success/5',
            qrBox
          )}
        >
          <span className='relative'>
            {status.name || status.avatar ? (
              <BotAvatar name={status.name} avatar={status.avatar} size='lg' />
            ) : (
              <span className='flex size-16 items-center justify-center rounded-full border border-border bg-surface'>
                <CheckCircle2 className='size-7 text-success' aria-hidden='true' />
              </span>
            )}
            <span className='absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border-2 border-surface bg-success text-success-foreground'>
              <CheckCircle2 className='size-3.5' aria-hidden='true' />
            </span>
          </span>
          <div className='max-w-56 text-center'>
            <p className='truncate text-base font-semibold'>{status.name || '授权成功'}</p>
            <p className='mt-1 text-xs text-muted'>{status.appId}</p>
            {status.name ? <p className='mt-1 text-xs text-success'>授权成功</p> : null}
          </div>
        </div>
      ) : null}

      {!starting && !isPending && !isCompleted ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-surface-secondary/50',
            qrBox
          )}
        >
          <span className='flex size-14 items-center justify-center rounded-full border border-border bg-surface text-muted'>
            <QrCode className='size-7' aria-hidden='true' />
          </span>
          <div className='max-w-48 text-center'>
            <p className='text-sm font-medium'>等待生成二维码</p>
            <p className='mt-1 text-xs leading-5 text-muted'>二维码只在当前会话内有效，过期后重新生成即可</p>
          </div>
        </div>
      ) : null}

      {!starting && isPending && session ? (
        <div className='flex flex-col items-center gap-1'>
          <div className='flex items-center gap-2 text-sm'>
            <Spinner size='sm' aria-label='等待扫码' />
            <span>等待扫码确认</span>
          </div>
          <span className='tabular flex items-center gap-1.5 text-xs text-muted'>
            <Clock3 className='size-3.5' aria-hidden='true' />
            剩余 {formatRemaining(remaining)}
          </span>
        </div>
      ) : null}

      {isCompleted ? (
        <p className='max-w-72 text-center text-sm leading-6 text-muted'>
          {status.updated ? '已更新现有机器人的 AppSecret。' : '新机器人已经写入配置。'}
          适配器会自动建立连接。
        </p>
      ) : null}
    </div>
  )

  const controls = (
    <div className='flex flex-col gap-2'>
      {!isPending && !isCompleted ? (
        <Button fullWidth isPending={starting} onPress={start}>
          {({ isPending: pending }) => (
            <>
              {pending ? null : <QrCode className='size-4' aria-hidden='true' />}
              <span>{pending ? '生成中' : '生成二维码'}</span>
            </>
          )}
        </Button>
      ) : null}

      {isPending ? (
        <>
          <Button fullWidth variant='secondary' onPress={start} isDisabled={starting}>
            <RefreshCw className='size-4' aria-hidden='true' />
            重新生成
          </Button>
          <Button fullWidth variant='ghost' onPress={cancel}>
            取消授权
          </Button>
          {session ? (
            <Button
              fullWidth
              variant='ghost'
              onPress={() => window.open(session.connectUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className='size-4' aria-hidden='true' />
              在浏览器打开
            </Button>
          ) : null}
        </>
      ) : null}

      {isCompleted ? (
        <>
          <Button
            fullWidth
            onPress={() => navigate(`/bots/${encodeURIComponent(status.appId ?? '')}`)}
            isDisabled={!status.appId}
          >
            查看机器人配置
          </Button>
          <Button fullWidth variant='secondary' onPress={start}>
            再添加一个
          </Button>
        </>
      ) : null}
    </div>
  )

  if (compact) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='rounded-2xl border border-border/60 bg-surface p-4'>
          <div className='flex flex-col items-center gap-3'>
            {qrArea}
            {error ? (
              <Alert status='danger' className='w-full'>
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>授权未完成</Alert.Title>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert>
            ) : null}
            <div className='w-full'>{controls}</div>
          </div>
        </div>

        <div className='flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/10 p-3'>
          <ShieldAlert className='mt-0.5 size-4 shrink-0 text-warning' aria-hidden='true' />
          <p className='text-[11px] leading-5 text-muted'>
            授权成功后 QQ 会刷新 AppSecret，旧密钥立即失效。如果机器人已在别处运行，请同步更新。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-[minmax(0,26rem)_minmax(0,1fr)] items-start gap-5'>
      <Card className='border border-border/80 bg-surface shadow-none'>
        <Card.Content className='flex flex-col gap-5 p-5'>
          {qrArea}
          {error ? (
            <Alert status='danger'>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>授权未完成</Alert.Title>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}
          {controls}
        </Card.Content>
      </Card>

      <div className='flex flex-col gap-5'>
        <SectionCard title='授权流程' description='二维码由 QQ 开放平台生成，Karin 只负责轮询结果。'>
          <ol className='flex flex-col gap-4'>
            {[
              '使用手机 QQ 扫描左侧二维码。',
              '在打开的页面里确认要授权的机器人。',
              '授权完成后，AppID 与 AppSecret 会自动写入配置。',
              '适配器检测到配置变化，自动建立连接。',
            ].map((step, index) => (
              <li key={step} className='flex items-start gap-3'>
                <span className='tabular flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs'>
                  {index + 1}
                </span>
                <span className='text-sm leading-6 text-muted'>{step}</span>
              </li>
            ))}
          </ol>
        </SectionCard>

        <SectionCard title='注意事项' description='扫码授权会直接影响现有机器人凭据。'>
          <div className='flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4'>
            <ShieldAlert className='mt-0.5 size-4 shrink-0 text-warning' aria-hidden='true' />
            <p className='text-sm leading-6 text-muted'>
              授权成功后 QQ 会刷新该机器人的 AppSecret，旧的 AppSecret
              立即失效。如果机器人已经在别处运行，请同步更新那边的配置。
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
