'use client'

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
}

interface SelectFieldProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SelectField({ options, value, onChange, placeholder = 'Select…', className }: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center justify-between rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors',
          value ? 'text-foreground' : 'text-muted-foreground',
          'focus:border-primary focus:ring-1 focus:ring-primary/20',
          className,
        )}
      >
        <span>{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => { onChange(opt.value); setOpen(false) }}
            className="flex items-center justify-between"
          >
            {opt.label}
            {value === opt.value && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
