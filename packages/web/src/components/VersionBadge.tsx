import { cn } from '@heroui/react'
import { useConfigStore } from '@/hooks/useConfigStore'

interface VersionBadgeProps {
  className?: string
}

/**
 * 概览标题「概览」后面的适配器版本下角标。
 *
 * 版本号来自配置接口返回的 package.json version，不是 web 子包的版本。
 * 数据还没回来时先不渲染，避免标题后面先闪一个空角标。
 */
export const VersionBadge = ({ className }: VersionBadgeProps) => {
  const { version } = useConfigStore()
  if (!version) return null

  return (
    <span
      className={cn(
        'tabular-nums inline-flex shrink-0 items-center rounded-md border border-border/60 bg-default/40 px-1.5 py-0.5 text-[10px] leading-4 font-medium text-muted',
        className
      )}
      aria-label={`适配器版本 ${version}`}
    >
      v{version}
    </span>
  )
}
