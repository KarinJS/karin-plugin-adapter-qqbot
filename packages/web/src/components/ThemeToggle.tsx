import { Button, Tooltip } from '@heroui/react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface ThemeToggleProps {
  withLabel?: boolean
}

export const ThemeToggle = ({ withLabel = false }: ThemeToggleProps) => {
  const { isDark, isSystem, toggleTheme } = useTheme()
  const label = isSystem ? '跟随系统' : '反转主题'
  const nextLabel = isSystem ? '切换到反转主题' : '切换回跟随系统'

  const button = (
    <Button
      isIconOnly={!withLabel}
      className={withLabel ? 'w-full justify-start gap-3' : undefined}
      variant='ghost'
      aria-label={nextLabel}
      onPress={toggleTheme}
    >
      {isDark ? <Sun className='size-4' aria-hidden='true' /> : <Moon className='size-4' aria-hidden='true' />}
      {withLabel ? <span>{label}</span> : null}
    </Button>
  )

  if (withLabel) return button

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger>{button}</Tooltip.Trigger>
      <Tooltip.Content showArrow placement='bottom'>
        {label} · {nextLabel}
      </Tooltip.Content>
    </Tooltip>
  )
}
