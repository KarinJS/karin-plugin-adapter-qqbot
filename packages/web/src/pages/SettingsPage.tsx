import { Button, Description, Label, Separator } from '@heroui/react'
import { BookOpen, ExternalLink, GitFork, MonitorCog, RefreshCw, ShieldCheck, SunMoon } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SectionCard } from '@/components/SectionCard'
import { useConfigStore } from '@/hooks/useConfigStore'
import { useTheme } from '@/hooks/useTheme'

const DOCS_URL = 'https://karinjs.github.io/karin-plugin-adapter-qqbot/'
const GITHUB_URL = 'https://github.com/KarinJS/karin-plugin-adapter-qqbot'
const NPM_URL = 'https://www.npmjs.com/package/@karinjs/adapter-qqbot'

export const SettingsPage = () => {
  const { config, statuses, version } = useConfigStore()
  const { theme, appliedTheme, setTheme } = useTheme()
  const onlineCount = config.filter((bot) => statuses[bot.appId]?.online).length

  return (
    <div className='flex flex-col gap-6'>
      <PageHeader
        eyebrow='Settings'
        title='设置'
        description='外观、运行状态与插件信息。配置本身在机器人页面里修改。'
      />

      <div className='grid gap-5 xl:grid-cols-2 xl:items-start'>
        <div className='flex flex-col gap-5'>
          <SectionCard title='外观' description='主题跟随 Karin 主 WebUI，也可以单独反转。'>
            <div className='flex flex-col gap-5'>
              <div className='grid grid-cols-2 gap-2'>
                <Button variant={theme === 'system' ? 'primary' : 'secondary'} onPress={() => setTheme('system')}>
                  <SunMoon className='size-4' aria-hidden='true' />
                  跟随系统
                </Button>
                <Button variant={theme === 'inverse' ? 'primary' : 'secondary'} onPress={() => setTheme('inverse')}>
                  <MonitorCog className='size-4' aria-hidden='true' />
                  反转主题
                </Button>
              </div>
              <div className='flex items-center justify-between rounded-xl border border-border/70 bg-surface-secondary/40 px-4 py-3'>
                <span className='text-sm text-muted'>当前生效</span>
                <span className='text-sm font-medium'>{appliedTheme === 'dark' ? '深色' : '浅色'}</span>
              </div>
              <Description>
                Karin 只保存「跟随系统 / 反转主题」两种偏好。嵌入 iframe 时会接收主界面的主题变化。
              </Description>
            </div>
          </SectionCard>

          <SectionCard title='运行状态'>
            <div className='flex flex-col gap-3'>
              <div className='flex items-center justify-between gap-3'>
                <span className='text-sm text-muted'>在线机器人</span>
                <span className='tabular text-sm font-medium'>
                  {onlineCount} / {config.length}
                </span>
              </div>
              <Separator />
              <div className='flex items-center justify-between gap-3'>
                <span className='text-sm text-muted'>适配器版本</span>
                <span className='tabular text-sm font-medium'>v{version || '—'}</span>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className='flex flex-col gap-5'>
          <SectionCard title='配置行为'>
            <div className='flex flex-col gap-4'>
              {[
                {
                  icon: RefreshCw,
                  title: '保存后自动重连',
                  description: '写入 config.json 后，文件监听会销毁旧连接并重新初始化机器人。',
                },
                {
                  icon: ShieldCheck,
                  title: '复用 Karin 鉴权',
                  description: '所有配置接口都挂在 /api/v1 下，使用 Karin 的 JWT 与 HTTP_AUTH_KEY。',
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className='flex items-start gap-3'>
                    <span className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-secondary'>
                      <Icon className='size-4' aria-hidden='true' />
                    </span>
                    <div>
                      <p className='text-sm font-medium'>{item.title}</p>
                      <p className='mt-1 text-xs leading-5 text-muted'>{item.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard title='关于'>
            <div className='flex flex-col gap-2'>
              <Button
                fullWidth
                className='justify-start'
                variant='ghost'
                onPress={() => window.open(DOCS_URL, '_blank', 'noopener,noreferrer')}
              >
                <BookOpen className='size-4' aria-hidden='true' />
                部署与开发文档
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
              <Button
                fullWidth
                className='justify-start'
                variant='ghost'
                onPress={() => window.open(NPM_URL, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className='size-4' aria-hidden='true' />
                npm 包
                <ExternalLink className='ml-auto size-3.5 text-muted' aria-hidden='true' />
              </Button>
            </div>
          </SectionCard>

          <div className='rounded-2xl border border-dashed border-border px-5 py-4'>
            <Label className='text-xs text-muted'>QQBot Adapter for Karin</Label>
            <p className='mt-1 text-xs leading-5 text-muted'>
              配置页面是插件自带的前端，不依赖 Karin 主 WebUI 的版本。只要 Karin 支持自定义配置页面即可使用。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
