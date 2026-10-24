import { Alert, Button, Card, Description, Input, Label, TextField, cn } from '@heroui/react'
import { Bot, Eye, EyeOff, KeyRound, LockKeyhole, QrCode, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Brand } from '@/components/Brand'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useViewport } from '@/hooks/useViewport'
import { loginWithAuthKey } from '@/lib/auth'

interface LoginPageProps {
  onLogin: () => void
}

const features = [
  { icon: QrCode, label: '扫码授权机器人' },
  { icon: Bot, label: '多机器人统一管理' },
  { icon: ShieldCheck, label: '复用 Karin 鉴权' },
]

export const LoginPage = ({ onLogin }: LoginPageProps) => {
  const { isMobile, isShort } = useViewport()
  const [authKey, setAuthKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = authKey.trim()
    if (!value) {
      setError('请输入 Karin 的 HTTP 鉴权密钥')
      return
    }

    setLoading(true)
    setError('')

    try {
      await loginWithAuthKey(value)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='relative flex min-h-dvh flex-col bg-background'>
      <div
        className='pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,color-mix(in_oklab,var(--foreground)_7%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--foreground)_7%,transparent)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_80%_70%_at_30%_20%,black_0%,transparent_78%)] [-webkit-mask-image:radial-gradient(ellipse_80%_70%_at_30%_20%,black_0%,transparent_78%)]'
        aria-hidden='true'
      />

      <header className={cn('relative z-10 flex items-center justify-between px-5 sm:px-8', isShort ? 'py-2' : 'py-4')}>
        <Brand />
        <ThemeToggle />
      </header>

      <main
        className={cn('relative z-10 flex flex-1 items-center justify-center px-4 sm:px-8', isShort ? 'py-3' : 'py-8')}
      >
        <div
          className={
            isMobile
              ? 'flex w-full max-w-sm flex-col gap-6'
              : 'grid w-full max-w-5xl grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-center gap-14'
          }
        >
          {isMobile && !isShort ? (
            <div>
              <p className='text-[0.6875rem] font-medium tracking-[0.16em] text-muted uppercase'>Karin Adapter</p>
              <h1 className='mt-3 text-3xl leading-[1.05] font-semibold tracking-[-0.03em]'>QQBot 控制台</h1>
              <p className='mt-2 text-sm leading-6 text-muted'>登录后管理机器人连接、扫码授权与消息缓存。</p>
            </div>
          ) : null}

          {!isMobile ? (
            <section className='max-w-xl'>
              <p className='text-[0.6875rem] font-medium tracking-[0.18em] text-muted uppercase'>Karin Adapter</p>
              <h1 className='mt-4 text-5xl leading-[1.05] font-semibold tracking-[-0.03em]'>
                把 QQ 官方机器人接到 Karin。
              </h1>
              <p className='mt-5 max-w-md text-base leading-7 text-muted'>
                一个页面管理所有机器人。扫码授权、事件通道、消息缓存，都在这里完成。
              </p>

              <ul className='mt-8 flex flex-col gap-3'>
                {features.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <li key={feature.label} className='flex items-center gap-3 text-sm text-muted'>
                      <span className='flex size-8 items-center justify-center rounded-lg border border-border bg-surface'>
                        <Icon className='size-4' aria-hidden='true' />
                      </span>
                      {feature.label}
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          <Card className='w-full border border-border/80 bg-surface shadow-none'>
            <Card.Header className={cn('gap-4 pb-0', isShort ? 'p-4' : 'p-6')}>
              <span className='flex size-10 items-center justify-center rounded-xl border border-border bg-surface-secondary'>
                <LockKeyhole className='size-5' aria-hidden='true' />
              </span>
              <div className='min-w-0'>
                <Card.Title className='text-lg font-semibold tracking-tight'>登录 Karin</Card.Title>
                {isShort ? null : (
                  <Card.Description className='mt-1 text-sm text-muted'>
                    使用 HTTP 鉴权密钥。登录状态与 Karin 主 WebUI 共用。
                  </Card.Description>
                )}
              </div>
            </Card.Header>

            <Card.Content className={isShort ? 'p-4' : 'p-6'}>
              <form className={cn('flex flex-col', isShort ? 'gap-4' : 'gap-5')} onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  isInvalid={Boolean(error)}
                  value={authKey}
                  onChange={(value) => {
                    setAuthKey(value)
                    if (error) setError('')
                  }}
                >
                  <Label>HTTP 鉴权密钥</Label>
                  <div className='flex items-center gap-2'>
                    <Input
                      autoFocus
                      autoComplete='current-password'
                      className='min-w-0 flex-1'
                      placeholder='HTTP_AUTH_KEY'
                      type={showKey ? 'text' : 'password'}
                    />
                    <Button
                      isIconOnly
                      variant='tertiary'
                      type='button'
                      aria-label={showKey ? '隐藏密钥' : '显示密钥'}
                      onPress={() => setShowKey((current) => !current)}
                    >
                      {showKey ? (
                        <EyeOff className='size-4' aria-hidden='true' />
                      ) : (
                        <Eye className='size-4' aria-hidden='true' />
                      )}
                    </Button>
                  </div>
                  <Description className='flex items-center gap-1.5'>
                    <KeyRound className='size-3.5' aria-hidden='true' />
                    密钥位于 Karin 的 config/env.json
                  </Description>
                </TextField>

                {error ? (
                  <Alert status='danger'>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>登录失败</Alert.Title>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                <Button fullWidth type='submit' isPending={loading}>
                  {({ isPending }) => <span>{isPending ? '登录中' : '登录'}</span>}
                </Button>
              </form>
            </Card.Content>
          </Card>
        </div>
      </main>

      <footer className='relative z-10 px-5 py-5 text-center text-[0.6875rem] text-muted sm:px-8'>
        QQBot Adapter for Karin
      </footer>
    </div>
  )
}
