import { Button, Input, Label, TextField } from '@heroui/react'
import { Plus, Trash2 } from 'lucide-react'

interface RegexEditorProps {
  value: { reg: string; rep: string }[]
  onChange: (value: { reg: string; rep: string }[]) => void
  isDisabled?: boolean
  compact?: boolean
}

export const RegexEditor = ({ value, onChange, isDisabled, compact = false }: RegexEditorProps) => {
  const updateRule = (index: number, patch: Partial<{ reg: string; rep: string }>) => {
    onChange(value.map((rule, ruleIndex) => (ruleIndex === index ? { ...rule, ...patch } : rule)))
  }

  const removeRule = (index: number) => {
    onChange(value.filter((_, ruleIndex) => ruleIndex !== index))
  }

  return (
    <div className={compact ? 'flex flex-col gap-2' : 'flex flex-col gap-3'}>
      {value.length === 0 ? (
        <p
          className={
            compact
              ? 'rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted'
              : 'rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted'
          }
        >
          没有替换规则，消息文本会原样处理。
        </p>
      ) : null}

      {value.map((rule, index) => (
        <div
          key={`${index}-${rule.reg}`}
          className={
            compact
              ? 'flex flex-col gap-2 rounded-xl border border-border/70 bg-surface-secondary/40 p-2.5'
              : 'flex flex-col gap-3 rounded-xl border border-border/70 bg-surface-secondary/40 p-3 sm:flex-row sm:items-end'
          }
        >
          <TextField
            className='min-w-0 flex-1'
            value={rule.reg}
            isDisabled={isDisabled}
            onChange={(next) => updateRule(index, { reg: next })}
          >
            <Label className='text-xs text-muted'>匹配</Label>
            <Input placeholder='^/' autoComplete='off' spellCheck={false} />
          </TextField>

          <TextField
            className='min-w-0 flex-1'
            value={rule.rep}
            isDisabled={isDisabled}
            onChange={(next) => updateRule(index, { rep: next })}
          >
            <Label className='text-xs text-muted'>替换为</Label>
            <Input placeholder='#' autoComplete='off' spellCheck={false} />
          </TextField>

          <Button
            isIconOnly
            size={compact ? 'sm' : undefined}
            className='self-end'
            variant='ghost'
            aria-label={`删除第 ${index + 1} 条替换规则`}
            isDisabled={isDisabled}
            onPress={() => removeRule(index)}
          >
            <Trash2 className='size-4' aria-hidden='true' />
          </Button>
        </div>
      ))}

      <div>
        <Button
          variant='secondary'
          size='sm'
          isDisabled={isDisabled || value.length >= 50}
          onPress={() => onChange([...value, { reg: '', rep: '' }])}
        >
          <Plus className='size-4' aria-hidden='true' />
          添加规则
        </Button>
      </div>
    </div>
  )
}
