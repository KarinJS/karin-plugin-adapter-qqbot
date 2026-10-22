import Link from 'next/link'
import { ArrowRight, BookOpen, Braces, MessageSquare, Radio, Settings2, Terminal } from 'lucide-react'

const features = [
  {
    icon: Settings2,
    title: '安装与登录',
    desc: '安装适配器、扫码登录，确认机器人已经上线。',
    href: '/docs/deploy/install',
  },
  {
    icon: BookOpen,
    title: '配置项',
    desc: '事件接收方式、文本预处理与消息缓存的字段说明。',
    href: '/docs/deploy/config',
  },
  {
    icon: Radio,
    title: '事件映射',
    desc: 'QQ 官方事件如何落到 Karin 的 message、notice 与 request。',
    href: '/docs/develop/events',
  },
  {
    icon: MessageSquare,
    title: '消息能力',
    desc: '单聊、群聊、频道的 Markdown、按钮与被动回复限制。',
    href: '/docs/develop/messages',
  },
  {
    icon: Braces,
    title: '官方 API',
    desc: '通过 bot.super 调用消息、素材、群管理与频道接口。',
    href: '/docs/develop/super-api',
  },
  {
    icon: Terminal,
    title: '能力边界',
    desc: '哪些 Karin 标准方法在 QQBot 上不可用或会降级。',
    href: '/docs/develop/limitations',
  },
]

export default function HomePage() {
  return (
    <main className='flex flex-1 flex-col'>
      <section className='relative overflow-hidden border-b'>
        <div className='mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center md:py-32'>
          <span className='mb-6 inline-flex items-center gap-2 rounded-full border bg-fd-card/80 px-4 py-1.5 text-sm text-fd-muted-foreground shadow-sm backdrop-blur'>
            <BookOpen className='size-4 text-fd-primary' />
            面向部署方与插件开发者
          </span>
          <h1 className='max-w-3xl text-4xl font-bold tracking-tight md:text-6xl'>
            让 QQ 官方机器人
            <span className='text-fd-primary'> 跑在 Karin 里</span>
          </h1>
          <p className='mt-6 max-w-2xl text-lg text-fd-muted-foreground'>
            部署方从安装、扫码登录和配置开始。插件开发者可以直接看事件映射、消息能力和官方 API。Karin 的基础插件 API 以
            <a href='https://karinjs.com' className='mx-1 text-fd-primary underline underline-offset-4'>
              Karin 官方文档
            </a>
            为准。
          </p>
          <div className='mt-10 flex flex-wrap items-center justify-center gap-3'>
            <Link
              href='/docs/deploy'
              className='inline-flex items-center gap-2 rounded-lg bg-fd-primary px-6 py-3 font-medium text-fd-primary-foreground transition hover:opacity-90'
            >
              开始部署 <ArrowRight className='size-4' />
            </Link>
            <Link
              href='/docs/develop'
              className='inline-flex items-center gap-2 rounded-lg border bg-fd-card px-6 py-3 font-medium transition hover:bg-fd-accent'
            >
              <Braces className='size-4' /> 插件开发
            </Link>
          </div>
        </div>
      </section>

      <section className='mx-auto w-full max-w-5xl px-6 py-20'>
        <div className='mb-12 max-w-2xl'>
          <h2 className='text-3xl font-bold tracking-tight'>按主题阅读</h2>
          <p className='mt-3 text-fd-muted-foreground'>
            部署方从「安装与登录」开始。插件开发者可以直接看事件映射、消息能力和官方 API。
          </p>
        </div>
        <div className='grid gap-5 md:grid-cols-2 lg:grid-cols-3'>
          {features.map(({ icon: Icon, title, desc, href }) => (
            <Link
              key={title}
              href={href}
              className='group rounded-2xl border bg-fd-card p-6 transition hover:-translate-y-0.5 hover:border-fd-primary/40 hover:shadow-lg'
            >
              <div className='mb-4 flex size-11 items-center justify-center rounded-xl bg-fd-primary/10 text-fd-primary'>
                <Icon className='size-5' />
              </div>
              <h3 className='font-semibold'>{title}</h3>
              <p className='mt-2 text-sm leading-relaxed text-fd-muted-foreground'>{desc}</p>
              <span className='mt-4 inline-flex items-center gap-1 text-sm text-fd-primary opacity-0 transition group-hover:opacity-100'>
                查看文档 <ArrowRight className='size-3.5' />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
