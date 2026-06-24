'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { STATE_SELECT_ITEMS } from '@/lib/state-codes'
import { cn } from '@/lib/utils'

type StateSelectProps = {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  triggerClassName?: string
}

export function StateSelect({
  value,
  onValueChange,
  placeholder = 'Select state',
  disabled,
  id,
  triggerClassName,
}: StateSelectProps) {
  const items = [
    { label: placeholder, value: null },
    ...STATE_SELECT_ITEMS.map(({ code, name }) => ({
      label: `${name} (${code})`,
      value: code,
    })),
  ]

  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={(next) => onValueChange(next ?? '')}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={cn('w-full bg-input dark:bg-input/30', triggerClassName)}
        disabled={disabled}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        <SelectGroup>
          {STATE_SELECT_ITEMS.map(({ code, name }) => (
            <SelectItem key={code} value={code}>
              {name} ({code})
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
