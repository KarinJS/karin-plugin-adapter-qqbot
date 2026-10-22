import { cn } from '@heroui/react'
import { useEffect, useState } from 'react'

const sizeClasses = {
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-16 text-lg',
} as const

interface BotAvatarProps {
  name?: string
  avatar?: string
  size?: keyof typeof sizeClasses
  className?: string
}

/**
 * 机器人头像，加载失败或没有头像时退回昵称首字。
 */
export const BotAvatar = ({ name, avatar, size = 'sm', className }: BotAvatarProps) => {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [avatar])

  const initial = (name?.trim() || '?').slice(0, 1).toUpperCase()

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background font-semibold',
        sizeClasses[size],
        className
      )}
      aria-hidden='true'
    >
      {avatar && !failed ? (
        <img src={avatar} alt='' className='size-full object-cover' onError={() => setFailed(true)} />
      ) : (
        <span>{initial}</span>
      )}
    </span>
  )
}
