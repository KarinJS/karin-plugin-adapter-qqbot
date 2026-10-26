import { Button, Description, FieldError, Input, Label, TextField, cn } from '@heroui/react'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

/** 支持 -webkit-text-security 时用 text 输入做遮罩，避免浏览器触发密码保存。 */
const supportsTextSecurity = typeof document !== 'undefined' && 'webkitTextSecurity' in document.documentElement.style

interface SecretFieldProps {
  value: string
  onChange: (value: string) => void
  isInvalid?: boolean
  error?: string
  description?: string
  placeholder?: string
  label?: string
  compact?: boolean
}

export const SecretField = ({
  value,
  onChange,
  isInvalid,
  error,
  description,
  placeholder = 'AppSecret',
  label = 'AppSecret',
  compact = false,
}: SecretFieldProps) => {
  const [visible, setVisible] = useState(false)
  const masked = !visible && supportsTextSecurity
  const type = visible || supportsTextSecurity ? 'text' : 'password'

  return (
    <TextField fullWidth value={value} isInvalid={isInvalid} onChange={onChange}>
      <Label className={compact ? 'text-xs text-muted' : undefined}>{label}</Label>
      <div className='flex items-center gap-2'>
        <Input
          className={cn('min-w-0 flex-1', masked && '[-webkit-text-security:disc] [text-security:disc]')}
          autoComplete={supportsTextSecurity ? 'off' : 'new-password'}
          spellCheck={false}
          placeholder={placeholder}
          type={type}
          data-1p-ignore
          data-bwignore
          data-form-type='other'
          data-lpignore='true'
          data-protonpass-ignore='true'
        />
        <Button
          isIconOnly
          size={compact ? 'sm' : undefined}
          variant='tertiary'
          type='button'
          aria-label={visible ? `隐藏 ${label}` : `显示 ${label}`}
          onPress={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className='size-4' aria-hidden='true' /> : <Eye className='size-4' aria-hidden='true' />}
        </Button>
      </div>
      {description ? (
        <Description className={compact ? 'text-[11px] leading-4' : undefined}>{description}</Description>
      ) : null}
      <FieldError>{error}</FieldError>
    </TextField>
  )
}
